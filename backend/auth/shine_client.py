"""
Adapter for Shine's identity APIs (login + registration via OTP).

PeerPath never stores passwords: Shine verifies the user, PeerPath then creates its own
session. Pick the implementation with SHINE_AUTH_MODE:
  - mock: for local/staging. No SMS is sent; the OTP is MOCK_OTP_CODE (default 123456).
  - live: Shine's APIs. Fill in the TODOs once the Shine auth team shares the API spec.
"""
import re
import secrets
import time
from dataclasses import dataclass
from typing import Dict, Optional

import httpx

from backend.config import MOCK_OTP_CODE, SHINE_API_KEY, SHINE_AUTH_MODE, SHINE_BFF_URL


class ShineAuthError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


@dataclass
class OtpChallenge:
    request_id: str
    is_registered: bool


@dataclass
class ShineIdentity:
    shine_candidate_id: str
    name: str
    email: Optional[str]
    mobile: str


def normalize_mobile(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    if not re.fullmatch(r"[6-9]\d{9}", digits):
        raise ShineAuthError("Please enter a valid 10-digit Indian mobile number")
    return digits


class ShineAuthClient:
    def send_otp(self, mobile: str) -> OtpChallenge:
        raise NotImplementedError

    def verify_otp(self, request_id: str, mobile: str, otp: str,
                   name: Optional[str] = None, email: Optional[str] = None) -> ShineIdentity:
        """Verifies the OTP. For a mobile not registered on Shine, `name` and `email` are
        required and a Shine account is created (registration)."""
        raise NotImplementedError


class MockShineAuthClient(ShineAuthClient):
    """Local stand-in for Shine. Accepts MOCK_OTP_CODE for any mobile number.

    Demo shortcut: entering a demo username instead of a mobile (e.g. 'akash', 'prakash')
    signs in as that seeded demo user. Only available in mock mode.
    """
    _TTL_SECONDS = 600

    def __init__(self):
        self._pending: Dict[str, dict] = {}
        self._registered: Dict[str, ShineIdentity] = {}

    def send_otp(self, mobile: str) -> OtpChallenge:
        request_id = secrets.token_urlsafe(16)
        self._pending[request_id] = {"mobile": mobile, "expires": time.time() + self._TTL_SECONDS}
        is_registered = mobile in self._registered or not mobile.isdigit()
        print(f"[MockShineAuth] OTP for {mobile[-4:].rjust(len(mobile), '*')}: {MOCK_OTP_CODE}")
        return OtpChallenge(request_id=request_id, is_registered=is_registered)

    def verify_otp(self, request_id, mobile, otp, name=None, email=None) -> ShineIdentity:
        pending = self._pending.get(request_id)
        if not pending or pending["mobile"] != mobile or pending["expires"] < time.time():
            raise ShineAuthError("OTP expired. Please request a new one.", 410)
        if otp != MOCK_OTP_CODE:
            raise ShineAuthError("Incorrect OTP", 401)
        self._pending.pop(request_id, None)

        if not mobile.isdigit():
            # Demo username: user id == shine id == the seeded id
            return ShineIdentity(shine_candidate_id=mobile, name=name or mobile.title(), email=email, mobile="")

        if mobile not in self._registered:
            if not name or not email:
                raise ShineAuthError("Name and email are required to create your account", 422)
            self._registered[mobile] = ShineIdentity(
                shine_candidate_id=f"mock-shine-{mobile}", name=name, email=email, mobile=mobile
            )
        return self._registered[mobile]


class LiveShineAuthClient(ShineAuthClient):
    """Shine's BFF auth APIs. Called only from the PeerPath backend (never the browser), with a
    PeerPath-specific API key."""

    def __init__(self):
        if not SHINE_API_KEY:
            raise RuntimeError("SHINE_API_KEY is required when SHINE_AUTH_MODE=live")
        self._client = httpx.Client(
            base_url=SHINE_BFF_URL,
            timeout=10,
            headers={"x-api-key": SHINE_API_KEY, "accept": "application/json"},
        )

    def _lookup_candidate(self, mobile: str) -> Optional[str]:
        # TODO(Shine auth team): endpoint that resolves a mobile number to a Shine candidate id.
        raise NotImplementedError("Shine candidate lookup API not configured yet")

    def send_otp(self, mobile: str) -> OtpChallenge:
        shine_id = self._lookup_candidate(mobile)
        if shine_id:
            # Known endpoint (from shine.com's own login page)
            res = self._client.post("/auth/old/login/otp", json={"otp_type": "mobile", "id": shine_id})
            if res.status_code >= 400:
                raise ShineAuthError("Could not send OTP. Please try again.", 502)
            # TODO(Shine auth team): confirm what identifies this OTP request for verification.
            return OtpChallenge(request_id=shine_id, is_registered=True)
        # TODO(Shine auth team): OTP send for new (unregistered) mobiles during registration.
        raise NotImplementedError("Shine registration OTP API not configured yet")

    def verify_otp(self, request_id, mobile, otp, name=None, email=None) -> ShineIdentity:
        # TODO(Shine auth team): OTP verify endpoint (+ registration for new users) and the
        # profile fields it returns (candidate id, name, email, mobile).
        raise NotImplementedError("Shine OTP verify API not configured yet")


def build_client() -> ShineAuthClient:
    if SHINE_AUTH_MODE == "live":
        return LiveShineAuthClient()
    return MockShineAuthClient()


shine_auth_client = build_client()
