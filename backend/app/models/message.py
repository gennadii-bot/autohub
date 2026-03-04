"""Message model — chat between client and STO."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    receiver_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        server_default="text",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")

    booking: Mapped["Booking"] = relationship("Booking", back_populates="messages")
    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id])
    receiver: Mapped["User"] = relationship("User", foreign_keys=[receiver_id])
