"""Booking model."""

from datetime import date, datetime, time

from sqlalchemy import Date, DateTime, ForeignKey, String, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import BookingStatus, EnumStr


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    guest_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    guest_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    guest_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    sto_id: Mapped[int] = mapped_column(
        ForeignKey("stos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    service_id: Mapped[int] = mapped_column(
        ForeignKey("service_catalog.id", ondelete="CASCADE"),
        nullable=False,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    time: Mapped[time] = mapped_column(Time, nullable=False)
    status: Mapped[BookingStatus] = mapped_column(EnumStr(BookingStatus), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    client: Mapped["User | None"] = relationship(
        "User",
        back_populates="bookings",
        foreign_keys=[client_id],
    )
    sto: Mapped["STO"] = relationship("STO", back_populates="bookings")
    catalog_service: Mapped["ServiceCatalog"] = relationship(
        "ServiceCatalog",
        back_populates="bookings",
    )
    review: Mapped["Review | None"] = relationship(
        "Review",
        back_populates="booking",
        uselist=False,
    )
    messages: Mapped[list["Message"]] = relationship(
        "Message",
        back_populates="booking",
        cascade="all, delete-orphan",
    )
