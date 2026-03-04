"""Notifications API."""

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_notification_repository, get_current_user
from app.repositories.notification_repository import NotificationRepository

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/unread/count")
async def get_unread_count(
    user: dict = Depends(get_current_user),
    notif_repo: NotificationRepository = Depends(get_notification_repository),
):
    """Get count of unread notifications for badge."""
    count = await notif_repo.count_unread(user["id"])
    return {"count": count}


@router.patch("/mark-all-read")
async def mark_all_read(
    user: dict = Depends(get_current_user),
    notif_repo: NotificationRepository = Depends(get_notification_repository),
):
    """Mark all notifications as read when user opens the dropdown. Badge disappears immediately."""
    count = await notif_repo.mark_all_read(user["id"])
    return {"marked": count}


@router.get("")
async def get_notifications(
    user: dict = Depends(get_current_user),
    notif_repo: NotificationRepository = Depends(get_notification_repository),
    limit: int = Query(50, ge=1, le=100),
    unread_only: bool = Query(False),
):
    """Get user notifications."""
    notifs = await notif_repo.get_by_user_id(
        user["id"],
        limit=limit,
        unread_only=unread_only,
    )
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": getattr(n, "type", "general"),
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifs
    ]
