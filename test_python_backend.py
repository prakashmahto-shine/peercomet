import sys
import time
from datetime import datetime, timedelta
import requests
from backend.models.schemas import CandidateTrajectoryInput, GapAnalysisInput, RecruiterMatchInput

BASE_URL = "http://127.0.0.1:5001"

def test_backend():
    print("==================================================")
    print("🧪 Testing Shine Peerpath Python Backend & Milvus")
    print("==================================================")

    # 1. Health
    print("1. Checking Health endpoint...")
    res = requests.get(f"{BASE_URL}/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health_data = res.json()
    print("   ✅ Health OK:", health_data)

    # 2. Creators
    print("\n2. Checking Creators API...")
    res = requests.get(f"{BASE_URL}/api/creators?domain=AI/ML")
    assert res.status_code == 200, f"Get creators failed: {res.text}"
    creators = res.json().get("data", [])
    print(f"   ✅ Fetched {len(creators)} AI/ML creators.")
    assert len(creators) > 0, "No creators returned"
    first_creator_id = creators[0]["id"]

    # 3. Trajectory Matching with Milvus
    print("\n3. Testing Trajectory Matching Engine with Milvus...")
    payload = {
        "currentRole": "Senior Frontend Engineer",
        "currentCompany": "Mid-tier Service Firm",
        "currentExperience": "4 Years",
        "currentSalary": "₹8 LPA",
        "targetRole": "Lead UI & Micro-Frontend Architect",
        "targetPackage": "Up to ₹36L",
        "targetCompany": "Swiggy",
        "domain": "Full-Stack",
        "skills": ["React.js", "JavaScript", "TypeScript", "Redux"]
    }
    res = requests.post(f"{BASE_URL}/api/trajectory/match", json=payload)
    assert res.status_code == 200, f"Trajectory match failed: {res.text}"
    match_data = res.json()
    matches = match_data.get("data", [])
    print(f"   ✅ Milvus Trajectory Match count: {len(matches)}")
    if matches:
        top_match = matches[0]
        print(f"   🎯 Top Mentor Twin: {top_match['creator']['name']} ({top_match['creator']['role']} @ {top_match['creator']['company']})")
        print(f"      Score: {top_match['trajectorySimilarityScore']}% | Match Type: {top_match['matchType']}")
        print(f"      Delta: {top_match['jumpDelta']}")

    # 4. CV Parse & Gap Analysis
    print("\n4. Testing CV Gap Analysis...")
    res = requests.post(f"{BASE_URL}/api/cv/gap-analysis", json={
        "domain": "ai/ml",
        "skills": ["Python", "SQL", "FastAPI"],
        "currentRole": "Backend Developer",
        "currentCtc": "₹8 LPA",
        "targetCompany": "Swiggy"
    })
    assert res.status_code == 200, f"Gap analysis failed: {res.text}"
    gap = res.json().get("data", {})
    print(f"   ✅ Gap Analysis Target: {gap.get('targetRole')} ({gap.get('targetDomain')})")
    print(f"      Current Score: {gap.get('currentScore')}% -> Target Score: {gap.get('targetScore')}%")
    print(f"      Missing Boosters: {gap.get('missingBoosterSkills')}")

    # 5. Candidate Profile
    print("\n5. Testing Candidate Profile API...")
    res = requests.get(f"{BASE_URL}/api/candidates/prakash-mahto")
    assert res.status_code == 200, f"Get candidate failed: {res.text}"
    cand = res.json().get("data", {})
    print(f"   ✅ Candidate Loaded: {cand.get('name')} | Profile Score: {cand.get('profileScore')}%")

    # 6. Bookings & Checkout
    print("\n6. Testing Booking & Checkout Flow...")
    # Book the first slot the mentor actually offers, on the next matching weekday
    availability = creators[0].get("availability") or {}
    slot = (availability.get("timeSlots") or ["07:00 PM - 08:00 PM"])[0]
    days = availability.get("days") or []
    booking_day = next(
        d for d in (datetime.now() + timedelta(days=i) for i in range(1, 15))
        if not days or d.strftime("%a") in days
    )
    checkout_payload = {
        "expertId": first_creator_id,
        "candidateId": "prakash-mahto",
        "candidateName": "Prakash Mahto",
        "candidateRole": "Senior Frontend Engineer",
        "candidateGoal": "Transition Strategy to Lead Architect",
        "date": f"{booking_day.strftime('%a')}, {booking_day.day} {booking_day.strftime('%b %Y')}",
        "timeSlot": slot,
        "sessionType": "career-guidance",
        "paymentMethod": "upi",
        "upiId": "prakash@okhdfcbank"
    }
    res = requests.post(f"{BASE_URL}/api/payments/checkout", json=checkout_payload)
    assert res.status_code == 200, f"Checkout failed: {res.text}"
    checkout_res = res.json()
    session = checkout_res.get("session", {})
    session_id = session.get("id")
    print(f"   ✅ Session booked successfully! ID: {session_id}")

    # 7. Zero-Prep Dossier & Assessment
    print("\n7. Testing Zero-Prep Dossier & Assessment...")
    res = requests.get(f"{BASE_URL}/api/creator/sessions/{session_id}/briefing")
    assert res.status_code == 200, f"Dossier failed: {res.text}"
    dossier = res.json().get("data", {})
    print(f"   ✅ Zero-Prep Dossier generated with {len(dossier.get('recommendedAssessmentRubric', []))} rubrics.")

    res = requests.post(f"{BASE_URL}/api/sessions/{session_id}/assess", json={
        "rating": 5.0,
        "feedbackNotes": "Exceptional architectural clarity on distributed systems and micro-frontends.",
        "badgeTitle": "AI & Distributed Systems Peer-Verified",
        "skillsVerified": ["Micro-Frontends", "Distributed Systems", "LangChain"]
    })
    assert res.status_code == 200, f"Assessment failed: {res.text}"
    assessment_res = res.json().get("data", {})
    print(f"   ✅ Assessment submitted! Awarded Badge: {assessment_res.get('badge', {}).get('title')}")
    print(f"      Hash: {assessment_res.get('badge', {}).get('verificationHash')}")

    # 8. Recruiter Search
    print("\n8. Testing Recruiter Neural Candidate Search...")
    res = requests.get(f"{BASE_URL}/api/recruiter/candidates?peer_verified_only=true")
    assert res.status_code == 200, f"Recruiter search failed: {res.text}"
    recruiter_data = res.json().get("data", {})
    print(f"   ✅ Recruiter Search: {recruiter_data.get('peerVerifiedCount')} peer-verified candidates surfaced.")

    # 9. Analytics
    print("\n9. Testing Analytics KPI Metrics...")
    res = requests.get(f"{BASE_URL}/api/analytics/metrics")
    assert res.status_code == 200, f"Analytics failed: {res.text}"
    metrics = res.json()
    print(f"   ✅ Analytics KPIs loaded: {len(metrics.get('keyHackathonMetrics', []))} core metrics.")

    # 10. Jobs
    print("\n10. Testing Jobs API...")
    res = requests.get(f"{BASE_URL}/api/jobs?domain=Full-Stack")
    assert res.status_code == 200, f"Jobs failed: {res.text}"
    jobs = res.json().get("data", [])
    print(f"   ✅ Fetched {len(jobs)} verified jobs.")

    print("\n==================================================")
    print("🎉 ALL 10 TEST SUITES PASSED FLAWLESSLY WITH PYTHON & MILVUS!")
    print("==================================================")

if __name__ == "__main__":
    test_backend()
