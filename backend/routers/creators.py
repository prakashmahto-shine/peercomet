from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend.models.schemas import CreatorRegisterInput, AvailabilityUpdateInput, CreatorUpdateInput
from backend.services.creator_service import creator_service

router = APIRouter(prefix="/api/creators", tags=["Creators"])

@router.get("")
def get_creators(domain: Optional[str] = None, q: Optional[str] = None):
    try:
        creators = creator_service.get_all(domain=domain, query=q)
        return {"success": True, "count": len(creators), "data": creators}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{creator_id}")
def get_creator_by_id(creator_id: str):
    try:
        creator = creator_service.get_by_id(creator_id)
        if not creator:
            raise HTTPException(status_code=404, detail=f"Creator with ID {creator_id} not found")
        return {"success": True, "data": creator}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/register")
def register_creator(payload: CreatorRegisterInput):
    try:
        created = creator_service.register(payload)
        return {"success": True, "data": created}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{creator_id}/availability")
def update_availability(creator_id: str, payload: AvailabilityUpdateInput):
    try:
        updated = creator_service.update_availability(creator_id, payload.days, payload.timeSlots)
        if not updated:
            raise HTTPException(status_code=404, detail="Creator not found")
        return {"success": True, "data": updated}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{creator_id}")
def update_creator(creator_id: str, payload: CreatorUpdateInput):
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No updatable fields provided")
    try:
        updated = creator_service.update_profile(creator_id, updates)
    except Exception as e:
        print(f"[Creators] Update error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    if not updated:
        raise HTTPException(status_code=404, detail="Creator not found")
    return {"success": True, "data": updated}
