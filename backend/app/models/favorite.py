"""Favorite model — user's favorite STOs."""

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "sto_id", name="uq_favorites_user_sto"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sto_id: Mapped[int] = mapped_column(
        ForeignKey("stos.id", ondelete="CASCADE"),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="favorites")
    sto: Mapped["STO"] = relationship("STO", back_populates="favorited_by")
