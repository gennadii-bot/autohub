"""Districts API — hierarchy: regions → districts → cities."""

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_city_service, get_district_service
from app.core.exceptions import NotFoundError, Errors
from app.schemas import CityResponse, DistrictResponse
from app.services import CityService, DistrictService

router = APIRouter(prefix="/districts", tags=["districts"])


@router.get("/{district_id}/cities", response_model=list[CityResponse])
async def list_cities_by_district(
    district_id: int,
    district_service: DistrictService = Depends(get_district_service),
    city_service: CityService = Depends(get_city_service),
):
    """Список городов района. Сортировка по имени."""
    district = await district_service.get_by_id(district_id)
    if not district:
        raise NotFoundError("DISTRICT_NOT_FOUND", "Район не найден")
    cities = await city_service.list_cities(district_id=district_id)
    return cities
