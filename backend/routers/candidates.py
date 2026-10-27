from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from backend.auth.deps import require_user
from backend.data.store import store
from backend.db.engine import db_session
from backend.db.models import User
from backend.models.schemas import CandidateProfile

router = APIRouter(prefix="/api/candidates", tags=["Candidates"])

# Set by the platform (assessments, badges, sign-in, resume upload), never by the client
PROTECTED_FIELDS = {
    "id", "badges", "profileScore", "recruiterSearchMultiplier", "email",
    "resumeFileName", "resumeUpdatedAt", "resumeFileKey", "isMentorEligible",
}


def _own_id(candidate_id: str, user: User) -> str:
    # Candidates can only read/update their own profile ('me' is an alias)
    if candidate_id != "me" and candidate_id.lower() != user.id.lower():
        raise HTTPException(status_code=404, detail="Candidate not found")
    return user.id


def _with_display_fields(updates: Dict[str, Any], merged: Dict[str, Any]) -> Dict[str, Any]:
    """Keeps the display fields in sync with the structured ones."""
    out = dict(updates)
    if "firstName" in updates or "lastName" in updates:
        full = f"{merged.get('firstName') or ''} {merged.get('lastName') or ''}".strip()
        if full:
            out["name"] = full
    if "totalExperienceYears" in updates or "totalExperienceMonths" in updates:
        years, months = merged.get("totalExperienceYears"), merged.get("totalExperienceMonths") or 0
        if years is None:
            out["experienceYears"] = None
        else:
            text = f"{years} year{'s' if years != 1 else ''}"
            if months:
                text += f" {months} month{'s' if months != 1 else ''}"
            out["experienceYears"] = text
    for lpa_key, text_key in (("currentCtcLpa", "currentCtc"), ("expectedCtcLpa", "expectedCtc")):
        if lpa_key in updates:
            value = merged.get(lpa_key)
            out[text_key] = f"{value:g} LPA" if value is not None else None
    return out


@router.get("")
@router.get("/")
@router.get("/{candidate_id}")
def get_candidate_profile(candidate_id: str = "me", user: User = Depends(require_user)):
    own_id = _own_id(candidate_id, user)
    candidate = store.get_candidate(own_id)
    if not candidate:
        with db_session() as db:
            store._ensure_candidate_profile(db, user)
        candidate = store.get_candidate(own_id)
    if not candidate:
        candidate = CandidateProfile(id=own_id, name=user.name, email=user.email or "", phone=user.mobile or "")
    return {"success": True, "data": candidate}


@router.put("")
@router.put("/")
@router.put("/{candidate_id}")
def update_candidate_profile(updates: Dict[str, Any], candidate_id: str = "me", user: User = Depends(require_user)):
    allowed = {k: v for k, v in updates.items() if k not in PROTECTED_FIELDS}
    if not allowed:
        raise HTTPException(status_code=400, detail="No updatable fields provided")
    own_id = _own_id(candidate_id, user)
    current = store.get_candidate(own_id)
    if not current:
        with db_session() as db:
            store._ensure_candidate_profile(db, user)
        current = store.get_candidate(own_id)
    if not current:
        current = CandidateProfile(id=own_id, name=user.name, email=user.email or "", phone=user.mobile or "")

    merged = {**current.model_dump(), **allowed}
    allowed = _with_display_fields(allowed, merged)
    try:
        # Validate the result before saving, so a bad value can't make the profile unreadable
        CandidateProfile(**{**current.model_dump(), **allowed})
    except ValidationError as e:
        first = e.errors()[0]
        field = ".".join(str(p) for p in first.get("loc", []))
        raise HTTPException(status_code=422, detail=f"Invalid value for {field}: {first.get('msg')}")

    updated = store.update_candidate(own_id, allowed)
    if "name" in allowed:
        store.update_user_name(own_id, allowed["name"])
    return {"success": True, "data": updated}
