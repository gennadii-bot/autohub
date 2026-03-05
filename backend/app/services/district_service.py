"""District business logic."""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import District
from app.repositories import DistrictRepository

logger = logging.getLogger(__name__)


class DistrictService:
    def __init__(self, db: AsyncSession):
        self.repo = DistrictRepository(db)

    async def get_by_id(self, district_id: int) -> District | None:
        """Get district by id."""
        return await self.repo.get_by_id(district_id)

    async def list_districts(self, region_id: int | None = None) -> list[District]:
        """Get districts, optionally by region_id. Returns [] on error."""
        try:
            return await self.repo.get_all(region_id=region_id)
        except Exception as e:
            logger.exception("list_districts failed: %s", e)
            return []
