"""StoSchedule — working hours per day of week."""

from datetime import time

from sqlalchemy import Boolean, ForeignKey, Integer, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class StoSchedule(Base):
    __tablename__ = "sto_schedules"
    __table_args__ = (
        UniqueConstraint("sto_id", "day_of_week", name="uq_sto_schedules_sto_day"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sto_id: Mapped[int] = mapped_column(
        ForeignKey("stos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Mon, 6=Sun
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    is_working: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    sto: Mapped["STO"] = relationship("STO", back_populates="schedules")
