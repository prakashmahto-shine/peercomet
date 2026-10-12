from fastapi import APIRouter, HTTPException
from backend.models.schemas import CandidateTrajectoryInput
from backend.services.trajectory_service import trajectory_service
from backend.services.mentor_match_taxonomy import is_supported_domain, SUPPORTED_DOMAINS
from backend.config import BRAND_NAME

router = APIRouter(prefix="/api/trajectory", tags=["Trajectory"])

@router.post("/match")
def match_trajectories(payload: CandidateTrajectoryInput):
    try:
        matches = trajectory_service.match_trajectories(payload)
        supported = not payload.domain or is_supported_domain(payload.domain)
        message = None if supported else f"{BRAND_NAME} doesn't have mentors for \"{payload.domain}\" yet — currently live for {', '.join(SUPPORTED_DOMAINS)}."

        return {
            "success": True,
            "count": len(matches),
            "supportedDomain": supported,
            "message": message,
            "data": matches
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/creators/{creator_id}")
def get_trajectory_details(creator_id: str):
    try:
        details = trajectory_service.get_trajectory_details(creator_id)
        if not details:
            raise HTTPException(status_code=404, detail="Creator not found")
        return {"success": True, "data": details}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
