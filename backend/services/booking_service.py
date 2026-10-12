import time
import random
import uuid
from typing import List, Dict, Optional, Any
from datetime import datetime
from backend.data.store import store, SlotTakenError
from backend.models.schemas import MentorshipSession, CheckoutPayload, SessionReviewPayload


class BookingError(Exception):
    """Booking rule violation. `status_code` is the HTTP status the router should return."""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


# Session offerings, priced server-side from the mentor's base rate.
# Must stay in sync with sessionOfferings in src/components/modals/BookingModal.tsx.
def _round_price(base: int, factor: float, floor: int) -> int:
    return max(floor, round((base * factor) / 50) * 50 - 1)

SESSION_TYPES = {
    'career-guidance': {'title': 'Career Guidance & Strategy', 'price': lambda base: base},
    'interview-prep': {'title': '1:1 Mock Interview & Scorecard', 'price': lambda base: base},
    'resume-review': {'title': 'CV Audit & ATS Teardown', 'price': lambda base: _round_price(base, 0.7, 499)},
    'salary-negotiation': {'title': 'Salary & Offer Negotiation', 'price': lambda base: _round_price(base, 0.85, 699)},
}


def resolve_session_type(session_type: Optional[str]) -> str:
    if not session_type:
        return 'career-guidance'
    key = session_type.strip().lower()
    if key in SESSION_TYPES:
        return key
    for type_id, cfg in SESSION_TYPES.items():
        if cfg['title'].lower() == key:
            return type_id
    raise BookingError(f"Unknown session type '{session_type}'")


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


