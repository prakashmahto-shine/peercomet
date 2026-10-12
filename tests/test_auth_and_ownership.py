"""
End-to-end API tests for login (mock Shine OTP), sessions and ownership checks.
Runs against a throwaway SQLite database seeded with the demo data.

    python3 -m pytest tests/ -q        (or: python3 tests/test_auth_and_ownership.py)
"""
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.db import engine as db_engine

_tmp_dir = tempfile.mkdtemp()
db_engine.configure(f"sqlite:///{_tmp_dir}/test.sqlite3")

from backend.db.seed import run_migrations, seed_demo_data  # noqa: E402
from backend.routers import (  # noqa: E402
    auth_router, bookings_router, assessment_router, creators_router, candidates_router,
    notifications_router, recruiter_router, analytics_router, community_router, sessions_router,
)
from backend.data.store import store, SlotTakenError  # noqa: E402
from backend.models.schemas import MentorshipSession  # noqa: E402

run_migrations()
seed_demo_data()

app = FastAPI()
for r in (auth_router, creators_router, bookings_router, assessment_router, candidates_router,
          notifications_router, recruiter_router, analytics_router, community_router, sessions_router):
    app.include_router(r)

OTP = os.getenv("MOCK_OTP_CODE", "123456")


def login(identifier: str, name=None, email=None) -> TestClient:
    client = TestClient(app)
    res = client.post("/api/auth/otp/send", json={"mobile": identifier})
    assert res.status_code == 200, res.text
    body = {"requestId": res.json()["requestId"], "mobile": identifier, "otp": OTP}
    if name:
        body.update(name=name, email=email)
    res = client.post("/api/auth/otp/verify", json=body)
    assert res.status_code == 200, res.text
    return client


def next_slot(creator: dict):
    from datetime import datetime, timedelta
    days, slots = creator["availability"]["days"], creator["availability"]["timeSlots"]
    d = next(datetime.now() + timedelta(days=i) for i in range(1, 15)
             if (datetime.now() + timedelta(days=i)).strftime("%a") in days)
    return f"{d.strftime('%a')}, {d.day} {d.strftime('%b %Y')}", slots[0]


candidate = login("diya-joshi")          # seeded demo candidate
mentor = login("saheli")                 # seeded demo mentor (owns creator 'saheli')
anon = TestClient(app)
stranger = None


def test_registration_requires_name_and_email():
    global stranger
    client = TestClient(app)
    req = client.post("/api/auth/otp/send", json={"mobile": "+91 98765 43210"}).json()
    assert req["isRegistered"] is False
    res = client.post("/api/auth/otp/verify", json={"requestId": req["requestId"], "mobile": "9876543210", "otp": OTP})
    assert res.status_code == 422
    stranger = login("9876543210", name="Test User", email="test@example.com")
    me = stranger.get("/api/auth/me").json()["data"]
    assert me["id"].startswith("u_") and me["isMentor"] is False
    assert stranger.get("/api/candidates/me").json()["data"]["name"] == "Test User"


def test_bad_inputs_and_wrong_otp():
    client = TestClient(app)
    assert client.post("/api/auth/otp/send", json={"mobile": "12345"}).status_code == 400
    req = client.post("/api/auth/otp/send", json={"mobile": "9000000001"}).json()
    res = client.post("/api/auth/otp/verify", json={"requestId": req["requestId"], "mobile": "9000000001", "otp": "000000"})
    assert res.status_code == 401
    for _ in range(5):
        client.post("/api/auth/otp/verify", json={"requestId": req["requestId"], "mobile": "9000000001", "otp": "000000"})
    res = client.post("/api/auth/otp/verify", json={"requestId": req["requestId"], "mobile": "9000000001", "otp": OTP})
    assert res.status_code == 429


def test_otp_send_rate_limited():
    client = TestClient(app)
    codes = [client.post("/api/auth/otp/send", json={"mobile": "9000000002"}).status_code for _ in range(6)]
    assert codes[:5] == [200] * 5 and codes[5] == 429


def test_unauthenticated_requests_rejected():
    assert anon.get("/api/bookings").status_code == 401
    assert anon.get("/api/auth/me").status_code == 401
    assert anon.post("/api/payments/checkout", json={"expertId": "saheli", "date": "x", "timeSlot": "y"}).status_code == 401
    assert anon.get("/api/notifications").status_code == 401


def test_booking_lifecycle_and_ownership():
    if stranger is None:
        test_registration_requires_name_and_email()
    creator = anon.get("/api/creators/saheli").json()["data"]
    date, slot = next_slot(creator)

    # Mentor can't book themselves
    assert mentor.post("/api/payments/checkout", json={"expertId": "saheli", "date": date, "timeSlot": slot}).status_code == 400

    # candidateId from the client is ignored: the booking belongs to the signed-in user
    res = candidate.post("/api/payments/checkout", json={"expertId": "saheli", "candidateId": "someone-else", "date": date, "timeSlot": slot})
    assert res.status_code == 200, res.text
    session = res.json()["session"]
    sid = session["id"]
    assert session["candidateId"] == "diya-joshi"

    # Same slot again -> 409
    assert stranger.post("/api/payments/checkout", json={"expertId": "saheli", "date": date, "timeSlot": slot}).status_code == 409

    # Visibility
    assert sid in [s["id"] for s in candidate.get("/api/bookings").json()["data"]]
    assert sid in [s["id"] for s in mentor.get("/api/bookings?role=mentor").json()["data"]]
    assert sid not in [s["id"] for s in stranger.get("/api/bookings?userId=diya-joshi").json()["data"]]
    assert stranger.get(f"/api/bookings/{sid}").status_code == 404
    assert stranger.post(f"/api/bookings/{sid}/cancel").status_code == 404
    assert stranger.get(f"/api/sessions/{sid}/briefing").status_code == 404

    # Dossier & assessment are mentor-only
    assert candidate.get(f"/api/sessions/{sid}/briefing").status_code == 403
    assert mentor.get(f"/api/sessions/{sid}/briefing").status_code == 200
    assert candidate.post(f"/api/sessions/{sid}/assess", json={"rating": 5, "feedbackNotes": "x"}).status_code == 403

    # Review is candidate-only, after completion
    assert mentor.post(f"/api/bookings/{sid}/complete").status_code == 200
    assert mentor.post(f"/api/bookings/{sid}/review", json={"rating": 5}).status_code == 403
    assert candidate.post(f"/api/bookings/{sid}/review", json={"rating": 4, "comment": "Helpful"}).status_code == 200
    assert mentor.post(f"/api/sessions/{sid}/assess", json={"rating": 5, "feedbackNotes": "Strong"}).status_code == 200
    assert mentor.post(f"/api/sessions/{sid}/assess", json={"rating": 5, "feedbackNotes": "Again"}).status_code == 409


