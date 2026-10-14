"""
Data access layer. Services talk to `store`; this module is the only place that knows
about the database (SQLAlchemy, see backend/db). The method names/return types match the
previous JSON-file store, so services didn't have to change.
"""
import hashlib
import secrets
import threading
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple

from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.exc import IntegrityError

from backend.config import SESSION_TTL_DAYS
from backend.db import models as m
from backend.db.engine import db_session
from backend.models.schemas import (
    Creator, CandidateProfile, MentorshipSession, PeerVerifiedBadge,
    CommunityPost, CommunityComment, CommunityNotification
)


class SlotTakenError(Exception):
    """The mentor's slot already has an upcoming booking (unique index on bookings)."""


def normalize_domain_key(domain: Optional[str]) -> Optional[str]:
    if not domain:
        return None
    clean = domain.lower().strip().replace('-', ' ').replace('_', ' ').replace('/', ' ')
    if 'ai' in clean or 'ml' in clean or 'genai' in clean or 'machine learning' in clean:
        return 'AI/ML'
    if 'semi' in clean or 'vlsi' in clean or 'silicon' in clean or 'chip' in clean:
        return 'Semiconductor'
    if 'cyber' in clean or 'security' in clean:
        return 'Cybersecurity'
    if 'product' in clean or clean == 'pm':
        return 'Product Management'
    if 'search' in clean or 'solr' in clean or 'data infra' in clean or 'lucene' in clean:
        return 'Search & Data Infra'
    if 'front' in clean or 'back' in clean or 'full stack' in clean or 'arch' in clean or 'web' in clean:
        return 'Full-Stack'
    if 'sales' in clean or 'gtm' in clean or 'bd' in clean:
        return 'SaaS Sales'
    if 'market' in clean or 'growth' in clean:
        return 'Marketing'
    return None


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def _lower(value: Optional[str]) -> str:
    return (value or '').strip().lower()


