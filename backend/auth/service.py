import time
from collections import defaultdict, deque
from typing import Deque, Dict, Optional, Tuple

from backend.auth.shine_client import (
    OtpChallenge, ShineAuthError, MockShineAuthClient, normalize_mobile, shine_auth_client
)
from backend.data.store import store
from backend.db.models import User

# Simple in-process rate limits. Fine for a single server; move to Redis if the app runs
# on several processes.
_OTP_SENDS_PER_WINDOW = 5
_OTP_SEND_WINDOW_SECONDS = 15 * 60
_MAX_VERIFY_ATTEMPTS = 5

_send_history: Dict[str, Deque[float]] = defaultdict(deque)
_verify_attempts: Dict[str, int] = defaultdict(int)


def _resolve_identifier(identifier: str) -> str:
    """Normalizes a mobile number. In mock mode also accepts a seeded demo user id."""
    raw = (identifier or "").strip()
    if isinstance(shine_auth_client, MockShineAuthClient) and raw and not any(ch.isdigit() for ch in raw):
        demo_id = raw.lower()
        if store.get_candidate(demo_id) or store.get_creator_by_id(demo_id):
            return demo_id
        raise ShineAuthError("Unknown demo user")
    return normalize_mobile(raw)


def send_otp(identifier: str) -> Tuple[str, OtpChallenge]:
    mobile = _resolve_identifier(identifier)
    now = time.time()
    history = _send_history[mobile]
    while history and history[0] < now - _OTP_SEND_WINDOW_SECONDS:
        history.popleft()
    if len(history) >= _OTP_SENDS_PER_WINDOW:
        raise ShineAuthError("Too many OTP requests. Please try again in a few minutes.", 429)
    history.append(now)
    return mobile, shine_auth_client.send_otp(mobile)


def verify_otp(request_id: str, identifier: str, otp: str,
               name: Optional[str] = None, email: Optional[str] = None) -> Tuple[User, str]:
    """Verifies with Shine, links/creates the PeerPath user and opens a session.
    Returns (user, session_token)."""
    mobile = _resolve_identifier(identifier)
    if _verify_attempts[request_id] >= _MAX_VERIFY_ATTEMPTS:
        raise ShineAuthError("Too many incorrect attempts. Please request a new OTP.", 429)
    try:
        identity = shine_auth_client.verify_otp(request_id, mobile, (otp or "").strip(), name=name, email=email)
    except ShineAuthError as e:
        if e.status_code == 401:
            _verify_attempts[request_id] += 1
        raise
    _verify_attempts.pop(request_id, None)

    is_demo_user = not mobile.isdigit()
    user = store.upsert_user_from_shine(
        shine_candidate_id=identity.shine_candidate_id,
        name=identity.name,
        email=identity.email,
        mobile=identity.mobile or None,
        # Demo users keep their seeded id so they own the seeded candidate/creator records
        user_id=identity.shine_candidate_id if is_demo_user else None,
    )
    token, _ = store.create_auth_session(user.id)
    return user, token


def describe_user(user: User) -> dict:
    """Payload for /api/auth/me and login responses."""
    creator = store.get_creator_by_owner(user.id)
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "mobile": user.mobile,
        "avatar": user.avatar,
        "creatorId": creator.id if creator else None,
        "isMentor": creator is not None,
    }
