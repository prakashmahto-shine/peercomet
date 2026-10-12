from fastapi import APIRouter, HTTPException
from backend.models.schemas import AssessmentSubmitPayload
from backend.services.assessment_service import assessment_service, AssessmentConflictError

router = APIRouter(tags=["Assessment & Briefing"])

@router.get("/api/creator/sessions/{session_id}/briefing")
@router.get("/api/sessions/{session_id}/briefing")
def get_session_briefing(session_id: str):
    try:
        dossier = assessment_service.get_zero_prep_dossier(session_id)
        return {"success": True, "data": dossier}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/sessions/{session_id}/assess")
@router.post("/api/creator/sessions/{session_id}/assess")
def submit_assessment(session_id: str, payload: AssessmentSubmitPayload):
    try:
        result = assessment_service.submit_assessment(session_id, payload)
        return {"success": True, "data": result}
    except AssessmentConflictError as ce:
        raise HTTPException(status_code=409, detail=str(ce))
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
