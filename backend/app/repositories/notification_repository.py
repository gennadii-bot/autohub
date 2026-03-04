"""Notification repository."""

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification


class NotificationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: int,
        title: str,
        message: str | None = None,
        notif_type: str = "general",
    ) -> Notification:
        n = Notification(user_id=user_id, title=title, message=message, type=notif_type)
        self.db.add(n)
        await self.db.flush()
        await self.db.refresh(n)
        return n

    async def count_unread(self, user_id: int) -> int:
        """Count unread notifications for user."""
        result = await self.db.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
        )
        return result.scalar() or 0

    async def get_by_user_id(
        self,
        user_id: int,
        *,
        limit: int = 50,
        unread_only: bool = False,
    ) -> list[Notification]:
        """Get notifications for user, newest first."""
        stmt = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            stmt = stmt.where(Notification.is_read == False)
        stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().unique().all())

    async def mark_read(self, notification_id: int, user_id: int) -> bool:
        """Mark notification as read. Returns True if updated."""
        result = await self.db.execute(
            update(Notification)
            .where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
            .values(is_read=True)
        )
        return result.rowcount > 0

    async def mark_all_read(self, user_id: int) -> int:
        """Mark all notifications for user as read. Returns count."""
        result = await self.db.execute(
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
            .values(is_read=True)
        )
        return result.rowcount or 0

    async def mark_chat_notifications_read(self, user_id: int) -> int:
        """Mark all chat-type notifications for user as read. Returns count."""
        result = await self.db.execute(
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.type == "chat",
                Notification.is_read == False,
            )
            .values(is_read=True)
        )
        return result.rowcount or 0
