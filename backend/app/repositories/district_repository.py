"""District repository."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import District


class DistrictRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, region_id: int | None = None) -> list[District]:
        """Get districts, optionally by region_id. Ordered by name."""
        q = select(District).order_by(District.name)
        if region_id is not None:
            q = q.where(District.region_id == region_id)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def get_by_id(self, district_id: int) -> District | None:
        """Get district by id."""
        result = await self.db.execute(select(District).where(District.id == district_id))
        return result.scalar_one_or_none()
