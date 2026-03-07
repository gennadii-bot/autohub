"""STO Image model — multiple photos per STO (max 10)."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class STOImage(Base):
    """Photo for STO. One STO can have up to 10 images."""

    __tablename__ = "sto_images"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sto_id: Mapped[int] = mapped_column(
        ForeignKey("stos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    image_url: Mapped[str] = mapped_column(String(512), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    sto: Mapped["STO"] = relationship("STO", back_populates="images")
