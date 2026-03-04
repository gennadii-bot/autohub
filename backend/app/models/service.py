"""Service model."""

from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sto_id: Mapped[int] = mapped_column(
        ForeignKey("stos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)

    sto: Mapped["STO"] = relationship("STO", back_populates="services")
