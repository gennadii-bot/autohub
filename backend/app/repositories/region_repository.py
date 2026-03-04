"""Region repository."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Region


class RegionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> list[Region]:
        """Get all regions ordered by name."""
        result = await self.db.execute(select(Region).order_by(Region.name))
        return list(result.scalars().all())

    async def get_by_id(self, region_id: int) -> Region | None:
        """Get region by id."""
        result = await self.db.execute(select(Region).where(Region.id == region_id))
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Region | None:
        """Get region by name."""
        result = await self.db.execute(select(Region).where(Region.name == name))
        return result.scalar_one_or_none()
