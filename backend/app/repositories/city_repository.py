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
            .options(selectinload(City.region), selectinload(City.district))
            .where(City.id == city_id)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        region_id: int | None = None,
        district_id: int | None = None,
    ) -> list[City]:
        """Get cities, optionally filtered by region_id or district_id. Ordered by name."""
        q = (
            select(City)
            .options(selectinload(City.region), selectinload(City.district))
            .order_by(City.name)
        )
        if region_id is not None:
            q = q.where(City.region_id == region_id)
        if district_id is not None:
            q = q.where(City.district_id == district_id)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def search(self, q: str, limit: int = 50) -> list[City]:
        """Search cities by name (ILIKE). Ordered by name."""
        if not q or not q.strip():
            return []
        pattern = f"%{q.strip()}%"
        stmt = (
            select(City)
            .options(selectinload(City.region), selectinload(City.district))
            .where(City.name.ilike(pattern))
            .order_by(City.name)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
