"""District model (район Казахстана)."""

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class District(Base):
    """District (район) — belongs to a region."""

    __tablename__ = "districts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    region_id: Mapped[int] = mapped_column(
        ForeignKey("regions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    region: Mapped["Region"] = relationship("Region", back_populates="districts")
    cities: Mapped[list["City"]] = relationship(
        "City",
        back_populates="district",
        cascade="all, delete-orphan",
    )
