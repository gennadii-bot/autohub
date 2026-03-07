"""STO (service station) model."""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import EnumStr, STOStatus


class STO(Base):
    """СТО (станция техобслуживания). Таблица в БД: stos (не переименовывать)."""
    __tablename__ = "stos"  # must match PostgreSQL table name
    __table_args__ = (UniqueConstraint("name", "city_id", name="uq_stos_name_city_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    address: Mapped[str] = mapped_column(String(512), nullable=False)
    city_id: Mapped[int] = mapped_column(
        ForeignKey("cities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    owner_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
    )
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    whatsapp: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[STOStatus] = mapped_column(
        EnumStr(STOStatus),
        nullable=False,
        default=STOStatus.active,
        server_default="active",
    )
    rating: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    max_parallel_bookings: Mapped[int] = mapped_column(
        Integer, nullable=False, default=3
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    telegram_chat_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    region: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    owner_initials: Mapped[str | None] = mapped_column(String(64), nullable=True)

    city: Mapped["City"] = relationship("City", back_populates="stos")
    owner: Mapped["User | None"] = relationship("User", back_populates="owned_stos")
    services: Mapped[list["Service"]] = relationship(
        "Service",
        back_populates="sto",
        cascade="all, delete-orphan",
    )
    sto_services: Mapped[list["StoService"]] = relationship(
        "StoService",
        back_populates="sto",
        cascade="all, delete-orphan",
    )
    bookings: Mapped[list["Booking"]] = relationship(
        "Booking",
        back_populates="sto",
    )
    reviews: Mapped[list["Review"]] = relationship(
        "Review",
        back_populates="sto",
    )
    schedules: Mapped[list["StoSchedule"]] = relationship(
        "StoSchedule",
        back_populates="sto",
        cascade="all, delete-orphan",
    )
    favorited_by: Mapped[list["Favorite"]] = relationship(
        "Favorite",
        back_populates="sto",
        cascade="all, delete-orphan",
    )
    images: Mapped[list["STOImage"]] = relationship(
        "STOImage",
        back_populates="sto",
        cascade="all, delete-orphan",
    )
