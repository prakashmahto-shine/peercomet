"""
End-to-end API tests for email-code login, sessions, ownership checks and resume upload.
Runs against a throwaway SQLite database (and temp file storage) seeded with the demo data.

    python3 -m pytest tests/ -q        (or: python3 tests/test_auth_and_ownership.py)
"""
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Keep uploaded files out of the repo (must be set before backend.config is imported)
_tmp_dir = tempfile.mkdtemp()
os.environ.setdefault("RESUMES_DIR", f"{_tmp_dir}/resumes")
os.environ["APP_ENV"] = "development"
os.environ["EMAIL_BACKEND"] = "console"

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.db import engine as db_engine

db_engine.configure(f"sqlite:///{_tmp_dir}/test.sqlite3")

from backend.db.seed import run_migrations, seed_demo_data  # noqa: E402
from backend.routers import (  # noqa: E402
    auth_router, bookings_router, assessment_router, creators_router, candidates_router,
    notifications_router, recruiter_router, analytics_router, community_router, sessions_router, cv_router,
)
from backend.data.store import store, SlotTakenError  # noqa: E402
from backend.models.schemas import MentorshipSession  # noqa: E402

run_migrations()
seed_demo_data()

app = FastAPI()
for r in (auth_router, creators_router, bookings_router, assessment_router, candidates_router,
          notifications_router, recruiter_router, analytics_router, community_router, sessions_router, cv_router):
    app.include_router(r)

# Local development sends no email: the code is always DEV_OTP_CODE
OTP = os.getenv("DEV_OTP_CODE", "123456")


def login(identifier: str, name=None, mobile=None) -> TestClient:
    """Signs in with an email (or a seeded demo user id); `name` signs up a new email."""
    client = TestClient(app)
    res = client.post("/api/auth/otp/send", json={"email": identifier})
    assert res.status_code == 200, res.text
    body = {"requestId": res.json()["requestId"], "email": identifier, "otp": OTP}
    if name:
        body.update(name=name, mobile=mobile)
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


def test_signup_requires_name():
    global stranger
    client = TestClient(app)
    req = client.post("/api/auth/otp/send", json={"email": "Test.User@Example.com"}).json()
    assert req["isRegistered"] is False
    # OTP verification creates the account without requiring name upfront;
    # name and details are then filled in via the registration form (/register).
    res = client.post("/api/auth/otp/verify", json={"requestId": req["requestId"], "email": "test.user@example.com", "otp": OTP})
    assert res.status_code == 200, res.text
    stranger = client
    me = stranger.get("/api/auth/me").json()["data"]
    assert me["id"].startswith("u_") and me["isMentor"] is False
    assert me["email"] == "test.user@example.com"

    # User fills in registration profile (PUT /api/candidates/me)
    reg = stranger.put("/api/candidates/me", json={
        "firstName": "Test", "lastName": "User", "totalExperienceYears": 2, "location": "Bengaluru"
    })
    assert reg.status_code == 200, reg.text
    assert stranger.get("/api/candidates/me").json()["data"]["name"] == "Test User"
    assert stranger.get("/api/auth/me").json()["data"]["name"] == "Test User"


def test_existing_email_signs_in_same_account():
    if stranger is None:
        test_signup_requires_name()
    first = stranger.get("/api/auth/me").json()["data"]["id"]
    again = login("TEST.USER@example.com")          # case-insensitive, no name needed
    assert again.get("/api/auth/me").json()["data"]["id"] == first


def test_code_is_single_use_and_expires():
    client = TestClient(app)
    req = client.post("/api/auth/otp/send", json={"email": "single@example.com"}).json()
    body = {"requestId": req["requestId"], "email": "single@example.com", "otp": OTP, "name": "Single Use"}
    assert client.post("/api/auth/otp/verify", json=body).status_code == 200
    assert client.post("/api/auth/otp/verify", json=body).status_code == 410
    # A code for one email can't be used for another
    req = client.post("/api/auth/otp/send", json={"email": "single@example.com"}).json()
    assert client.post("/api/auth/otp/verify", json={**body, "requestId": req["requestId"], "email": "other@example.com"}).status_code == 410
    # Expired code
    from datetime import datetime, timedelta
    from sqlalchemy import update
    from backend.db import models as m
    from backend.db.engine import db_session
    req = client.post("/api/auth/otp/send", json={"email": "single@example.com"}).json()
    with db_session() as db:
        db.execute(update(m.EmailOtp).where(m.EmailOtp.id == req["requestId"]).values(expires_at=datetime.utcnow() - timedelta(minutes=1)))
    assert client.post("/api/auth/otp/verify", json={**body, "requestId": req["requestId"]}).status_code == 410


