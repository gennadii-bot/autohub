"""Geo API — GPS to city (reverse geocoding)."""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_geo_service
from app.schemas.city import CityResponse, GeoCityRequest
from app.services.geo_service import GeoService

router = APIRouter(prefix="/geo", tags=["geo"])


@router.post("/city")
async def nearest_city_post(
    body: GeoCityRequest,
    service: GeoService = Depends(get_geo_service),
) -> dict:
    """Return city_id of nearest city to given coordinates (legacy POST)."""
    city = await service.find_nearest_city(body.lat, body.lng)
    if not city:
        raise HTTPException(
            status_code=404,
            detail={"code": "NO_CITY_FOUND", "message": "Ближайший город не найден"},
        )
    return {"city_id": city.id}


@router.get("/reverse", response_model=CityResponse | None)
async def reverse_geocode(
    lat: float = Query(..., ge=-90, le=90, description="Широта"),
    lng: float = Query(..., ge=-180, le=180, description="Долгота"),
    service: GeoService = Depends(get_geo_service),
) -> CityResponse | None:
    """Определить ближайший город по координатам (Haversine). Возвращает полный City или 404."""
    city = await service.find_nearest_city(lat, lng)
    if not city:
        raise HTTPException(
            status_code=404,
            detail={"code": "NO_CITY_FOUND", "message": "Ближайший город не найден"},
        )
    return city