class Store:
    def __init__(self):
        # In-process guard for read-check-write sequences. Cross-process safety for bookings
        # comes from the unique index on bookings (see SlotTakenError).
        self.lock = threading.RLock()

    # ------------------------------------------------------------------ counters
    def _bump_counter(self, db, name: str, by: int = 1):
        row = db.get(m.KeyValue, 'analytics')
        current = dict(row.value) if row else {}
        current[name] = int(current.get(name, 0)) + by
        if row:
            row.value = current
        else:
            db.add(m.KeyValue(key='analytics', value=current))

    # ------------------------------------------------------------------ users & auth
    def get_user(self, user_id: str) -> Optional[m.User]:
        with db_session() as db:
            return db.get(m.User, user_id)

    def get_user_by_email(self, email: str) -> Optional[m.User]:
        with db_session() as db:
            return db.scalar(select(m.User).where(m.User.email == _lower(email)))

    def _ensure_candidate_profile(self, db, user: m.User):
        # Every user gets a candidate profile (a mentor is also a candidate)
        if not db.get(m.Candidate, user.id):
            existing_by_email = None
            if user.email:
                existing_by_email = db.scalar(select(m.Candidate).where(func.lower(m.Candidate.email) == _lower(user.email)))
            if existing_by_email:
                data = dict(existing_by_email.data)
                data['id'] = user.id
                data['name'] = user.name or data.get('name')
                data['email'] = user.email
                if user.mobile:
                    data['phone'] = user.mobile
                profile = CandidateProfile(**data)
            else:
                profile = CandidateProfile(id=user.id, name=user.name, email=user.email or '', phone=user.mobile or '')
            db.add(m.Candidate(id=user.id, email=_lower(user.email) or None, data=profile.model_dump()))
            self._bump_counter(db, 'newRegistrationsThisMonth')

    def create_user(self, email: str, name: str, mobile: Optional[str] = None) -> m.User:
        """Sign-up. Returns the existing user if the email was registered concurrently."""
        try:
            with db_session() as db:
                user = m.User(
                    id=f"u_{uuid.uuid4().hex[:16]}",
                    email=_lower(email),
                    name=name,
                    mobile=mobile,
                    email_verified_at=datetime.utcnow(),
                )
                db.add(user)
                db.flush()
                self._ensure_candidate_profile(db, user)
                return user
        except IntegrityError:
            existing = self.get_user_by_email(email)
            if existing is None:
                raise
            return existing

    def ensure_demo_user(self, user_id: str) -> m.User:
        """Local development only: a user row for a seeded demo id (owns the seeded records)."""
        with db_session() as db:
            user = db.get(m.User, user_id)
            if not user:
                candidate = db.get(m.Candidate, user_id)
                creator = db.get(m.Creator, user_id)
                name = (candidate.data.get('name') if candidate else None) or (creator.data.get('name') if creator else None) or user_id
                user = m.User(id=user_id, name=name)
                db.add(user)
                db.flush()
                self._ensure_candidate_profile(db, user)
            return user

    def update_user_name(self, user_id: str, name: str):
        with db_session() as db:
            user = db.get(m.User, user_id)
            if user and name:
                user.name = name[:200]

    def record_login(self, user_id: str):
        with db_session() as db:
            user = db.get(m.User, user_id)
            if user:
                user.last_login_at = datetime.utcnow()
                if user.email and not user.email_verified_at:
                    user.email_verified_at = datetime.utcnow()

    # ------------------------------------------------------------------ email sign-in codes
    def create_email_otp(self, request_id: str, email: str, code_hash: str, expires_at: datetime):
        with db_session() as db:
            db.add(m.EmailOtp(id=request_id, email=email, code_hash=code_hash, expires_at=expires_at))
            # Housekeeping: drop codes that expired more than a day ago
            db.execute(delete(m.EmailOtp).where(m.EmailOtp.expires_at < datetime.utcnow() - timedelta(days=1)))

    def count_recent_email_otps(self, email: str, since: datetime) -> int:
        with db_session() as db:
            return db.scalar(select(func.count()).select_from(m.EmailOtp).where(
                m.EmailOtp.email == email, m.EmailOtp.created_at >= since
            )) or 0

    def get_email_otp(self, request_id: str) -> Optional[Dict[str, Any]]:
        with db_session() as db:
            row = db.get(m.EmailOtp, request_id)
            if not row:
                return None
            return {'email': row.email, 'code_hash': row.code_hash, 'attempts': row.attempts,
                    'expires_at': row.expires_at, 'consumed_at': row.consumed_at}

    def increment_email_otp_attempts(self, request_id: str):
        with db_session() as db:
            db.execute(update(m.EmailOtp).where(m.EmailOtp.id == request_id)
                       .values(attempts=m.EmailOtp.attempts + 1))

    def consume_email_otp(self, request_id: str) -> bool:
        """Marks the code used. Atomic: only one concurrent caller gets True."""
        with db_session() as db:
            result = db.execute(update(m.EmailOtp)
                                .where(m.EmailOtp.id == request_id, m.EmailOtp.consumed_at.is_(None))
                                .values(consumed_at=datetime.utcnow()))
            return result.rowcount == 1

    def create_auth_session(self, user_id: str) -> Tuple[str, datetime]:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=SESSION_TTL_DAYS)
        with db_session() as db:
            db.add(m.AuthSession(token_hash=_hash_token(token), user_id=user_id, expires_at=expires_at))
            # Housekeeping: drop expired sessions
            db.execute(delete(m.AuthSession).where(m.AuthSession.expires_at < datetime.utcnow()))
        return token, expires_at

    def get_user_by_session_token(self, token: str) -> Optional[m.User]:
        if not token:
            return None
        with db_session() as db:
            auth = db.get(m.AuthSession, _hash_token(token))
            if not auth or auth.expires_at < datetime.utcnow():
                return None
            return db.get(m.User, auth.user_id)

    def delete_auth_session(self, token: str):
        if not token:
            return
        with db_session() as db:
            db.execute(delete(m.AuthSession).where(m.AuthSession.token_hash == _hash_token(token)))

    # ------------------------------------------------------------------ creators
    def get_creators(self, domain: Optional[str] = None, query: Optional[str] = None) -> List[Creator]:
        with db_session() as db:
            rows = db.scalars(
                select(m.Creator).where(m.Creator.status == 'approved').order_by(m.Creator.created_at.desc())
            ).all()
            creators = [Creator(**r.data) for r in rows]

        if domain and domain != 'all':
            target_norm = normalize_domain_key(domain) or domain.lower()
            creators = [
                c for c in creators
                if (normalize_domain_key(c.domain) or c.domain.lower()).lower() == target_norm.lower()
                or c.domain.lower() == domain.lower()
            ]

        if query and query.strip():
            q = query.lower().strip()
            creators = [
                c for c in creators
                if q in c.name.lower()
                or q in c.role.lower()
                or q in c.company.lower()
                or any(q in s.lower() for s in c.skills)
            ]
        return creators

    def _creator_row(self, db, creator_id: str) -> Optional[m.Creator]:
        return db.scalar(select(m.Creator).where(func.lower(m.Creator.id) == _lower(creator_id)))

    def get_creator_by_id(self, creator_id: str) -> Optional[Creator]:
        with db_session() as db:
            row = self._creator_row(db, creator_id)
            return Creator(**row.data) if row else None

    def get_creator_owner(self, creator_id: str) -> Optional[str]:
        with db_session() as db:
            row = self._creator_row(db, creator_id)
            return row.owner_user_id if row else None

    def get_creator_by_owner(self, user_id: str) -> Optional[Creator]:
        with db_session() as db:
            row = db.scalar(select(m.Creator).where(func.lower(m.Creator.owner_user_id) == _lower(user_id)))
            if not row:
                row = self._creator_row(db, user_id)
            return Creator(**row.data) if row else None

    def add_creator(self, new_creator: Creator, owner_user_id: Optional[str] = None) -> Creator:
        with db_session() as db:
            row = db.get(m.Creator, new_creator.id)
            if row:
                row.data = new_creator.model_dump()
                if owner_user_id:
                    row.owner_user_id = owner_user_id
            else:
                db.add(m.Creator(id=new_creator.id, owner_user_id=owner_user_id, data=new_creator.model_dump()))
        return new_creator

    def update_creator(self, creator_id: str, updates: Dict[str, Any]) -> Optional[Creator]:
        with db_session() as db:
            row = self._creator_row(db, creator_id)
            if not row:
                return None
            row.data = {**row.data, **updates}
            return Creator(**row.data)

    def update_creator_availability(self, creator_id: str, days: List[str], time_slots: List[str]) -> Optional[Creator]:
        return self.update_creator(creator_id, {'availability': {'days': days, 'timeSlots': time_slots}})

    # ------------------------------------------------------------------ bookings
    def get_sessions(self, user_id: Optional[str] = None, role: Optional[str] = None) -> List[MentorshipSession]:
        with db_session() as db:
            stmt = select(m.Booking).order_by(m.Booking.created_at.desc())
            if user_id:
                # Match on ids only (name matching leaked sessions between users)
                column = m.Booking.expert_id if role == 'mentor' else m.Booking.candidate_id
                stmt = stmt.where(func.lower(column) == _lower(user_id))
            return [MentorshipSession(**r.data) for r in db.scalars(stmt).all()]

    def get_booked_slots(self, expert_id: str) -> List[Dict[str, str]]:
        with db_session() as db:
            rows = db.scalars(select(m.Booking).where(
                func.lower(m.Booking.expert_id) == _lower(expert_id), m.Booking.status == 'upcoming'
            )).all()
            return [{'id': r.id, 'date': r.date, 'timeSlot': r.time_slot} for r in rows]

    def is_slot_taken(self, expert_id: str, date: str, time_slot: str, exclude_session_id: Optional[str] = None) -> bool:
        return any(
            b['date'] == date and b['timeSlot'] == time_slot
            for b in self.get_booked_slots(expert_id)
            if b['id'] != exclude_session_id
        )

    def get_session_by_id(self, session_id: str) -> Optional[MentorshipSession]:
        with db_session() as db:
            row = db.get(m.Booking, session_id)
            if not row and not session_id.startswith("sess-"):
                row = db.get(m.Booking, f"sess-{session_id}")
            if not row and session_id.startswith("sess-"):
                row = db.get(m.Booking, session_id[len("sess-"):])
            return MentorshipSession(**row.data) if row else None

    @staticmethod
    def _booking_columns(data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            'expert_id': data['expertId'],
            'candidate_id': data['candidateId'],
            'status': data['status'],
            'date': data['date'],
            'time_slot': data['timeSlot'],
        }

    def add_session(self, session: MentorshipSession) -> MentorshipSession:
        data = session.model_dump()
        try:
            with db_session() as db:
                db.add(m.Booking(id=session.id, data=data, **self._booking_columns(data)))
                self._bump_counter(db, 'totalSessionsBooked')
        except IntegrityError as e:
            raise SlotTakenError("This slot was just booked by someone else. Please pick another slot.") from e
        return session

    def update_session(self, session_id: str, updates: Dict[str, Any]) -> Optional[MentorshipSession]:
        try:
            with db_session() as db:
                row = db.get(m.Booking, session_id)
                if not row and not session_id.startswith("sess-"):
                    row = db.get(m.Booking, f"sess-{session_id}")
                if not row and session_id.startswith("sess-"):
                    row = db.get(m.Booking, session_id[len("sess-"):])
                if not row:
                    return None
                data = {**row.data, **updates}
                row.data = data
                for column, value in self._booking_columns(data).items():
                    setattr(row, column, value)
                return MentorshipSession(**data)
        except IntegrityError as e:
            raise SlotTakenError("This slot is already booked. Please pick another slot.") from e

    # ------------------------------------------------------------------ candidates
    def get_candidate(self, candidate_id: str) -> Optional[CandidateProfile]:
        with db_session() as db:
            row = db.scalar(select(m.Candidate).where(func.lower(m.Candidate.id) == _lower(candidate_id)))
            return CandidateProfile(**row.data) if row else None

    def get_candidates(self, domain: Optional[str] = None, peer_verified_only: bool = False) -> List[CandidateProfile]:
        with db_session() as db:
            cands = [CandidateProfile(**r.data) for r in db.scalars(select(m.Candidate).order_by(m.Candidate.created_at.desc())).all()]

        if peer_verified_only:
            cands = [c for c in cands if c.badges and len(c.badges) > 0]

        if domain and domain != 'all':
            d = domain.lower()
            cands = [
                c for c in cands
                if (c.targetRole and d in c.targetRole.lower())
                or (c.headline and d in c.headline.lower())
                or any(d in s.lower() for s in c.skills)
                or (c.domain and d in c.domain.lower())
            ]
        return cands

    def update_candidate(self, candidate_id: str, updates: Dict[str, Any]) -> Optional[CandidateProfile]:
        with db_session() as db:
            row = db.scalar(select(m.Candidate).where(func.lower(m.Candidate.id) == _lower(candidate_id)))
            if not row:
                return None
            row.data = {**row.data, **updates}
            if 'email' in updates:
                row.email = _lower(updates.get('email')) or None
            self._bump_counter(db, 'profileUpdatesThisMonth')
            return CandidateProfile(**row.data)

    def award_badge_to_candidate(self, candidate_id: str, badge: PeerVerifiedBadge) -> Optional[CandidateProfile]:
        with db_session() as db:
            row = db.scalar(select(m.Candidate).where(func.lower(m.Candidate.id) == _lower(candidate_id)))
            if not row:
                return None
            data = dict(row.data)
            existing_badges = [b for b in data.get('badges', []) if b.get('title') != badge.title]
            data['badges'] = [badge.model_dump()] + existing_badges
            data['profileScore'] = min(100, data.get('profileScore', 75) + 8)
            data['recruiterSearchMultiplier'] = min(5.0, (data.get('recruiterSearchMultiplier') or 1.5) + 0.6)
            row.data = data
            db.add(m.Badge(id=badge.id, candidate_id=row.id, data=badge.model_dump()))
            self._bump_counter(db, 'profileUpdatesThisMonth')
            return CandidateProfile(**data)

    # ------------------------------------------------------------------ analytics
    def get_analytics(self) -> Dict[str, Any]:
        with db_session() as db:
            kv = db.get(m.KeyValue, 'analytics')
            counters = dict(kv.value) if kv else {}
            creators = db.scalar(select(func.count()).select_from(m.Creator).where(m.Creator.status == 'approved')) or 0
            upcoming = db.scalar(select(func.count()).select_from(m.Booking).where(m.Booking.status == 'upcoming')) or 0
            completed = db.scalar(select(func.count()).select_from(m.Booking).where(m.Booking.status == 'completed')) or 0
            badges = db.scalar(select(func.count()).select_from(m.Badge)) or 0

        return {
            **counters,
            'totalActiveCreators': creators,
            'verifiedCreatorsCount': creators,
            'upcomingSessionsCount': upcoming,
            'completedSessionsCount': completed,
            'totalBadgesIssued': badges,
            'domainsCovered': ['Full-Stack', 'AI/ML', 'Semiconductor', 'Cybersecurity', 'SaaS Sales', 'Marketing'],
        }

    # ------------------------------------------------------------------ community
    def get_posts(self, tag: Optional[str] = None, mentor_id: Optional[str] = None, user_id: Optional[str] = None) -> List[CommunityPost]:
        with db_session() as db:
            stmt = select(m.Post).order_by(m.Post.created_at.desc())
            if mentor_id:
                stmt = stmt.where(func.lower(m.Post.mentor_id) == _lower(mentor_id))
            posts = [CommunityPost(**r.data) for r in db.scalars(stmt).all()]

        if tag and tag.lower() != 'all':
            clean_tag = tag.lower().strip()
            posts = [p for p in posts if any(clean_tag in t.lower() for t in p.tags)]
        return posts

    def create_post(self, new_post: CommunityPost) -> CommunityPost:
        with db_session() as db:
            db.add(m.Post(id=new_post.id, mentor_id=new_post.mentorId, data=new_post.model_dump()))
        return new_post

    def get_post_by_id(self, post_id: str) -> Optional[CommunityPost]:
        with db_session() as db:
            row = db.get(m.Post, post_id)
            return CommunityPost(**row.data) if row else None

    def add_comment_to_post(self, post_id: str, comment: CommunityComment) -> Optional[CommunityComment]:
        with db_session() as db:
            row = db.get(m.Post, post_id)
            if not row:
                return None
            data = dict(row.data)
            data['comments'] = list(data.get('comments', [])) + [comment.model_dump()]
            row.data = data
            return comment

    def toggle_post_like(self, post_id: str, user_id: str) -> Dict[str, Any]:
        with db_session() as db:
            row = db.get(m.Post, post_id)
            if not row:
                return {"postId": post_id, "likes": 0, "liked": False}
            data = dict(row.data)
            liked_by = list(data.get('likedBy', []))
            if user_id in liked_by:
                liked_by.remove(user_id)
                data['likes'] = max(0, data.get('likes', 1) - 1)
                liked = False
            else:
                liked_by.append(user_id)
                data['likes'] = data.get('likes', 0) + 1
                liked = True
            data['likedBy'] = liked_by
            row.data = data
            return {"postId": post_id, "likes": data['likes'], "liked": liked}

    def toggle_comment_like(self, post_id: str, comment_id: str, user_id: str) -> Dict[str, Any]:
        with db_session() as db:
            row = db.get(m.Post, post_id)
            if not row:
                return {"commentId": comment_id, "likes": 0, "liked": False}
            data = dict(row.data)
            comments = [dict(c) for c in data.get('comments', [])]
            for c in comments:
                if c.get('id') == comment_id:
                    liked_by = list(c.get('likedBy', []))
                    if user_id in liked_by:
                        liked_by.remove(user_id)
                        c['likes'] = max(0, c.get('likes', 1) - 1)
                        liked = False
                    else:
                        liked_by.append(user_id)
                        c['likes'] = c.get('likes', 0) + 1
                        liked = True
                    c['likedBy'] = liked_by
                    data['comments'] = comments
                    row.data = data
                    return {"commentId": comment_id, "likes": c['likes'], "liked": liked}
            return {"commentId": comment_id, "likes": 0, "liked": False}

    # ------------------------------------------------------------------ notifications
    def _notifications_for(self, user_id: Optional[str]):
        stmt = select(m.Notification).order_by(m.Notification.created_at.desc())
        if user_id:
            uid = _lower(user_id)
            stmt = stmt.where(or_(
                m.Notification.recipient_id.is_(None),
                func.lower(m.Notification.recipient_id) == uid,
                func.lower(m.Notification.recipient_id) == 'all',
            ))
        return stmt

    def get_notifications(self, user_id: Optional[str] = None, unread_only: bool = False) -> List[CommunityNotification]:
        with db_session() as db:
            stmt = self._notifications_for(user_id)
            if unread_only:
                stmt = stmt.where(m.Notification.is_read.is_(False))
            return [CommunityNotification(**{**r.data, 'isRead': r.is_read}) for r in db.scalars(stmt).all()]

    def get_notification_recipient(self, notification_id: str) -> Tuple[bool, Optional[str]]:
        """(exists, recipient_id) for ownership checks."""
        with db_session() as db:
            row = db.get(m.Notification, notification_id)
            return (row is not None, row.recipient_id if row else None)

    def get_unread_notification_count(self, user_id: Optional[str] = None) -> int:
        return len(self.get_notifications(user_id=user_id, unread_only=True))

    def create_notification(self, notification: CommunityNotification) -> CommunityNotification:
        data = notification.model_dump()
        with db_session() as db:
            db.add(m.Notification(
                id=notification.id,
                recipient_id=data.get('recipientId'),
                is_read=bool(data.get('isRead')),
                data=data,
            ))
        return notification

    def mark_notification_as_read(self, notification_id: str) -> Optional[CommunityNotification]:
        with db_session() as db:
            row = db.get(m.Notification, notification_id)
            if not row:
                return None
            row.is_read = True
            row.data = {**row.data, 'isRead': True}
            return CommunityNotification(**row.data)

    def mark_all_notifications_as_read(self, user_id: str) -> int:
        with db_session() as db:
            rows = db.scalars(self._notifications_for(user_id).where(m.Notification.is_read.is_(False))).all()
            for row in rows:
                row.is_read = True
                row.data = {**row.data, 'isRead': True}
            return len(rows)

    def delete_notification(self, notification_id: str) -> bool:
        with db_session() as db:
            result = db.execute(delete(m.Notification).where(m.Notification.id == notification_id))
            return result.rowcount > 0

    def clear_all_notifications(self, user_id: str) -> int:
        """Deletes the user's own notifications (broadcasts to everyone are left alone)."""
        with db_session() as db:
            result = db.execute(delete(m.Notification).where(func.lower(m.Notification.recipient_id) == _lower(user_id)))
            return result.rowcount

    # ------------------------------------------------------------------ admin operations
    def get_admin_overview(self) -> Dict[str, Any]:
        with db_session() as db:
            total_users = db.scalar(select(func.count(m.User.id))) or 0
            total_candidates = db.scalar(select(func.count(m.Candidate.id))) or 0
            total_creators = db.scalar(select(func.count(m.Creator.id)).where(m.Creator.status == 'approved')) or 0
            total_bookings = db.scalar(select(func.count(m.Booking.id))) or 0

            bookings = db.scalars(select(m.Booking)).all()
            total_gmv = 0
            for b in bookings:
                p = (b.data or {}).get('expert', {}).get('price') or (b.data or {}).get('price') or 1299
                total_gmv += int(p)

            eligible_mentors_count = 0
            candidates = db.scalars(select(m.Candidate)).all()
            for c in candidates:
                if (c.data or {}).get('isMentorEligible'):
                    eligible_mentors_count += 1

            return {
                "totalUsers": total_users,
                "totalCandidates": total_candidates,
                "totalMentors": total_creators,
                "eligibleMentors": eligible_mentors_count,
                "totalBookings": total_bookings,
                "totalGmv": total_gmv,
                "platformEarnings": round(total_gmv * 0.15),
            }

    def get_admin_users(self) -> List[Dict[str, Any]]:
        with db_session() as db:
            users = db.scalars(select(m.User).order_by(m.User.created_at.desc())).all()
            candidates_map = {c.id.lower(): c.data for c in db.scalars(select(m.Candidate)).all()}
            creators_by_owner = {cr.owner_user_id.lower(): cr for cr in db.scalars(select(m.Creator)).all() if cr.owner_user_id}

            results = []
            for u in users:
                cdata = candidates_map.get(u.id.lower(), {})
                creator = creators_by_owner.get(u.id.lower())

                is_mentor = creator is not None
                is_eligible = bool(is_mentor or cdata.get('isMentorEligible'))

                results.append({
                    "id": u.id,
                    "name": u.name or cdata.get('name') or "Unnamed User",
                    "email": u.email or cdata.get('email') or "",
                    "mobile": u.mobile or cdata.get('phone') or "",
                    "avatar": u.avatar or cdata.get('avatar'),
                    "currentCompany": cdata.get('currentCompany') or cdata.get('pastCompany') or "",
                    "designation": cdata.get('designation') or cdata.get('pastCompanyRole') or "",
                    "experienceYears": cdata.get('experienceYears') or (f"{cdata.get('totalExperienceYears')} yrs" if cdata.get('totalExperienceYears') is not None else None),
                    "totalExperienceYears": cdata.get('totalExperienceYears'),
                    "skills": cdata.get('skills') or [],
                    "resumeFileName": cdata.get('resumeFileName'),
                    "resumeUpdatedAt": cdata.get('resumeUpdatedAt'),
                    "resumeUrl": cdata.get('resumeUrl'),
                    "city": cdata.get('city') or "",
                    "careerGoal": cdata.get('careerGoal') or "",
                    "targetRole": cdata.get('targetRole') or "",
                    "isMentorEligible": is_eligible,
                    "isMentor": is_mentor,
                    "creatorId": creator.id if creator else None,
                    "creatorStatus": creator.status if creator else None,
                    "createdAt": u.created_at.isoformat() if u.created_at else None,
                    "lastLoginAt": u.last_login_at.isoformat() if u.last_login_at else None,
                })
            return results

    def toggle_user_mentor_access(self, user_id: str, is_eligible: bool) -> bool:
        with db_session() as db:
            row = db.scalar(select(m.Candidate).where(func.lower(m.Candidate.id) == _lower(user_id)))
            if row:
                row.data = {**row.data, 'isMentorEligible': is_eligible}

            creator = db.scalar(select(m.Creator).where(func.lower(m.Creator.owner_user_id) == _lower(user_id)))
            if creator:
                creator.status = 'approved' if is_eligible else 'inactive'
                creator.data = {**creator.data, 'status': 'approved' if is_eligible else 'inactive'}
            return True

    def get_admin_bookings(self) -> List[Dict[str, Any]]:
        with db_session() as db:
            bookings = db.scalars(select(m.Booking).order_by(m.Booking.created_at.desc())).all()
            results = []
            for b in bookings:
                data = b.data or {}
                expert_info = data.get('expert') or {}
                price = expert_info.get('price') or data.get('price') or 1299
                results.append({
                    "id": b.id,
                    "expertId": b.expert_id,
                    "expertName": expert_info.get('name') or "Expert Mentor",
                    "expertCompany": expert_info.get('company') or "Tech Co",
                    "candidateId": b.candidate_id,
                    "candidateName": data.get('candidateName') or "Candidate",
                    "candidateEmail": data.get('candidateEmail'),
                    "status": b.status,
                    "date": b.date,
                    "timeSlot": b.time_slot,
                    "price": price,
                    "platformCut": round(price * 0.15),
                    "mentorEarnings": round(price * 0.85),
                    "createdAt": b.created_at.isoformat() if b.created_at else None,
                })
            return results

    def get_admin_creators(self) -> List[Dict[str, Any]]:
        with db_session() as db:
            creators = db.scalars(select(m.Creator).order_by(m.Creator.created_at.desc())).all()
            results = []
            for cr in creators:
                data = cr.data or {}
                results.append({
                    "id": cr.id,
                    "ownerUserId": cr.owner_user_id,
                    "name": data.get('name'),
                    "role": data.get('role'),
                    "company": data.get('company'),
                    "domain": data.get('domain'),
                    "experience": data.get('experience'),
                    "price": data.get('price'),
                    "rating": data.get('rating', 5.0),
                    "reviewsCount": data.get('reviewsCount', 0),
                    "sessionsCount": data.get('sessionsCount', 0),
                    "status": cr.status,
                    "avatar": data.get('avatar'),
                    "isVerifiedEmployer": data.get('isVerifiedEmployer', True),
                    "createdAt": cr.created_at.isoformat() if cr.created_at else None,
                })
            return results

    def update_creator_status(self, creator_id: str, status: str) -> bool:
        with db_session() as db:
            cr = db.scalar(select(m.Creator).where(func.lower(m.Creator.id) == _lower(creator_id)))
            if not cr:
                return False
            cr.status = status
            cr.data = {**cr.data, 'status': status}
            return True

    # ------------------------------------------------------------------ demo
    def reset_to_default(self) -> None:
        from backend.db.seed import reset_and_seed_demo_data
        reset_and_seed_demo_data()


store = Store()