class BookingService:
    def get_all_sessions(self, user_id: Optional[str] = None, role: Optional[str] = None) -> List[MentorshipSession]:
        return store.get_sessions(user_id=user_id, role=role)

    def get_session(self, session_id: str) -> Optional[MentorshipSession]:
        return store.get_session_by_id(session_id)

    def get_booked_slots(self, expert_id: str) -> List[Dict[str, str]]:
        return [{'date': b['date'], 'timeSlot': b['timeSlot']} for b in store.get_booked_slots(expert_id)]

    def _validate_slot(self, expert, date: str, time_slot: str, exclude_session_id: Optional[str] = None):
        if not date or not time_slot:
            raise BookingError("Date and time slot are required")
        available_slots = expert.availability.timeSlots if expert.availability else []
        if available_slots and time_slot not in available_slots:
            raise BookingError(f"{expert.name} is not available at {time_slot}")
        available_days = expert.availability.days if expert.availability else []
        day_prefix = date.split(',')[0].strip()[:3]
        if available_days and day_prefix in ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun') and day_prefix not in available_days:
            raise BookingError(f"{expert.name} is not available on {day_prefix}")
        if store.is_slot_taken(expert.id, date, time_slot, exclude_session_id):
            raise BookingError("This slot was just booked by someone else. Please pick another slot.", 409)

    def process_checkout(self, payload: CheckoutPayload) -> Dict[str, Any]:
        expert = store.get_creator_by_id(payload.expertId)
        if not expert:
            raise BookingError(f"Expert with id '{payload.expertId}' not found", 404)
        if not payload.candidateId:
            raise BookingError("candidateId is required")
        if payload.candidateId.strip().lower() == expert.id.lower():
            raise BookingError("You cannot book a session with yourself")

        session_type = resolve_session_type(payload.sessionType)
        amount = SESSION_TYPES[session_type]['price'](expert.price)

        # Check-and-insert under the store lock so two concurrent checkouts can't take the same slot
        with store.lock:
            self._validate_slot(expert, payload.date, payload.timeSlot)

            timestamp = int(time.time() * 1000)
            random_suffix = hex(random.randint(1000, 9999))[2:]
            transaction_id = f"pay_shine_{timestamp}_{random_suffix}"
            session_id = f"sess-{timestamp}-{uuid.uuid4().hex[:8]}"
            meeting_link = f"https://meet.shine.com/room/peerpath-{expert.id}-{str(timestamp)[-5:]}"

            new_session = MentorshipSession(
                id=session_id,
                expertId=expert.id,
                expert=expert,
                candidateId=payload.candidateId,
                candidateName=payload.candidateName or payload.candidateId,
                candidateRole=payload.candidateRole or '',
                candidateAvatar=payload.candidateAvatar or '',
                candidateGoal=payload.candidateGoal or f"Trajectory mentorship & target jump into {expert.company}",
                candidateEmail=payload.candidateEmail,
                date=payload.date,
                timeSlot=payload.timeSlot,
                status='upcoming',
                meetingLink=meeting_link,
                paymentId=transaction_id,
                amountPaid=amount,
                sessionType=SESSION_TYPES[session_type]['title'],
                bookedAt=_now_iso()
            )
            try:
                store.add_session(new_session)
            except SlotTakenError as e:
                raise BookingError(str(e), 409)

        return {
            'success': True,
            'session': new_session,
            'receipt': {
                'transactionId': transaction_id,
                'amountPaid': amount,
                'paymentMethod': payload.paymentMethod,
                'paidAt': _now_iso(),
                'meetingUrl': meeting_link,
                'status': 'PAID_AND_CONFIRMED'
            }
        }

    def _get_or_404(self, session_id: str) -> MentorshipSession:
        session = store.get_session_by_id(session_id)
        if not session:
            raise BookingError(f"Session {session_id} not found", 404)
        return session

    def cancel_session(self, session_id: str) -> MentorshipSession:
        session = self._get_or_404(session_id)
        if session.status != 'upcoming':
            raise BookingError(f"Only upcoming sessions can be cancelled (current status: {session.status})", 409)
        return store.update_session(session_id, {'status': 'cancelled'})

    def reschedule_session(self, session_id: str, new_date: str, new_time_slot: str) -> MentorshipSession:
        session = self._get_or_404(session_id)
        if session.status != 'upcoming':
            raise BookingError(f"Only upcoming sessions can be rescheduled (current status: {session.status})", 409)
        expert = store.get_creator_by_id(session.expertId) or session.expert
        with store.lock:
            self._validate_slot(expert, new_date, new_time_slot, exclude_session_id=session_id)
            try:
                return store.update_session(session_id, {'date': new_date, 'timeSlot': new_time_slot})
            except SlotTakenError as e:
                raise BookingError(str(e), 409)

    def complete_session(self, session_id: str) -> MentorshipSession:
        """Marks a session as held. Idempotent; does not award badges (that's the mentor's assessment)."""
        session = self._get_or_404(session_id)
        if session.status == 'completed':
            return session
        if session.status == 'cancelled':
            raise BookingError("Cancelled sessions cannot be completed", 409)
        updated = store.update_session(session_id, {'status': 'completed', 'completedAt': _now_iso()})
        creator = store.get_creator_by_id(session.expertId)
        if creator:
            store.update_creator(creator.id, {'sessionsCount': creator.sessionsCount + 1})
        return updated

    def submit_review(self, session_id: str, payload: SessionReviewPayload) -> MentorshipSession:
        """Candidate's rating of the mentor. One review per session, only after the session was held."""
        session = self._get_or_404(session_id)
        if session.status != 'completed':
            raise BookingError("You can review a session only after it has been completed", 409)
        if session.candidateRating is not None:
            raise BookingError("This session has already been reviewed", 409)

        with store.lock:
            updated = store.update_session(session_id, {
                'candidateRating': payload.rating,
                'candidateReview': payload.comment.strip()
            })
            creator = store.get_creator_by_id(session.expertId)
            if creator:
                count = creator.reviewsCount
                new_rating = round(((creator.rating * count) + payload.rating) / (count + 1), 2) if count > 0 else payload.rating
                store.update_creator(creator.id, {'rating': new_rating, 'reviewsCount': count + 1})
        return updated

booking_service = BookingService()
