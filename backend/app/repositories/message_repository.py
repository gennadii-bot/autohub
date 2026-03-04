"""Message repository."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Message


class MessageRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        booking_id: int,
        sender_id: int,
        receiver_id: int,
        message: str,
        message_type: str = "text",
    ) -> Message:
        msg = Message(
            booking_id=booking_id,
            sender_id=sender_id,
            receiver_id=receiver_id,
            message=message,
            message_type=message_type,
        )
        self.db.add(msg)
        await self.db.flush()
        await self.db.refresh(msg)
        return msg

    async def get_by_booking_id(self, booking_id: int) -> list[Message]:
        """Get all messages for a booking, ordered by created_at."""
        result = await self.db.execute(
            select(Message)
            .where(Message.booking_id == booking_id)
            .options(
                selectinload(Message.sender),
                selectinload(Message.receiver),
            )
            .order_by(Message.created_at)
        )
        return list(result.scalars().unique().all())

    async def mark_as_read_by_receiver(self, booking_id: int, receiver_id: int) -> int:
        """Mark all messages in booking where receiver_id matches as read. Returns count."""
        from sqlalchemy import update

        stmt = (
            update(Message)
            .where(
                Message.booking_id == booking_id,
                Message.receiver_id == receiver_id,
                Message.is_read == False,
            )
            .values(is_read=True)
        )
        result = await self.db.execute(stmt)
        return result.rowcount or 0

    async def count_unread_for_receiver(self, booking_id: int, receiver_id: int) -> int:
        """Count unread messages for receiver in booking."""
        result = await self.db.execute(
            select(func.count(Message.id)).where(
                Message.booking_id == booking_id,
                Message.receiver_id == receiver_id,
                Message.is_read == False,
            )
        )
        return result.scalar() or 0

    async def count_total_unread_for_receiver(self, receiver_id: int) -> int:
        """Count total unread messages for receiver across all bookings."""
        result = await self.db.execute(
            select(func.count(Message.id)).where(
                Message.receiver_id == receiver_id,
                Message.is_read == False,
            )
        )
        return result.scalar() or 0

    async def get_last_message_for_booking(self, booking_id: int) -> Message | None:
        """Get the most recent message for a booking."""
        result = await self.db.execute(
            select(Message)
            .where(Message.booking_id == booking_id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_unread_counts_by_booking(
        self, booking_ids: list[int], receiver_id: int
    ) -> dict[int, int]:
        """Get unread message counts per booking for a receiver."""
        if not booking_ids:
            return {}
        result = await self.db.execute(
            select(Message.booking_id, func.count(Message.id).label("cnt"))
            .where(
                Message.booking_id.in_(booking_ids),
                Message.receiver_id == receiver_id,
                Message.is_read == False,
            )
            .group_by(Message.booking_id)
        )
        return {row.booking_id: row.cnt for row in result.all()}

    async def get_last_messages_for_bookings(
        self, booking_ids: list[int]
    ) -> dict[int, tuple[str, str | None]]:
        """Get last message (text, created_at) per booking. Returns {booking_id: (message, created_at_iso)}."""
        if not booking_ids:
            return {}
        result = await self.db.execute(
            select(Message)
            .where(Message.booking_id.in_(booking_ids))
            .order_by(Message.created_at.desc())
        )
        msgs = list(result.scalars().unique().all())
        out: dict[int, tuple[str, str | None]] = {}
        for m in msgs:
            if m.booking_id not in out:
                out[m.booking_id] = (
                    m.message,
                    m.created_at.isoformat() if m.created_at else None,
                )
        return out
