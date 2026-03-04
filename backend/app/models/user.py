"""User model."""

from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import EnumStr, UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    role: Mapped[UserRole] = mapped_column(
        EnumStr(UserRole),
        nullable=False,
    )

    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    car_brand: Mapped[str | None] = mapped_column(String(100), nullable=True)
    car_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    car_year: Mapped[int | None] = mapped_column(Integer, nullable=True)

    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    city_id: Mapped[int | None] = mapped_column(
        ForeignKey("cities.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    telegram_id: Mapped[int | None] = mapped_column(
        BigInteger,
        unique=True,
        nullable=True,
    )

    telegram_chat_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        server_default="true",
    )

    city: Mapped["City | None"] = relationship(
        "City",
        back_populates="users",
    )

    owned_stos: Mapped[list["STO"]] = relationship(
        "STO",
        back_populates="owner",
        foreign_keys="STO.owner_id",
    )

    bookings: Mapped[list["Booking"]] = relationship(
        "Booking",
        back_populates="client",
        foreign_keys="Booking.client_id",
    )
    reviews: Mapped[list["Review"]] = relationship(
        "Review",
        back_populates="user",
    )
    activation_tokens: Mapped[list["ActivationToken"]] = relationship(
        "ActivationToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    favorites: Mapped[list["Favorite"]] = relationship(
        "Favorite",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
    )