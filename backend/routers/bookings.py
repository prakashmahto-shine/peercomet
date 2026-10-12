from typing import Optional
from fastapi import APIRouter, HTTPException
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
def get_sessions(userId: Optional[str] = None, role: Optional[str] = None):
    if not userId:
        raise HTTPException(status_code=400, detail="userId is required")
    try:
        sessions = booking_service.get_all_sessions(user_id=userId, role=role)
        return {"success": True, "count": len(sessions), "data": sessions}
    except Exception as e:
        _raise(e)

@router.get("/api/bookings/{session_id}")
def get_session_by_id(session_id: str):
    try:
        session = booking_service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail=f"Session with ID {session_id} not found")
        return {"success": True, "data": session}
    except Exception as e:
        _raise(e)

@router.get("/api/creators/{creator_id}/booked-slots")
def get_booked_slots(creator_id: str):
    return {"success": True, "data": booking_service.get_booked_slots(creator_id)}

@router.post("/api/payments/checkout")
@router.post("/api/bookings/checkout")
def checkout_session(payload: CheckoutPayload):
    try:
        return booking_service.process_checkout(payload)
    except Exception as e:
        _raise(e)

@router.post("/api/bookings/{session_id}/cancel")
def cancel_session(session_id: str):
    try:
        return {"success": True, "data": booking_service.cancel_session(session_id)}
    except Exception as e:
        _raise(e)

@router.post("/api/bookings/{session_id}/reschedule")
def reschedule_session(session_id: str, payload: ReschedulePayload):
    try:
        return {"success": True, "data": booking_service.reschedule_session(session_id, payload.newDate, payload.newTimeSlot)}
    except Exception as e:
        _raise(e)

@router.post("/api/bookings/{session_id}/complete")
def complete_session(session_id: str):
    try:
        return {"success": True, "data": booking_service.complete_session(session_id)}
    except Exception as e:
        _raise(e)

@router.post("/api/bookings/{session_id}/review")
def review_session(session_id: str, payload: SessionReviewPayload):
    try:
        return {"success": True, "data": booking_service.submit_review(session_id, payload)}
    except Exception as e:
        _raise(e)
