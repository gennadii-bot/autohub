"""Region model (область Казахстана)."""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Region(Base):
    __tablename__ = "regions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)

    cities: Mapped[list["City"]] = relationship(
        "City",
        back_populates="region",
        cascade="all, delete-orphan",
    )
