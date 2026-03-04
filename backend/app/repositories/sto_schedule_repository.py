"""StoSchedule repository."""

from datetime import time

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import StoSchedule


class StoScheduleRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_sto_id(self, sto_id: int) -> list[StoSchedule]:
        result = await self.db.execute(
            select(StoSchedule)
            .where(StoSchedule.sto_id == sto_id)
            .order_by(StoSchedule.day_of_week)
        )
        return list(result.scalars().unique().all())

    async def replace_for_sto(
        self,
        sto_id: int,
        items: list[tuple[int, time, time, bool]],
    ) -> list[StoSchedule]:
        """Replace all schedules for sto. items: (day_of_week, start_time, end_time, is_working)."""
        await self.db.execute(delete(StoSchedule).where(StoSchedule.sto_id == sto_id))
        created: list[StoSchedule] = []
        for day_of_week, start_time, end_time, is_working in items:
            ss = StoSchedule(
                sto_id=sto_id,
                day_of_week=day_of_week,
                start_time=start_time,
                end_time=end_time,
                is_working=is_working,
            )
            self.db.add(ss)
            created.append(ss)
        await self.db.flush()
        for ss in created:
            await self.db.refresh(ss)
        return created
