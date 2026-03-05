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

    async def list_cities(
        self,
        region_id: int | None = None,
        district_id: int | None = None,
    ) -> list[City]:
        """Get cities, optionally by region_id or district_id. Returns [] on error."""
        try:
            return await self.repo.get_all(region_id=region_id, district_id=district_id)
        except Exception as e:
            logger.exception("list_cities failed: %s", e)
            return []

    async def search_cities(self, q: str, limit: int = 50) -> list[City]:
        """Search cities by name (ILIKE). Returns [] on error."""
        try:
            return await self.repo.search(q=q, limit=limit)
        except Exception as e:
            logger.exception("search_cities failed: %s", e)
            return []
