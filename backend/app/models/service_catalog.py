"""Service catalog — global reference of available services."""

from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class ServiceCatalog(Base):
    __tablename__ = "service_catalog"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    sto_services: Mapped[list["StoService"]] = relationship(
        "StoService",
        back_populates="catalog_item",
    )
    bookings: Mapped[list["Booking"]] = relationship(
        "Booking",
        back_populates="catalog_service",
    )
