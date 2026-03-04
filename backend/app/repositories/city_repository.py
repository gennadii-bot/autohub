"""City repository."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import City


class CityRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, city_id: int) -> City | None:
        """Get city by id."""
        result = await self.db.execute(
            select(City)
            .options(selectinload(City.region))
            .where(City.id == city_id)
        )
        return result.scalar_one_or_none()

    async def get_all(self, region_id: int | None = None) -> list[City]:
        """Get cities, optionally filtered by region_id. Ordered by name."""
        q = (
            select(City)
            .options(selectinload(City.region))
            .order_by(City.name)
        )
        if region_id is not None:
            q = q.where(City.region_id == region_id)
        result = await self.db.execute(q)
        return list(result.scalars().all())