def test_bad_inputs_and_wrong_otp():
    client = TestClient(app)
    assert client.post("/api/auth/otp/send", json={"email": "not-an-email"}).status_code == 400
    req = client.post("/api/auth/otp/send", json={"email": "wrong@example.com"}).json()
    body = {"requestId": req["requestId"], "email": "wrong@example.com", "otp": "000000", "name": "Wrong Code"}
    assert client.post("/api/auth/otp/verify", json=body).status_code == 401
    for _ in range(5):
        client.post("/api/auth/otp/verify", json=body)
    assert client.post("/api/auth/otp/verify", json={**body, "otp": OTP}).status_code == 429
    req = client.post("/api/auth/otp/send", json={"email": "badmobile@example.com"}).json()
    res = client.post("/api/auth/otp/verify", json={"requestId": req["requestId"], "email": "badmobile@example.com",
                                                   "otp": OTP, "name": "Bad Mobile", "mobile": "12345"})
    assert res.status_code == 400


def test_otp_send_rate_limited():
    client = TestClient(app)
    codes = [client.post("/api/auth/otp/send", json={"email": "ratelimit@example.com"}).status_code for _ in range(6)]
    assert codes[:5] == [200] * 5 and codes[5] == 429


def test_unauthenticated_requests_rejected():
    assert anon.get("/api/bookings").status_code == 401
    assert anon.get("/api/auth/me").status_code == 401
    assert anon.post("/api/payments/checkout", json={"expertId": "saheli", "date": "x", "timeSlot": "y"}).status_code == 401
    assert anon.get("/api/notifications").status_code == 401


def test_booking_lifecycle_and_ownership():
    if stranger is None:
        test_signup_requires_name()
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
        test_signup_requires_name()
    sid = candidate.get("/api/bookings").json()["data"][0]["id"]
    clean = sid.replace("sess-", "")
    assert stranger.post(f"/api/sessions/{clean}/recording", content=b"x", headers={"Content-Type": "video/webm"}).status_code == 404
    assert stranger.get(f"/api/sessions/{clean}/recording").status_code == 404
    assert anon.get(f"/api/sessions/{clean}/recording").status_code == 401
    assert candidate.get("/api/sessions/..%2F..%2Fetc/recording").status_code in (400, 404)


def test_creator_ownership():
    if stranger is None:
        test_signup_requires_name()
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



# ----------------------------------------------------------------------------- resume upload
RESUME_TEXT = """ANITA RAO
Product Analyst | Pune
anita.rao@example.com | +91 91234 56789 | linkedin.com/in/anita-rao

SUMMARY
Product analyst with 3 years of experience in SQL, Tableau and A/B Testing for consumer apps.

WORK EXPERIENCE
Product Analyst at Flipkart          Jul 2022 - Present
Data Analyst | Mu Sigma          Jun 2021 - Jun 2022

EDUCATION
MBA, Indian Institute of Management, Indore, 2021
B.Com, Delhi University, 2018

Current CTC: 14 LPA  Expected CTC: 22 LPA
Notice Period: 30 days
"""


def _docx_bytes(text: str) -> bytes:
    import io
    import docx
    document = docx.Document()
    for line in text.splitlines():
        document.add_paragraph(line)
    buf = io.BytesIO()
    document.save(buf)
    return buf.getvalue()


