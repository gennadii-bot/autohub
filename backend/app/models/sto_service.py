"""StoService — services offered by a specific STO (links to catalog)."""

from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class StoService(Base):
    __tablename__ = "sto_services"
    __table_args__ = (
        UniqueConstraint("sto_id", "service_id", name="uq_sto_services_sto_service"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sto_id: Mapped[int] = mapped_column(
        ForeignKey("stos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    service_id: Mapped[int] = mapped_column(
        ForeignKey("service_catalog.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    sto: Mapped["STO"] = relationship(
        "STO",
        back_populates="sto_services",
    )
    catalog_item: Mapped["ServiceCatalog"] = relationship(
        "ServiceCatalog",
        back_populates="sto_services",
    )
