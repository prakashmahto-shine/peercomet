from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.auth.deps import require_admin
from backend.data.store import store
from backend.db.models import User

router = APIRouter(prefix="/api/admin", tags=["Admin"])


class MentorAccessInput(BaseModel):
    isMentorEligible: bool


class CreatorStatusInput(BaseModel):
    status: str = Field(..., pattern="^(approved|paused|inactive)$")


def require_admin_privileges(user: User = Depends(require_admin)) -> User:
    """Admins manage registrations and mentors (ADMIN_EMAILS / ADMIN_USER_IDS on the server)."""
    return user


@router.get("/overview")
def get_overview(admin: User = Depends(require_admin_privileges)):
    return {
        "success": True,
        "data": store.get_admin_overview()
    }


@router.get("/users")
def get_users(admin: User = Depends(require_admin_privileges)):
    return {
        "success": True,
        "data": store.get_admin_users()
    }


@router.post("/users/{user_id}/mentor-access")
def toggle_mentor_access(user_id: str, payload: MentorAccessInput, admin: User = Depends(require_admin_privileges)):
    success = store.toggle_user_mentor_access(user_id, payload.isMentorEligible)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    action = "granted" if payload.isMentorEligible else "revoked"
    return {
        "success": True,
        "message": f"Mentor access {action} successfully",
        "data": {
            "userId": user_id,
            "isMentorEligible": payload.isMentorEligible
        }
    }


@router.get("/bookings")
def get_bookings(admin: User = Depends(require_admin_privileges)):
    return {
        "success": True,
        "data": store.get_admin_bookings()
    }


@router.get("/creators")
def get_creators(admin: User = Depends(require_admin_privileges)):
    return {
        "success": True,
        "data": store.get_admin_creators()
    }


@router.post("/creators/{creator_id}/status")
def update_creator_status(creator_id: str, payload: CreatorStatusInput, admin: User = Depends(require_admin_privileges)):
    success = store.update_creator_status(creator_id, payload.status)
    if not success:
        raise HTTPException(status_code=404, detail="Creator not found")
    return {
        "success": True,
        "data": {
            "creatorId": creator_id,
            "status": payload.status
        }
    }
