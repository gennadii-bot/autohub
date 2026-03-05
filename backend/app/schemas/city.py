"""Pydantic schemas for City."""

from pydantic import BaseModel, ConfigDict, Field


class GeoCityRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class CityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str = Field(..., min_length=1, max_length=255)
    region_id: int = Field(..., description="ID области")
    district_id: int | None = Field(None, description="ID района")
    type: str | None = Field(None, description="Тип: city, town, district_center")
    region: str = Field(default="", validation_alias="region_name", min_length=0, max_length=255)
