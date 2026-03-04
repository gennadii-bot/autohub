"""City business logic."""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import City
from app.repositories import CityRepository

logger = logging.getLogger(__name__)


class CityService:
    def __init__(self, db: AsyncSession):
        self.repo = CityRepository(db)

    async def get_city(self, city_id: int) -> City | None:
        """Get city by id. Returns None if not found."""
        try:
            return await self.repo.get_by_id(city_id)
        except Exception as e:
            logger.exception("get_city failed: %s", e)
            return None

    async def list_cities(self, region_id: int | None = None) -> list[City]:
        """Get cities, optionally by region_id. Returns [] on error."""
        try:
            return await self.repo.get_all(region_id=region_id)
        except Exception as e:
            logger.exception("list_cities failed: %s", e)
            return []
