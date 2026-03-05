"""City model."""

from sqlalchemy import Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class City(Base):
    __tablename__ = "cities"
    __table_args__ = (UniqueConstraint("name", "region_id", name="uq_cities_name_region_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    region_id: Mapped[int] = mapped_column(
        ForeignKey("regions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    district_id: Mapped[int | None] = mapped_column(
        ForeignKey("districts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    type: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)

    region: Mapped["Region"] = relationship("Region", back_populates="cities")
    district: Mapped["District | None"] = relationship(
        "District",
        back_populates="cities",
    )

    @property
    def region_name(self) -> str:
        return self.region.name if self.region else ""

    stos: Mapped[list["STO"]] = relationship(
        "STO",
        back_populates="city",
        cascade="all, delete-orphan",
    )
    users: Mapped[list["User"]] = relationship(
        "User",
        back_populates="city",
    )
