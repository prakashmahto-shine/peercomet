"""
Sign-in and sign-up with a one-time code sent by email (no passwords).

  1. send_otp(email)    -> emails a 6-digit code, returns a request id
  2. verify_otp(...)    -> checks the code, creates the account for a new email (sign-up)
                           and opens a login session; the client then shows registration
"""
import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple

from backend.auth.email_sender import EmailNotConfigured, EmailSendError, send_email
from backend.config import BRAND_NAME, DEV_OTP_CODE, EMAIL_BACKEND, OTP_TTL_MINUTES
from backend.data.store import store
from backend.db.models import User

MAX_SENDS_PER_WINDOW = 5
SEND_WINDOW = timedelta(minutes=15)
MAX_VERIFY_ATTEMPTS = 5

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class AuthError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


def normalize_email(raw: str) -> str:
    email = (raw or "").strip().lower()
    if len(email) > 320 or not _EMAIL_RE.match(email):
        raise AuthError("Please enter a valid email address")
    return email


def normalize_mobile(raw: Optional[str]) -> Optional[str]:
    digits = re.sub(r"\D", "", raw or "")
    if not digits:
        return None
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    if not re.fullmatch(r"[6-9]\d{9}", digits):
        raise AuthError("Please enter a valid 10-digit Indian mobile number")
    return digits


def _is_dev_demo_id(identifier: str) -> bool:
    """Local development only: a seeded demo user id (e.g. 'akash') instead of an email."""
    if EMAIL_BACKEND != "console" or "@" in identifier:
        return False
    return bool(store.get_candidate(identifier) or store.get_creator_by_id(identifier))


def _resolve(identifier: str) -> Tuple[str, bool]:
    raw = (identifier or "").strip().lower()
    if _is_dev_demo_id(raw):
        return raw, True
    return normalize_email(raw), False


def _code_hash(request_id: str, code: str) -> str:
    return hashlib.sha256(f"{request_id}:{code}".encode("utf-8")).hexdigest()


def _email_body(code: str) -> Tuple[str, str, str]:
    subject = f"{code} is your {BRAND_NAME} sign-in code"
    text = (
        f"Your {BRAND_NAME} sign-in code is {code}\n\n"
        f"It expires in {OTP_TTL_MINUTES} minutes. If you didn't try to sign in, you can ignore this email.\n"
    )
    html = (
        f"<p>Your {BRAND_NAME} sign-in code is</p>"
        f"<p style=\"font-size:28px;font-weight:700;letter-spacing:6px;margin:8px 0\">{code}</p>"
        f"<p>It expires in {OTP_TTL_MINUTES} minutes. If you didn't try to sign in, you can ignore this email.</p>"
    )
    return subject, text, html


def send_otp(identifier: str) -> Tuple[str, bool]:
    """Emails a sign-in code. Returns (request_id, is_registered)."""
    email, is_demo = _resolve(identifier)

    if store.count_recent_email_otps(email, datetime.utcnow() - SEND_WINDOW) >= MAX_SENDS_PER_WINDOW:
        raise AuthError("Too many codes requested. Please try again in a few minutes.", 429)

    code = DEV_OTP_CODE if (EMAIL_BACKEND == "console" or not SMTP_HOST) else f"{secrets.randbelow(10 ** 6):06d}"
    request_id = secrets.token_urlsafe(16)
    store.create_email_otp(request_id, email, _code_hash(request_id, code),
                           datetime.utcnow() + timedelta(minutes=OTP_TTL_MINUTES))

    if is_demo:
        print(f"[Auth:dev] Sign-in code for demo user '{email}': {code}")
        return request_id, True

    subject, text, html = _email_body(code)
    try:
        send_email(email, subject, text, html)
    except EmailNotConfigured:
        print(f"[Auth] SMTP not configured. Logged code for '{email}': {code}")
        return request_id, store.get_user_by_email(email) is not None
    except EmailSendError as e:
        print(f"[Auth] Could not send sign-in email: {e}. Fallback code for '{email}': {code}")
        if not (IS_PRODUCTION and SMTP_HOST):
            return request_id, store.get_user_by_email(email) is not None
        raise AuthError("We couldn't send the email. Please try again.", 502)

    return request_id, store.get_user_by_email(email) is not None


def verify_otp(request_id: str, identifier: str, otp: str,
               name: Optional[str] = None, mobile: Optional[str] = None) -> Tuple[User, str]:
    """Checks the code, signs the user in (creating the account on first sign-in).
    Returns (user, session_token)."""
    email, is_demo = _resolve(identifier)

    challenge = store.get_email_otp(request_id)
    if (not challenge or challenge["email"] != email or challenge["consumed_at"] is not None
            or challenge["expires_at"] < datetime.utcnow()):
        raise AuthError("This code has expired. Please request a new one.", 410)
    if challenge["attempts"] >= MAX_VERIFY_ATTEMPTS:
        raise AuthError("Too many incorrect attempts. Please request a new code.", 429)
    if not hmac.compare_digest(challenge["code_hash"], _code_hash(request_id, (otp or "").strip())):
        store.increment_email_otp_attempts(request_id)
        raise AuthError("Incorrect code", 401)

    if is_demo:
        if not store.consume_email_otp(request_id):
            raise AuthError("This code has already been used. Please request a new one.", 410)
        user = store.ensure_demo_user(email)
    else:
        user = store.get_user_by_email(email)
        if user is None:
            # Sign-up: the account is created now; name and the rest of the profile are
            # collected by the registration form (/register). Validate before using up the code.
            clean_name = (name or "").strip()
            clean_mobile = normalize_mobile(mobile)
            if not store.consume_email_otp(request_id):
                raise AuthError("This code has already been used. Please request a new one.", 410)
            user = store.create_user(email=email, name=clean_name[:200], mobile=clean_mobile)
        elif not store.consume_email_otp(request_id):
            raise AuthError("This code has already been used. Please request a new one.", 410)

    store.record_login(user.id)
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
