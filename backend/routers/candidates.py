from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from backend.auth.deps import require_user
from backend.data.store import store
from backend.db.models import User

router = APIRouter(prefix="/api/candidates", tags=["Candidates"])

# Set by the platform (assessments, badges, Shine identity), never by the client
PROTECTED_FIELDS = {"id", "badges", "profileScore", "recruiterSearchMultiplier", "email", "phone"}


def _own_id(candidate_id: str, user: User) -> str:
    # Candidates can only read/update their own profile ('me' is an alias)
    if candidate_id != "me" and candidate_id.lower() != user.id.lower():
        raise HTTPException(status_code=404, detail="Candidate not found")
    return user.id


@router.get("/{candidate_id}")
def get_candidate_profile(candidate_id: str, user: User = Depends(require_user)):
    candidate = store.get_candidate(_own_id(candidate_id, user))
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"success": True, "data": candidate}


@router.put("/{candidate_id}")
def update_candidate_profile(candidate_id: str, updates: Dict[str, Any], user: User = Depends(require_user)):
    allowed = {k: v for k, v in updates.items() if k not in PROTECTED_FIELDS}
    if not allowed:
        raise HTTPException(status_code=400, detail="No updatable fields provided")
    updated = store.update_candidate(_own_id(candidate_id, user), allowed)
    if not updated:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"success": True, "data": updated}
