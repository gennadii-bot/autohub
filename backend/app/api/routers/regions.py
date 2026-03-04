"""Regions API — HTTP layer only."""

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_city_service, get_region_service
from app.core.exceptions import NotFoundError, Errors
from app.schemas import CityResponse, RegionResponse
from app.services import CityService, RegionService

router = APIRouter(prefix="/regions", tags=["regions"])


@router.get("", response_model=list[RegionResponse])
async def list_regions(service: RegionService = Depends(get_region_service)):
    """Список областей Казахстана."""
    regions = await service.list_regions()
    return regions


@router.get("/{region_id}/cities", response_model=list[CityResponse])
async def list_cities_by_region(
    region_id: int,
    region_service: RegionService = Depends(get_region_service),
    city_service: CityService = Depends(get_city_service),
):
    """Список городов области."""
    region = await region_service.get_by_id(region_id)
    if not region:
        raise NotFoundError(*Errors.REGION_NOT_FOUND)
    cities = await city_service.list_cities(region_id=region_id)
    return cities
