"""Cities API — HTTP layer only."""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_city_service
from app.schemas import CityResponse
from app.services import CityService

router = APIRouter(prefix="/cities", tags=["cities"])


@router.get("", response_model=list[CityResponse])
async def list_cities(
    region_id: int | None = Query(None, description="Фильтр по области"),
    service: CityService = Depends(get_city_service),
):
    """Список городов. Опционально фильтр по region_id."""
    return await service.list_cities(region_id=region_id)


@router.get("/{city_id}", response_model=CityResponse)
async def get_city(
    city_id: int,
    service: CityService = Depends(get_city_service),
):
    """Получить город по ID."""
    city = await service.get_city(city_id)
    if not city:
        raise HTTPException(status_code=404, detail="Город не найден")
    return city
