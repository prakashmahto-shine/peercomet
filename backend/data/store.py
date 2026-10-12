import json
import os
import threading
from pathlib import Path
from typing import List, Optional, Dict, Any
from backend.config import DB_PATH
from backend.models.schemas import (
    Creator, CandidateProfile, MentorshipSession, PeerVerifiedBadge,
    CommunityPost, CommunityComment, CommunityNotification
)

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

class Store:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self.data: Dict[str, Any] = self._load_data()
        # Guards read-modify-write sequences (e.g. slot check + insert) across threadpool workers
        self.lock = threading.RLock()

    def _load_data(self) -> Dict[str, Any]:
        if os.path.exists(self.db_path):
            try:
                with open(self.db_path, 'r', encoding='utf-8') as f:
                    parsed = json.load(f)
                    if 'creators' in parsed and 'candidates' in parsed and 'sessions' in parsed:
                        return parsed
            except Exception as e:
                print(f"[Store] Error reading {self.db_path}, fallback: {e}")

        # Default fallback structure if db.json is missing
        return {
            "creators": [],
            "candidates": [],
            "sessions": [],
            "badges": [],
            "analytics": {
                "profileUpdatesThisMonth": 14820,
                "newRegistrationsThisMonth": 6350,
                "totalSessionsBooked": 2430,
                "totalActiveCreators": 0
            }
        }

    def save_data(self):
        # Write to a temp file and atomically swap it in, so a crash mid-write can't truncate db.json
        with self.lock:
            tmp_path = self.db_path.with_suffix('.json.tmp')
            try:
                self.db_path.parent.mkdir(parents=True, exist_ok=True)
                with open(tmp_path, 'w', encoding='utf-8') as f:
                    json.dump(self.data, f, indent=2)
                os.replace(tmp_path, self.db_path)
            except Exception as e:
                print(f"[Store] Error saving {self.db_path}: {e}")

    # Creators
    def get_creators(self, domain: Optional[str] = None, query: Optional[str] = None) -> List[Creator]:
        creators_raw = self.data.get('creators', [])
        creators = [Creator(**c) for c in creators_raw]

        if domain and domain != 'all':
            target_norm = normalize_domain_key(domain) or domain.lower()
            filtered = []
            for c in creators:
                c_norm = normalize_domain_key(c.domain) or c.domain.lower()
                if c_norm.lower() == target_norm.lower() or c.domain.lower() == domain.lower():
                    filtered.append(c)
            creators = filtered

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

    def get_creator_by_id(self, creator_id: str) -> Optional[Creator]:
        clean = (creator_id or '').strip().lower()
        for c in self.data.get('creators', []):
            if c.get('id', '').lower() == clean:
                return Creator(**c)
        return None

    def add_creator(self, new_creator: Creator) -> Creator:
        creators = self.data.setdefault('creators', [])
        creator_dict = new_creator.model_dump()
        
        # Replace if exists, else prepend
        idx = next((i for i, c in enumerate(creators) if c.get('id') == new_creator.id), -1)
        if idx >= 0:
            creators[idx] = creator_dict
        else:
            creators.insert(0, creator_dict)
            self.data.setdefault('analytics', {})['totalActiveCreators'] = len(creators)
        
        self.save_data()
        return new_creator

    def update_creator_availability(self, creator_id: str, days: List[str], time_slots: List[str]) -> Optional[Creator]:
        creator = self.get_creator_by_id(creator_id)
        if not creator:
            return None
        
        for c in self.data.get('creators', []):
            if c.get('id', '').lower() == creator_id.strip().lower():
                c['availability'] = {'days': days, 'timeSlots': time_slots}
                break
        
        self.save_data()
        return self.get_creator_by_id(creator_id)

    def update_creator(self, creator_id: str, updates: Dict[str, Any]) -> Optional[Creator]:
        clean = (creator_id or '').strip().lower()
        for c in self.data.get('creators', []):
            if c.get('id', '').lower() == clean:
                c.update(updates)
                self.save_data()
                return Creator(**c)
        return None

    # Sessions & Bookings
    def get_sessions(self, user_id: Optional[str] = None, role: Optional[str] = None) -> List[MentorshipSession]:
        sessions_raw = self.data.get('sessions', [])
        sessions = [MentorshipSession(**s) for s in sessions_raw]
        if not user_id:
            return sessions
        
        # Match on ids only. Matching on name substrings leaked sessions between users
        # (e.g. 'akash' is a substring of 'prakash').
        uid = user_id.strip().lower()
        if role == 'mentor':
            return [s for s in sessions if s.expertId.lower() == uid]
        return [s for s in sessions if s.candidateId.lower() == uid]

    def get_booked_slots(self, expert_id: str) -> List[Dict[str, str]]:
        # Upcoming bookings for a mentor, used to hide taken slots and reject double bookings
        eid = (expert_id or '').strip().lower()
        return [
            {'id': s.get('id', ''), 'date': s.get('date', ''), 'timeSlot': s.get('timeSlot', '')}
            for s in self.data.get('sessions', [])
            if (s.get('expertId') or '').lower() == eid and s.get('status') == 'upcoming'
        ]

    def is_slot_taken(self, expert_id: str, date: str, time_slot: str, exclude_session_id: Optional[str] = None) -> bool:
        return any(
            b['date'] == date and b['timeSlot'] == time_slot
            for b in self.get_booked_slots(expert_id)
            if b['id'] != exclude_session_id
        )

    def get_session_by_id(self, session_id: str) -> Optional[MentorshipSession]:
        for s in self.data.get('sessions', []):
            if s.get('id') == session_id:
                return MentorshipSession(**s)
        return None

    def add_session(self, session: MentorshipSession) -> MentorshipSession:
        sessions = self.data.setdefault('sessions', [])
        sessions.insert(0, session.model_dump())
        self.data.setdefault('analytics', {})['totalSessionsBooked'] = self.data['analytics'].get('totalSessionsBooked', 0) + 1
        self.save_data()
        return session

    def update_session(self, session_id: str, updates: Dict[str, Any]) -> Optional[MentorshipSession]:
        for s in self.data.get('sessions', []):
            if s.get('id') == session_id:
                s.update(updates)
                self.save_data()
                return MentorshipSession(**s)
        return None

    # Candidates & Profile Updates
    def get_candidate(self, candidate_id: str) -> Optional[CandidateProfile]:
        lookup = (candidate_id or '').lower()
        for c in self.data.get('candidates', []):
            cid = c.get('id', '').lower()
            cemail = c.get('email', '').lower()
            if cid == lookup or cemail == lookup or (lookup == 'prakash' and cid == 'prakash-mahto') or (lookup == 'prakash-mahto' and cid == 'prakash'):
                return CandidateProfile(**c)
        return None

    def get_candidates(self, domain: Optional[str] = None, peer_verified_only: bool = False) -> List[CandidateProfile]:
        cands_raw = self.data.get('candidates', [])
        cands = [CandidateProfile(**c) for c in cands_raw]

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
        for c in self.data.get('candidates', []):
            cid = c.get('id', '').lower()
            if cid == candidate_id.lower() or (candidate_id.lower() == 'prakash' and cid == 'prakash-mahto') or (candidate_id.lower() == 'prakash-mahto' and cid == 'prakash'):
                c.update(updates)
                self.data.setdefault('analytics', {})['profileUpdatesThisMonth'] = self.data['analytics'].get('profileUpdatesThisMonth', 0) + 1
                self.save_data()
                return CandidateProfile(**c)
        return None

    def award_badge_to_candidate(self, candidate_id: str, badge: PeerVerifiedBadge) -> Optional[CandidateProfile]:
        cand = self.get_candidate(candidate_id)
        if not cand:
            return None
        
        for c in self.data.get('candidates', []):
            cid = c.get('id', '').lower()
            if cid == candidate_id.lower() or (candidate_id.lower() == 'prakash' and cid == 'prakash-mahto') or (candidate_id.lower() == 'prakash-mahto' and cid == 'prakash'):
                existing_badges = [b for b in c.get('badges', []) if b.get('title') != badge.title]
                c['badges'] = [badge.model_dump()] + existing_badges
                c['profileScore'] = min(100, (c.get('profileScore', 75) + 8))
                c['recruiterSearchMultiplier'] = min(5.0, (c.get('recruiterSearchMultiplier', 1.5) + 0.6))
                
                self.data.setdefault('badges', []).insert(0, badge.model_dump())
                self.data.setdefault('analytics', {})['profileUpdatesThisMonth'] = self.data['analytics'].get('profileUpdatesThisMonth', 0) + 1
                self.save_data()
                return CandidateProfile(**c)
        return None

    # Analytics
    def get_analytics(self) -> Dict[str, Any]:
        analytics = self.data.get('analytics', {})
        creators = self.data.get('creators', [])
        sessions = self.data.get('sessions', [])
        badges = self.data.get('badges', [])

        return {
            **analytics,
            'verifiedCreatorsCount': len(creators),
            'upcomingSessionsCount': len([s for s in sessions if s.get('status') == 'upcoming']),
            'completedSessionsCount': len([s for s in sessions if s.get('status') == 'completed']),
            'totalBadgesIssued': len(badges),
            'domainsCovered': ['Full-Stack', 'AI/ML', 'Semiconductor', 'Cybersecurity', 'SaaS Sales', 'Marketing'],
            'growthStats': {
                'profileUpdateRateGain': '+68% vs baseline jobs platform',
                'passiveRegistrationsInUnderservedDomains': '42% from Topmate/LinkedIn referral',
                'recruiterSearchShortlistSpeed': '3.4x faster for peer-verified candidates'
            }
        }

    # Community Posts & Discussions
    def get_posts(self, tag: Optional[str] = None, mentor_id: Optional[str] = None, user_id: Optional[str] = None) -> List[CommunityPost]:
        posts_raw = self.data.get('posts', [])
        posts = [CommunityPost(**p) for p in posts_raw]

        if tag and tag.lower() != 'all':
            clean_tag = tag.lower().strip()
            posts = [p for p in posts if any(clean_tag in t.lower() for t in p.tags)]

        if mentor_id:
            posts = [p for p in posts if p.mentorId.lower() == mentor_id.lower()]

        return posts

    def create_post(self, new_post: CommunityPost) -> CommunityPost:
        self.data.setdefault('posts', []).insert(0, new_post.model_dump())
        self.save_data()
        return new_post

    def get_post_by_id(self, post_id: str) -> Optional[CommunityPost]:
        for p in self.data.get('posts', []):
            if p.get('id') == post_id:
                return CommunityPost(**p)
        return None

    def add_comment_to_post(self, post_id: str, comment: CommunityComment) -> Optional[CommunityComment]:
        for p in self.data.get('posts', []):
            if p.get('id') == post_id:
                p.setdefault('comments', []).append(comment.model_dump())
                self.save_data()
                return comment
        return None

    def toggle_post_like(self, post_id: str, user_id: str) -> Dict[str, Any]:
        for p in self.data.get('posts', []):
            if p.get('id') == post_id:
                liked_by = p.setdefault('likedBy', [])
                if user_id in liked_by:
                    liked_by.remove(user_id)
                    p['likes'] = max(0, p.get('likes', 1) - 1)
                    liked = False
                else:
                    liked_by.append(user_id)
                    p['likes'] = p.get('likes', 0) + 1
                    liked = True
                self.save_data()
                return {"postId": post_id, "likes": p['likes'], "liked": liked}
        return {"postId": post_id, "likes": 0, "liked": False}

    def toggle_comment_like(self, post_id: str, comment_id: str, user_id: str) -> Dict[str, Any]:
        for p in self.data.get('posts', []):
            if p.get('id') == post_id:
                for c in p.get('comments', []):
                    if c.get('id') == comment_id:
                        liked_by = c.setdefault('likedBy', [])
                        if user_id in liked_by:
                            liked_by.remove(user_id)
                            c['likes'] = max(0, c.get('likes', 1) - 1)
                            liked = False
                        else:
                            liked_by.append(user_id)
                            c['likes'] = c.get('likes', 0) + 1
                            liked = True
                        self.save_data()
                        return {"commentId": comment_id, "likes": c['likes'], "liked": liked}
        return {"commentId": comment_id, "likes": 0, "liked": False}

    # Notifications Repository
    def get_notifications(self, user_id: Optional[str] = None, unread_only: bool = False) -> List[CommunityNotification]:
        notifs_raw = self.data.get('notifications', [])
        notifs = [CommunityNotification(**n) for n in notifs_raw]

        if user_id:
            uid = user_id.lower()
            notifs = [n for n in notifs if not n.recipientId or n.recipientId.lower() == uid or n.recipientId.lower() == 'all']

        if unread_only:
            notifs = [n for n in notifs if not n.isRead]

        return notifs

    def get_unread_notification_count(self, user_id: Optional[str] = None) -> int:
        return len(self.get_notifications(user_id=user_id, unread_only=True))

    def create_notification(self, notification: CommunityNotification) -> CommunityNotification:
        self.data.setdefault('notifications', []).insert(0, notification.model_dump())
        self.save_data()
        return notification

    def mark_notification_as_read(self, notification_id: str) -> Optional[CommunityNotification]:
        for n in self.data.get('notifications', []):
            if n.get('id') == notification_id:
                n['isRead'] = True
                self.save_data()
                return CommunityNotification(**n)
        return None

    def mark_all_notifications_as_read(self, user_id: str) -> int:
        count = 0
        uid = user_id.lower()
        for n in self.data.get('notifications', []):
            recip = (n.get('recipientId') or '').lower()
            if (not recip or recip == uid or recip == 'all') and not n.get('isRead'):
                n['isRead'] = True
                count += 1
        if count > 0:
            self.save_data()
        return count

    def delete_notification(self, notification_id: str) -> bool:
        notifs = self.data.get('notifications', [])
        init_len = len(notifs)
        self.data['notifications'] = [n for n in notifs if n.get('id') != notification_id]
        if len(self.data['notifications']) != init_len:
            self.save_data()
            return True
        return False

    def clear_all_notifications(self, user_id: Optional[str] = None) -> int:
        notifs = self.data.get('notifications', [])
        init_len = len(notifs)
        if user_id:
            uid = user_id.lower()
            self.data['notifications'] = [n for n in notifs if n.get('recipientId') and n.get('recipientId').lower() != uid and n.get('recipientId').lower() != 'all']
        else:
            self.data['notifications'] = []
        removed = init_len - len(self.data['notifications'])
        self.save_data()
        return removed

    def reset_to_default(self) -> Dict[str, Any]:
        # Re-read initial from db.json if present
        self.data = self._load_data()
        self.save_data()
        return self.data

store = Store()
