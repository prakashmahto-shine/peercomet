"""FastAPI dependencies for authentication and ownership checks."""
from typing import Optional

from fastapi import Depends, HTTPException, Request

from backend.config import ADMIN_USER_IDS, RECRUITER_USER_IDS, SESSION_COOKIE_NAME
from backend.data.store import store
from backend.db.models import User
from backend.models.schemas import MentorshipSession


def get_optional_user(request: Request) -> Optional[User]:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    return store.get_user_by_session_token(token) if token else None


def require_user(user: Optional[User] = Depends(get_optional_user)) -> User:
    if not user:
        raise HTTPException(status_code=401, detail="Please sign in to continue")
    return user


def require_admin(user: User = Depends(require_user)) -> User:
    if user.id not in ADMIN_USER_IDS:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def require_recruiter(user: User = Depends(require_user)) -> User:
    if user.id not in RECRUITER_USER_IDS and user.id not in ADMIN_USER_IDS:
        raise HTTPException(status_code=403, detail="Recruiter access required")
    return user


def owns_creator(user: User, creator_id: str) -> bool:
    owner = store.get_creator_owner(creator_id)
    if owner is not None and owner.lower() == user.id.lower():
        return True
    if user.id.lower() == creator_id.lower():
        return True
    return False


def require_creator_owner(creator_id: str, user: User) -> None:
    if not owns_creator(user, creator_id):
        raise HTTPException(status_code=403, detail="You can only manage your own mentor profile")


def is_session_candidate(user: User, session: MentorshipSession) -> bool:
    if session.candidateId and session.candidateId.lower() == user.id.lower():
        return True
    if hasattr(session, "candidateEmail") and session.candidateEmail and user.email:
        if session.candidateEmail.strip().lower() == user.email.strip().lower():
            return True
    return False


def is_session_mentor(user: User, session: MentorshipSession) -> bool:
    return owns_creator(user, session.expertId)


def load_session_for(session_id: str, user: User, allow: str = "participant") -> MentorshipSession:
    """Loads a booking and checks the caller's relation to it.
    allow: 'participant' (candidate or mentor), 'candidate' or 'mentor'.
    Returns 404 rather than 403 for other people's sessions, so ids can't be probed."""
    session = store.get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    is_candidate = is_session_candidate(user, session)
    is_mentor = is_session_mentor(user, session)
    permitted = {
        "participant": is_candidate or is_mentor,
        "candidate": is_candidate,
        "mentor": is_mentor,
    }[allow]
    if not permitted:
        if is_candidate or is_mentor:
            raise HTTPException(status_code=403, detail="You are not allowed to do this for this session")
        raise HTTPException(status_code=404, detail="Session not found")
    return session
