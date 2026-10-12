from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field

from backend.auth import service as auth_service
from backend.auth.deps import require_user
from backend.auth.shine_client import ShineAuthError
from backend.config import SESSION_COOKIE_NAME, SESSION_COOKIE_SECURE, SESSION_TTL_DAYS
from backend.data.store import store
from backend.db.models import User

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class OtpSendInput(BaseModel):
    mobile: str = Field(max_length=32)


class OtpVerifyInput(BaseModel):
    requestId: str = Field(max_length=200)
    mobile: str = Field(max_length=32)
    otp: str = Field(max_length=10)
    # Required only when the mobile isn't registered on Shine yet (registration)
    name: Optional[str] = Field(default=None, max_length=200)
    email: Optional[str] = Field(default=None, max_length=320)


def _raise_auth(e: Exception):
    if isinstance(e, ShineAuthError):
        raise HTTPException(status_code=e.status_code, detail=str(e))
    if isinstance(e, NotImplementedError):
        raise HTTPException(status_code=503, detail="Login is temporarily unavailable")
    raise e


@router.post("/otp/send")
def send_otp(payload: OtpSendInput):
    try:
        _, challenge = auth_service.send_otp(payload.mobile)
    except Exception as e:
        _raise_auth(e)
    return {"success": True, "requestId": challenge.request_id, "isRegistered": challenge.is_registered}


@router.post("/otp/verify")
def verify_otp(payload: OtpVerifyInput, response: Response):
    try:
        user, token = auth_service.verify_otp(
            payload.requestId, payload.mobile, payload.otp, name=payload.name, email=payload.email
        )
    except Exception as e:
        _raise_auth(e)
    response.set_cookie(
        SESSION_COOKIE_NAME,
        token,
        max_age=SESSION_TTL_DAYS * 24 * 3600,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
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
