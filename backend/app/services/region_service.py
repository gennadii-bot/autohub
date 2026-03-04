"""Region business logic."""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Region
from app.repositories import RegionRepository

logger = logging.getLogger(__name__)


class RegionService:
    def __init__(self, db: AsyncSession):
        self.repo = RegionRepository(db)

    async def get_by_id(self, region_id: int) -> Region | None:
        """Get region by id."""
        return await self.repo.get_by_id(region_id)

    async def list_regions(self) -> list[Region]:
        """Get all regions ordered by name. Returns [] on error."""
        try:
            return await self.repo.get_all()
        except Exception as e:
            logger.exception("list_regions failed: %s", e)
            return []
