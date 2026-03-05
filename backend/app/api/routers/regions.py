"""Regions API — HTTP layer only."""

from fastapi import APIRouter, Depends

from app.api.deps import get_city_service, get_district_service, get_region_service
from app.core.exceptions import NotFoundError, Errors
from app.schemas import CityResponse, DistrictResponse, RegionResponse
from app.services import CityService, DistrictService, RegionService

router = APIRouter(prefix="/regions", tags=["regions"])


@router.get("", response_model=list[RegionResponse])
async def list_regions(service: RegionService = Depends(get_region_service)):
    """Список областей Казахстана. Сортировка по имени."""
    regions = await service.list_regions()
    return regions


@router.get("/{region_id}/districts", response_model=list[DistrictResponse])
async def list_districts_by_region(
    region_id: int,
    region_service: RegionService = Depends(get_region_service),
    district_service: DistrictService = Depends(get_district_service),
):
    """Список районов области. Сортировка по имени."""
    region = await region_service.get_by_id(region_id)
    if not region:
        raise NotFoundError(*Errors.REGION_NOT_FOUND)
    districts = await district_service.list_districts(region_id=region_id)
    return districts


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
