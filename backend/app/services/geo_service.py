"""Geo service — find nearest city by coordinates (Haversine)."""

import logging
import math

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import City

logger = logging.getLogger(__name__)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in km between two points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))
    return R * c


class GeoService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_nearest_city(self, lat: float, lng: float) -> City | None:
        """Find nearest city with coordinates (Haversine). Returns None if no cities have coords."""
        result = await self.db.execute(
            select(City)
            .options(selectinload(City.region))
            .where(City.lat.isnot(None), City.lng.isnot(None))
        )
        cities = list(result.scalars().all())
        if not cities:
            return None

        nearest = min(
            cities,
            key=lambda c: _haversine_km(lat, lng, c.lat or 0, c.lng or 0),
        )
        return nearest
