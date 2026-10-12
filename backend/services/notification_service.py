import time
from typing import List, Optional
from backend.data.store import store
from backend.models.schemas import CommunityNotification, NotificationSendInput

class NotificationService:
    def get_user_notifications(self, user_id: Optional[str] = None, unread_only: bool = False) -> List[CommunityNotification]:
        return store.get_notifications(user_id=user_id, unread_only=unread_only)

    def get_unread_count(self, user_id: Optional[str] = None) -> int:
        return store.get_unread_notification_count(user_id=user_id)

    def send_notification(self, payload: NotificationSendInput) -> CommunityNotification:
        notif_id = f"notif-{int(time.time() * 1000)}"
        notif = CommunityNotification(
            id=notif_id,
            recipientId=payload.recipientId,
            type=payload.type or 'system_announcement',
            title=payload.title,
            message=payload.message,
            mentorId=payload.mentorId,
            mentorName=payload.mentorName,
            mentorAvatar=payload.mentorAvatar,
            actorId=payload.actorId,
            actorName=payload.actorName,
            actorAvatar=payload.actorAvatar,
            postId=payload.postId,
            sessionId=payload.sessionId,
            createdAt=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            isRead=False,
            actionUrl=payload.actionUrl or (f"/community#{payload.postId}" if payload.postId else None)
        )
        created = store.create_notification(notif)
        try:
            import asyncio
            from backend.services.socket_service import send_user_notification
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(send_user_notification(payload.recipientId, created.model_dump()))
        except Exception:
            pass
        return created

    def mark_as_read(self, notification_id: str) -> Optional[CommunityNotification]:
        return store.mark_notification_as_read(notification_id)

    def mark_all_as_read(self, user_id: str) -> int:
        return store.mark_all_notifications_as_read(user_id)

    def delete_notification(self, notification_id: str) -> bool:
        return store.delete_notification(notification_id)

    def clear_all(self, user_id: Optional[str] = None) -> int:
        return store.clear_all_notifications(user_id)

notification_service = NotificationService()