def _pdf_bytes(lines) -> bytes:
    """Minimal single-page PDF with real text objects (readable by pypdf)."""
    stream = "BT /F1 11 Tf 50 780 Td 14 TL " + " ".join(
        "(" + l.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)") + ") '" for l in lines
    ) + " ET"
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out, offsets = "%PDF-1.4\n", []
    for i, obj in enumerate(objects, 1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n{obj}\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n" + "".join(f"{o:010d} 00000 n \n" for o in offsets)
    out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF"
    return out.encode("latin-1")


def _book_any_free_slot(client, creator_id: str) -> str:
    from datetime import datetime, timedelta
    creator = anon.get(f"/api/creators/{creator_id}").json()["data"]
    days, slots = creator["availability"]["days"], creator["availability"]["timeSlots"]
    for i in range(1, 30):
        d = datetime.now() + timedelta(days=i)
        if d.strftime("%a") not in days:
            continue
        for slot in slots:
            res = client.post("/api/payments/checkout", json={
                "expertId": creator_id, "date": f"{d.strftime('%a')}, {d.day} {d.strftime('%b %Y')}", "timeSlot": slot})
            if res.status_code == 200:
                return res.json()["session"]["id"]
    raise AssertionError("no free slot found")


def _upload(client, name, data, ctype="application/octet-stream"):
    return client.post("/api/cv/upload", files={"file": (name, data, ctype)})


def test_resume_upload_extracts_fields_without_saving_them():
    client = login("resume.user@example.com", name="Resume User")
    docx_data = _docx_bytes(RESUME_TEXT)
    res = _upload(client, "Anita_Rao.docx", docx_data)
    assert res.status_code == 200, res.text
    body = res.json()["data"]
    ex = body["extracted"]
    assert body["textFound"] is True and body["resume"]["fileName"] == "Anita_Rao.docx"
    assert (ex["firstName"], ex["lastName"]) == ("Anita", "Rao")
    assert ex["totalExperienceYears"] == 3 and ex["currentCompany"] == "Flipkart"
    assert ex["currentDesignation"] == "Product Analyst" and ex["currentCtcLpa"] == 14.0
    assert ex["expectedCtcLpa"] == 22.0 and ex["noticePeriod"] == "30 days"
    assert ex["highestQualification"] == "MBA" and "Indian Institute of Management" in ex["educationCollege"]
    assert {"SQL", "Tableau", "A/B Testing"} <= set(ex["skills"]) and ex["location"] == "Pune"
    profile = client.get("/api/candidates/me").json()["data"]
    # The file is recorded; the extracted fields are only saved when the user saves the form
    assert profile["resumeFileName"] == "Anita_Rao.docx" and profile["resumeUpdatedAt"]
    assert profile["name"] == "Resume User" and not profile.get("currentCompany")
    assert profile["phone"] == "9123456789"  # filled because the account had no phone
    # Own download returns the exact uploaded file
    download = client.get("/api/cv/resume")
    assert download.status_code == 200 and download.content == docx_data


def test_resume_pdf_and_txt_and_rejections():
    client = login("pdf.user@example.com", name="Pdf User")
    res = _upload(client, "cv.pdf", _pdf_bytes(RESUME_TEXT.splitlines()), "application/pdf")
    assert res.status_code == 200, res.text
    assert res.json()["data"]["extracted"]["firstName"] == "Anita"
    assert _upload(client, "cv.txt", RESUME_TEXT.encode()).json()["data"]["extracted"]["currentCtcLpa"] == 14.0
    assert _upload(client, "cv.doc", b"\xd0\xcf\x11\xe0").status_code == 400          # old Word format
    assert _upload(client, "cv.exe", b"MZ").status_code == 400
    assert _upload(client, "fake.pdf", b"not a pdf").status_code == 400                  # content check
    assert _upload(client, "big.txt", b"x" * (5 * 1024 * 1024 + 1)).status_code == 413
    assert _upload(client, "empty.txt", b"").status_code == 400
    # Scanned/blank PDF: stored, but nothing extracted (no made-up values)
    blank = _upload(client, "scan.pdf", _pdf_bytes([]), "application/pdf").json()["data"]
    assert blank["textFound"] is False and blank["extracted"] == {}


def test_profile_save_validates_and_derives_display_fields():
    client = login("form.user@example.com", name="Form User")
    res = client.put("/api/candidates/me", json={
        "firstName": "Anita", "lastName": "Rao", "totalExperienceYears": 3, "totalExperienceMonths": 6,
        "currentCtcLpa": 14, "expectedCtcLpa": 22.5, "dateOfBirth": "1998-08-14", "designation": "Product Analyst",
        "currentCompany": "Flipkart", "noticePeriod": "30 days", "graduationYear": 2021,
        "linkedinUrl": "https://linkedin.com/in/anita-rao", "summary": "Hi",
    })
    assert res.status_code == 200, res.text
    p = res.json()["data"]
    assert p["name"] == "Anita Rao" and p["experienceYears"] == "3 years 6 months"
    assert p["currentCtc"] == "14 LPA" and p["expectedCtc"] == "22.5 LPA"
    assert client.get("/api/auth/me").json()["data"]["name"] == "Anita Rao"
    assert client.put("/api/candidates/me", json={"totalExperienceYears": "lots"}).status_code == 422
    assert client.put("/api/candidates/me", json={"dateOfBirth": "14/08/1998"}).status_code == 422
    assert client.put("/api/candidates/me", json={"resumeFileName": "x.pdf", "resumeFileKey": "../x"}).status_code == 400


def test_resume_access_is_owner_or_session_mentor():
    owner = login("res.owner@example.com", name="Res Owner")
    _upload(owner, "owner.txt", RESUME_TEXT.encode())
    stranger_client = login("res.stranger@example.com", name="Res Stranger")
    assert stranger_client.get("/api/cv/resume").status_code == 404      # has none of their own
    assert anon.get("/api/cv/resume").status_code == 401
    sid = _book_any_free_slot(owner, "saheli")
    assert mentor.get(f"/api/cv/sessions/{sid}/candidate-resume").status_code == 200
    # The mentor's dossier works for a brand-new profile (no experience filled in) and flags the resume
    briefing = mentor.get(f"/api/sessions/{sid}/briefing")
    assert briefing.status_code == 200, briefing.text
    assert briefing.json()["data"]["candidate"]["resumeFileName"] == "owner.txt"
    assert stranger_client.get(f"/api/cv/sessions/{sid}/candidate-resume").status_code == 404
    assert owner.get(f"/api/cv/sessions/{sid}/candidate-resume").status_code == 403   # candidate isn't the mentor
    assert owner.delete("/api/cv/resume").status_code == 200
    assert mentor.get(f"/api/cv/sessions/{sid}/candidate-resume").status_code == 404

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
