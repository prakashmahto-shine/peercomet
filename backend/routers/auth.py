from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field

from backend.auth import service as auth_service
from backend.auth.deps import require_user
from backend.auth.service import AuthError
from backend.config import SESSION_COOKIE_NAME, SESSION_COOKIE_SECURE, SESSION_TTL_DAYS
from backend.data.store import store
from backend.db.engine import db_session
from backend.db.models import User

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class AdminLoginInput(BaseModel):
    email: str = Field(max_length=320)
    password: str = Field(max_length=200)


class OtpSendInput(BaseModel):
    email: str = Field(max_length=320)


class OtpVerifyInput(BaseModel):
    requestId: str = Field(max_length=200)
    email: str = Field(max_length=320)
    otp: str = Field(max_length=10)
    # Sign-up only (email not registered yet)
    name: Optional[str] = Field(default=None, max_length=200)
    mobile: Optional[str] = Field(default=None, max_length=32)


def _raise(e: AuthError):
    raise HTTPException(status_code=e.status_code, detail=str(e))


@router.post("/admin-login")
def admin_login(payload: AdminLoginInput, request: Request, response: Response):
    """Internal administrator login. Restricted to authorized internal staff only."""
    email_clean = (payload.email or "").strip().lower()
    password_clean = (payload.password or "").strip()

    if email_clean != "admin@peerpath.com" or password_clean != "admin@shine123":
        raise HTTPException(
            status_code=401,
            detail="Access Denied: Invalid administrator credentials."
        )

    user = store.get_user_by_email("admin@peerpath.com")
    if user is None:
        user = store.create_user(
            email="admin@peerpath.com",
            name="PeerPath Admin",
            mobile="7042653680"
        )
    elif not user.name or user.name != "PeerPath Admin" or user.mobile != "7042653680":
        with db_session() as db:
            db_user = db.get(User, user.id)
            if db_user:
                db_user.name = "PeerPath Admin"
                db_user.mobile = "7042653680"
                db.commit()

    store.record_login(user.id)
    token, _ = store.create_auth_session(user.id)

    is_https = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
    response.set_cookie(
        SESSION_COOKIE_NAME,
        token,
        max_age=SESSION_TTL_DAYS * 24 * 3600,
        httponly=True,
        secure=SESSION_COOKIE_SECURE and is_https,
        samesite="lax",
        path="/",
    )
    return {"success": True, "data": auth_service.describe_user(user)}


@router.post("/otp/send")
def send_otp(payload: OtpSendInput):
    """Emails a 6-digit sign-in code. `isRegistered: false` means the verify step must include a name."""
    try:
        request_id, is_registered = auth_service.send_otp(payload.email)
    except AuthError as e:
        _raise(e)
    return {"success": True, "requestId": request_id, "isRegistered": is_registered}


@router.post("/otp/verify")
def verify_otp(payload: OtpVerifyInput, request: Request, response: Response):
    try:
        user, token = auth_service.verify_otp(
            payload.requestId, payload.email, payload.otp, name=payload.name, mobile=payload.mobile
        )
    except AuthError as e:
        _raise(e)
    is_https = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
    response.set_cookie(
        SESSION_COOKIE_NAME,
        token,
        max_age=SESSION_TTL_DAYS * 24 * 3600,
        httponly=True,
        secure=SESSION_COOKIE_SECURE and is_https,
        samesite="lax",
        path="/",
    )
    return {"success": True, "data": auth_service.describe_user(user)}


@router.get("/me")
def me(user: User = Depends(require_user)):
    return {"success": True, "data": auth_service.describe_user(user)}


@router.post("/logout")
def logout(request: Request, response: Response):
    store.delete_auth_session(request.cookies.get(SESSION_COOKIE_NAME, ""))
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"success": True}
