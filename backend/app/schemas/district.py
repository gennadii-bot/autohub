"""Pydantic schemas for District."""

from pydantic import BaseModel, ConfigDict, Field


class DistrictResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str = Field(..., min_length=1, max_length=255)
    region_id: int = Field(..., description="ID области")
