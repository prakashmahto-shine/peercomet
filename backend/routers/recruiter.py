from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from backend.auth.deps import require_recruiter
from backend.models.schemas import RecruiterMatchInput, RecruiterInviteInput
from backend.services.recruiter_service import recruiter_service

# Candidate search exposes candidate profiles: recruiters/admins only (RECRUITER_USER_IDS, ADMIN_USER_IDS)
router = APIRouter(prefix="/api/recruiter", tags=["Recruiter"])

@router.post("/match")
def match_recruiter_candidates(payload: RecruiterMatchInput):
    try:
        matches = recruiter_service.match_candidates_to_role(payload)
        return {
            "success": True,
            "data": {
                "roleTitle": payload.roleTitle,
                "requiredSkills": payload.requiredSkills,
                "embeddingProvider": "SentenceTransformers (all-MiniLM-L6-v2) + Milvus Vector Engine",
                "matches": matches
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/candidates", dependencies=[Depends(require_recruiter)])
def search_candidates(
    domain: Optional[str] = None,
    q: Optional[str] = None,
    peer_verified_only: Optional[bool] = Query(default=False),
    min_score: Optional[int] = Query(default=None)
):
    try:
        data = recruiter_service.search_candidates(
            domain=domain,
            query=q,
            peer_verified_only=bool(peer_verified_only),
            min_score=min_score
        )
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/invite", dependencies=[Depends(require_recruiter)])
def send_interview_invite(payload: RecruiterInviteInput):
    try:
        result = recruiter_service.send_interview_invite(
            candidate_id=payload.candidateId,
            recruiter_name=payload.recruiterName or 'Senior Tech Recruiter',
            company=payload.company,
            role_title=payload.roleTitle,
            message=payload.message
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
