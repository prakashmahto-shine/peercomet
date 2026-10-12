from fastapi import APIRouter, HTTPException
from backend.config import DEMO_MODE
from backend.services.analytics_service import analytics_service
from backend.data.store import store
from backend.services.milvus_service import milvus_service

router = APIRouter(tags=["Analytics & Demo"])

@router.get("/api/analytics/metrics")
def get_metrics():
    try:
        return analytics_service.get_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/demo/reset")
def reset_demo():
    # Wipes all data: only available when DEMO_MODE=true (never in production)
    if not DEMO_MODE:
        raise HTTPException(status_code=404, detail="Not found")
    try:
        store.reset_to_default()
        # Re-sync milvus index
        creators = store.get_creators()
        milvus_service.sync_creators(creators)
        return {
            "success": True,
            "message": "Demo database and Milvus vector collection reset to initial state.",
            "creatorsCount": len(creators)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
