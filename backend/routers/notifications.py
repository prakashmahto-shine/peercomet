from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from backend.auth.deps import require_admin, require_user
from backend.data.store import store
from backend.db.models import User
from backend.models.schemas import NotificationSendInput
from backend.services.notification_service import notification_service

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

# All endpoints act on the signed-in user's notifications; any userId sent by the client is ignored.

def _require_own_notification(notification_id: str, user: User):
    exists, recipient = store.get_notification_recipient(notification_id)
    if not exists or (recipient or '').lower() != user.id.lower():
        raise HTTPException(status_code=404, detail=f"Notification {notification_id} not found")

@router.get("")
def get_notifications(unreadOnly: Optional[bool] = False, user: User = Depends(require_user)):
    notifs = notification_service.get_user_notifications(user_id=user.id, unread_only=unreadOnly or False)
    unread_count = notification_service.get_unread_count(user_id=user.id)
    return {"success": True, "data": notifs, "meta": {"total": len(notifs), "unreadCount": unread_count}}

@router.get("/unread-count")
def get_unread_count(user: User = Depends(require_user)):
    return {"success": True, "data": {"unreadCount": notification_service.get_unread_count(user_id=user.id)}}

@router.post("")
def send_notification(payload: NotificationSendInput, admin: User = Depends(require_admin)):
    created = notification_service.send_notification(payload)
    return {"success": True, "message": "Notification sent successfully", "data": created}

@router.patch("/{notification_id}/read")
def mark_as_read(notification_id: str, user: User = Depends(require_user)):
    _require_own_notification(notification_id, user)
    updated = notification_service.mark_as_read(notification_id)
    return {"success": True, "message": "Notification marked as read", "data": updated}

@router.post("/mark-all-read")
def mark_all_as_read(user: User = Depends(require_user)):
    count = notification_service.mark_all_as_read(user.id)
    return {"success": True, "message": f"{count} notifications marked as read", "data": {"markedCount": count}}

@router.post("/clear-all")
@router.delete("")
def clear_all_notifications(user: User = Depends(require_user)):
    cleared = notification_service.clear_all(user.id)
    return {"success": True, "message": f"{cleared} notifications cleared", "data": {"clearedCount": cleared}}

@router.delete("/{notification_id}")
def delete_notification(notification_id: str, user: User = Depends(require_user)):
    _require_own_notification(notification_id, user)
    notification_service.delete_notification(notification_id)
    return {"success": True, "message": "Notification deleted successfully"}
