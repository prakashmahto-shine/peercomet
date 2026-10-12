from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from backend.auth.deps import load_session_for, owns_creator, require_user
from backend.data.store import store
from backend.db.models import User
from backend.models.schemas import CheckoutPayload, ReschedulePayload, SessionReviewPayload
from backend.services.booking_service import booking_service, BookingError

router = APIRouter(tags=["Bookings & Payments"])

def _raise(e: Exception):
    if isinstance(e, HTTPException):
        raise e
    if isinstance(e, BookingError):
        raise HTTPException(status_code=e.status_code, detail=str(e))
    print(f"[Bookings] Unexpected error: {e}")
    raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/api/bookings")
def get_sessions(role: Optional[str] = None, user: User = Depends(require_user)):
    """The signed-in user's bookings: as a candidate (default) or as a mentor (role=mentor).
    A `userId` query param is ignored; identity always comes from the session cookie."""
    try:
        if role == 'mentor':
            creator = store.get_creator_by_owner(user.id)
            sessions = booking_service.get_all_sessions(user_id=creator.id, role='mentor') if creator else []
        else:
            sessions = booking_service.get_all_sessions(user_id=user.id, role='candidate')
        return {"success": True, "count": len(sessions), "data": sessions}
    except Exception as e:
        _raise(e)

@router.get("/api/bookings/{session_id}")
def get_session_by_id(session_id: str, user: User = Depends(require_user)):
    return {"success": True, "data": load_session_for(session_id, user)}

@router.get("/api/creators/{creator_id}/booked-slots")
def get_booked_slots(creator_id: str):
    # Public: only dates/times, no candidate details
    return {"success": True, "data": booking_service.get_booked_slots(creator_id)}

@router.post("/api/payments/checkout")
@router.post("/api/bookings/checkout")
def checkout_session(payload: CheckoutPayload, user: User = Depends(require_user)):
    if owns_creator(user, payload.expertId):
        raise HTTPException(status_code=400, detail="You cannot book a session with yourself")
    profile = store.get_candidate(user.id)
    # The candidate is always the signed-in user, whatever the client sent
    payload = payload.model_copy(update={
        'candidateId': user.id,
        'candidateName': (profile.name if profile else None) or user.name or payload.candidateName,
        'candidateEmail': user.email or (profile.email if profile else None),
    })
    try:
        return booking_service.process_checkout(payload)
    except Exception as e:
        _raise(e)

@router.post("/api/bookings/{session_id}/cancel")
def cancel_session(session_id: str, user: User = Depends(require_user)):
    load_session_for(session_id, user)
    try:
        return {"success": True, "data": booking_service.cancel_session(session_id)}
    except Exception as e:
        _raise(e)

@router.post("/api/bookings/{session_id}/reschedule")
def reschedule_session(session_id: str, payload: ReschedulePayload, user: User = Depends(require_user)):
    load_session_for(session_id, user)
    try:
        return {"success": True, "data": booking_service.reschedule_session(session_id, payload.newDate, payload.newTimeSlot)}
    except Exception as e:
        _raise(e)

@router.post("/api/bookings/{session_id}/complete")
def complete_session(session_id: str, user: User = Depends(require_user)):
    load_session_for(session_id, user)
    try:
        return {"success": True, "data": booking_service.complete_session(session_id)}
    except Exception as e:
        _raise(e)

@router.post("/api/bookings/{session_id}/review")
def review_session(session_id: str, payload: SessionReviewPayload, user: User = Depends(require_user)):
    load_session_for(session_id, user, allow='candidate')
    try:
        return {"success": True, "data": booking_service.submit_review(session_id, payload)}
    except Exception as e:
        _raise(e)