def test_recordings_are_participant_only():
    if stranger is None:
        test_registration_requires_name_and_email()
    sid = candidate.get("/api/bookings").json()["data"][0]["id"]
    clean = sid.replace("sess-", "")
    assert stranger.post(f"/api/sessions/{clean}/recording", content=b"x", headers={"Content-Type": "video/webm"}).status_code == 404
    assert stranger.get(f"/api/sessions/{clean}/recording").status_code == 404
    assert anon.get(f"/api/sessions/{clean}/recording").status_code == 401
    assert candidate.get("/api/sessions/..%2F..%2Fetc/recording").status_code in (400, 404)


def test_creator_ownership():
    if stranger is None:
        test_registration_requires_name_and_email()
    assert stranger.put("/api/creators/saheli", json={"price": 199}).status_code == 403
    assert stranger.put("/api/creators/saheli/availability", json={"days": ["Mon"], "timeSlots": ["10:00 AM - 11:00 AM"]}).status_code == 403
    assert mentor.put("/api/creators/saheli", json={"price": 1299}).status_code == 200

    payload = {"name": "Test User", "role": "SDE 3", "company": "Acme", "domain": "Full-Stack", "price": 799,
               "days": ["Sat"], "timeSlots": ["10:00 AM - 11:00 AM"]}
    res = stranger.post("/api/creators/register", json=payload)
    assert res.status_code == 200, res.text
    creator_id = res.json()["data"]["id"]
    assert stranger.post("/api/creators/register", json=payload).status_code == 409
    me = stranger.get("/api/auth/me").json()["data"]
    assert me["isMentor"] is True and me["creatorId"] == creator_id
    assert stranger.put(f"/api/creators/{creator_id}", json={"price": 899}).status_code == 200


def test_candidate_profile_is_private_and_protected():
    assert candidate.get("/api/candidates/saheli").status_code == 404
    assert candidate.get("/api/candidates/prakash").status_code == 404
    before = candidate.get("/api/candidates/me").json()["data"]
    assert candidate.put("/api/candidates/me", json={"badges": [], "profileScore": 100}).status_code == 400
    res = candidate.put("/api/candidates/diya-joshi", json={"summary": "Updated", "badges": [], "profileScore": 100})
    assert res.status_code == 200
    after = res.json()["data"]
    assert after["summary"] == "Updated"
    assert after["profileScore"] == before["profileScore"] and len(after["badges"]) == len(before["badges"])


def test_admin_and_recruiter_endpoints_locked():
    assert candidate.post("/api/notifications", json={"recipientId": "all", "title": "x", "message": "y"}).status_code == 403
    assert candidate.get("/api/recruiter/candidates").status_code == 403
    assert anon.post("/api/demo/reset").status_code == 404


def test_community_identity_from_session():
    assert candidate.post("/api/community/posts", json={"mentorId": "saheli", "mentorName": "x", "mentorRole": "x", "mentorCompany": "x", "title": "t", "content": "c"}).status_code == 403
    res = mentor.post("/api/community/posts", json={"mentorId": "akash", "mentorName": "Fake", "mentorRole": "x", "mentorCompany": "x", "title": "t", "content": "c"})
    assert res.status_code == 200 and res.json()["data"]["mentorId"] == "saheli"


def test_database_rejects_double_booking():
    existing = candidate.get("/api/bookings").json()["data"]
    upcoming = next((s for s in mentor.get("/api/bookings?role=mentor").json()["data"] if s["status"] == "upcoming"), None)
    if upcoming is None:
        creator = anon.get("/api/creators/saheli").json()["data"]
        date, slot = next_slot(creator)
        # pick a slot not used by previous tests
        slot = creator["availability"]["timeSlots"][-1]
        upcoming = candidate.post("/api/payments/checkout", json={"expertId": "saheli", "date": date, "timeSlot": slot}).json()["session"]
    dup = MentorshipSession(**{**upcoming, "id": "sess-dup-test", "candidateId": "someone"})
    try:
        store.add_session(dup)
        raise AssertionError("expected SlotTakenError")
    except SlotTakenError:
        pass
    assert existing is not None


def test_logout_invalidates_session():
    client = login("arjun-reddy")
    assert client.get("/api/auth/me").status_code == 200
    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/auth/me").status_code == 401


if __name__ == "__main__":
    failures = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except AssertionError as e:
                failures += 1
                print(f"FAIL {name}: {e}")
    sys.exit(1 if failures else 0)
