import re
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, RedirectResponse

from backend.auth.deps import load_session_for, require_user
from backend.config import MAX_RESUME_MB
from backend.data.store import store
from backend.db.models import User
from backend.models.schemas import CvParseInput, GapAnalysisInput, PathwaysAnalysisInput
from backend.services.cv_service import cv_service
from backend.services.recording_storage import resume_storage
from backend.services.resume_parser import ResumeTextError, extract_text, parse_resume

router = APIRouter(prefix="/api/cv", tags=["CV"])

RESUME_TYPES = {
    ".pdf": ("application/pdf", b"%PDF"),
    ".docx": ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", b"PK"),
    ".txt": ("text/plain", b""),
}
MAX_RESUME_BYTES = MAX_RESUME_MB * 1024 * 1024


def _send_resume(key: str, file_name: str):
    """Streams a stored resume (or redirects to a short-lived S3 link)."""
    safe_name = re.sub(r"[^\w.\- ]", "_", file_name or "resume") or "resume"
    media_type = RESUME_TYPES.get(Path(safe_name).suffix.lower(), ("application/octet-stream", b""))[0]
    if not key or not resume_storage.exists(key):
        raise HTTPException(status_code=404, detail="Resume not found")
    if resume_storage.kind == "s3":
        return RedirectResponse(resume_storage.presigned_url(key, download_name=safe_name), status_code=307)
    return FileResponse(resume_storage.path(key), media_type=media_type, filename=safe_name)


@router.post("/upload")
def upload_resume(file: UploadFile = File(...), user: User = Depends(require_user)):
    """Stores the signed-in user's resume, extracts its text and returns the profile fields
    found in it. The fields are NOT saved: the client shows them in the profile form and the
    user saves the form (PUT /api/candidates/me)."""
    file_name = Path(file.filename or "").name[:150]
    ext = Path(file_name).suffix.lower()
    if ext == ".doc":
        raise HTTPException(status_code=400, detail="Old .doc files aren't supported. Please save as PDF or DOCX.")
    if ext not in RESUME_TYPES:
        raise HTTPException(status_code=400, detail="Please upload a PDF, DOCX or TXT file")

    data = file.file.read(MAX_RESUME_BYTES + 1)
    if len(data) > MAX_RESUME_BYTES:
        raise HTTPException(status_code=413, detail=f"Resume must be {MAX_RESUME_MB} MB or smaller")
    if not data:
        raise HTTPException(status_code=400, detail="The file is empty")
    content_type, magic = RESUME_TYPES[ext]
    if magic and not data.startswith(magic):
        raise HTTPException(status_code=400, detail=f"This doesn't look like a valid {ext[1:].upper()} file")

    try:
        text = extract_text(data, ext)
    except ResumeTextError:
        text = ""
    extracted = parse_resume(text) if text.strip() else {}

    profile = store.get_candidate(user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Candidate not found")

    key = f"{user.id}/{uuid.uuid4().hex}{ext}"
    try:
        resume_storage.save(key, data, content_type)
    except Exception as e:
        print(f"[Resume] Save failed for {user.id}: {e}")
        raise HTTPException(status_code=500, detail="Could not save the resume. Please try again.")

    updated_at = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    resume_updates = {"resumeFileName": file_name, "resumeUpdatedAt": updated_at, "resumeFileKey": key}
    # The account's own phone/email are verified identity; only fill the phone if none is set
    if extracted.get("phone") and not profile.phone:
        resume_updates["phone"] = extracted["phone"]
    store.update_candidate(user.id, resume_updates)

    if profile.resumeFileKey and profile.resumeFileKey != key:
        try:
            resume_storage.delete(profile.resumeFileKey)
        except Exception as e:
            print(f"[Resume] Could not delete previous resume of {user.id}: {e}")

    return {
        "success": True,
        "data": {
            "resume": {"fileName": file_name, "updatedAt": updated_at},
            "textFound": bool(text.strip()),
            "extracted": extracted,
        },
    }


@router.get("/resume")
def download_own_resume(user: User = Depends(require_user)):
    profile = store.get_candidate(user.id)
    if not profile or not profile.resumeFileKey:
        raise HTTPException(status_code=404, detail="Resume not found")
    return _send_resume(profile.resumeFileKey, profile.resumeFileName)


@router.delete("/resume")
def delete_own_resume(user: User = Depends(require_user)):
    profile = store.get_candidate(user.id)
    if profile and profile.resumeFileKey:
        try:
            resume_storage.delete(profile.resumeFileKey)
        except Exception as e:
            print(f"[Resume] Could not delete resume of {user.id}: {e}")
    store.update_candidate(user.id, {"resumeFileName": None, "resumeUpdatedAt": None, "resumeFileKey": None})
    return {"success": True}


@router.get("/sessions/{session_id}/candidate-resume")
def download_session_candidate_resume(session_id: str, user: User = Depends(require_user)):
    """The mentor of a booked session can download that candidate's resume."""
    session = load_session_for(session_id, user, allow="mentor")
    profile = store.get_candidate(session.candidateId)
    if not profile or not profile.resumeFileKey:
        raise HTTPException(status_code=404, detail="This candidate hasn't uploaded a resume")
    return _send_resume(profile.resumeFileKey, profile.resumeFileName)

@router.post("/parse")
def parse_cv(payload: CvParseInput):
    try:
        data = cv_service.parse_cv(payload.cvText, payload.metadata)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/gap-analysis")
def gap_analysis(payload: GapAnalysisInput):
    try:
        data = cv_service.perform_gap_analysis(
            domain_key=payload.domain or 'full-stack',
            candidate_skills=payload.skills or [],
            candidate_role=payload.currentRole or 'Senior Frontend Engineer',
            current_ctc=payload.currentCtc or '₹7.5 LPA',
            current_company=payload.currentCompany,
            target_company=payload.targetCompany
        )
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pathways-analysis")
def pathways_analysis(payload: PathwaysAnalysisInput):
    try:
        domains = ['full-stack', 'ai/ml', 'semiconductor', 'cybersecurity', 'product-management', 'search-data-infra']
        results = {}
        for d in domains:
            analysis = cv_service.perform_gap_analysis(
                domain_key=d,
                candidate_skills=payload.skills or [],
                candidate_role=payload.currentRole or 'Senior Frontend Engineer',
                current_ctc=payload.currentCtc or '₹7.5 LPA',
                current_company=payload.currentCompany,
                target_company=payload.targetCompany
            )
            results[d] = analysis
        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
