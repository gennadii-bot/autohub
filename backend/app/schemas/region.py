"""Pydantic schemas for Region."""

from pydantic import BaseModel, ConfigDict, Field


class RegionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str = Field(..., min_length=1, max_length=255)
