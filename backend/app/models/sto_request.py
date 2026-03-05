"""STO partner application request model."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class STORequest(Base):
    """Partner application for STO registration."""

    __tablename__ = "sto_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    middle_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    iin: Mapped[str] = mapped_column(String(12), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    ip_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bin: Mapped[str | None] = mapped_column(String(12), nullable=True)
    sto_name: Mapped[str] = mapped_column(String(255), nullable=False)
    sto_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    region_id: Mapped[int] = mapped_column(
        ForeignKey("regions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    city_id: Mapped[int] = mapped_column(
        ForeignKey("cities.id", ondelete="RESTRICT"),
        nullable=False,
    )
    address: Mapped[str] = mapped_column(String(512), nullable=False)
    photo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        index=True,
    )
    rejection_reason: Mapped[str | None] = mapped_column(String(512), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    region: Mapped["Region"] = relationship("Region")
    city: Mapped["City"] = relationship("City")
