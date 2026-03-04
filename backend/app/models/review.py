"""Review model."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sto_id: Mapped[int] = mapped_column(
        ForeignKey("stos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    user: Mapped["User"] = relationship("User", back_populates="reviews")
    sto: Mapped["STO"] = relationship("STO", back_populates="reviews")
    booking: Mapped["Booking"] = relationship(
        "Booking",
        back_populates="review",
        uselist=False,
    )
