"""StoSchedule business logic."""

from datetime import time

from app.core.exceptions import ForbiddenError, NotFoundError, Errors
from app.models import StoSchedule
from app.models.enums import STOStatus
from app.repositories.sto_repository import STORepository
from app.repositories.sto_schedule_repository import StoScheduleRepository


class ScheduleService:
    def __init__(
        self,
        schedule_repo: StoScheduleRepository,
        sto_repo: STORepository,
    ):
        self.schedule_repo = schedule_repo
        self.sto_repo = sto_repo

    async def get_schedule(
        self, sto_id: int, user_id: int | None = None, is_owner: bool = False
    ) -> list[dict]:
        """Get schedule for STO. Returns 7 items (0=Mon..6=Sun)."""
        sto = await self.sto_repo.get_by_id(sto_id)
        if sto is None:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        items = await self.schedule_repo.get_by_sto_id(sto_id)
        by_day = {s.day_of_week: s for s in items}
        result: list[dict] = []
        for d in range(7):
            if d in by_day:
                s = by_day[d]
                result.append({
                    "day_of_week": d,
                    "start_time": s.start_time.strftime("%H:%M"),
                    "end_time": s.end_time.strftime("%H:%M"),
                    "is_working": s.is_working,
                })
            else:
                result.append({
                    "day_of_week": d,
                    "start_time": "09:00",
                    "end_time": "18:00",
                    "is_working": d < 5,
                })
        return result

    async def update_schedule(
        self,
        sto_id: int,
        user_id: int,
        items: list[dict],
    ) -> list[dict]:
        """Update schedule. Only owner. items: list of {day_of_week, start_time, end_time, is_working}."""
        sto = await self.sto_repo.get_by_id(sto_id)
        if sto is None:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        if sto.owner_id != user_id:
            raise ForbiddenError(*Errors.FORBIDDEN)
        if sto.status != STOStatus.active:
            raise ForbiddenError(*Errors.FORBIDDEN)
        data: list[tuple[int, time, time, bool]] = []
        for i in items:
            day = int(i["day_of_week"])
            start = _parse_time(str(i.get("start_time", "09:00")))
            end = _parse_time(str(i.get("end_time", "18:00")))
            is_working = bool(i.get("is_working", True))
            data.append((day, start, end, is_working))
        await self.schedule_repo.replace_for_sto(sto_id, data)
        return await self.get_schedule(sto_id, user_id, is_owner=True)

    async def get_working_hours_for_day(
        self, sto_id: int, day_of_week: int
    ) -> tuple[time, time] | None:
        """Get (start_time, end_time) for day. None if not working."""
        items = await self.schedule_repo.get_by_sto_id(sto_id)
        for s in items:
            if s.day_of_week == day_of_week and s.is_working:
                return (s.start_time, s.end_time)
        if not items:
            if day_of_week < 5:
                return (time(9, 0), time(18, 0))
            return None
        return None


def _parse_time(s: str) -> time:
    parts = s.replace(".", ":").split(":")
    h = int(parts[0]) if parts else 0
    m = int(parts[1]) if len(parts) > 1 else 0
    return time(h, m)
