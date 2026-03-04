"""Pydantic schemas for STO and Service."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ServiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sto_id: int
    name: str = Field(..., min_length=1, max_length=255)
    price: float = Field(..., ge=0)
    duration_minutes: int = Field(..., ge=1)


class CityRefResponse(BaseModel):
    """City reference in STO response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    region: str = Field(..., validation_alias="region_name")


class STOResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    city_id: int
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1)
    address: str = Field(..., min_length=1, max_length=512)
    description: str | None = None
    image_url: str | None = None
    phone: str | None = None
    whatsapp: str | None = None
    owner_id: int | None = None
    rating: float = Field(..., ge=0, le=5)
    created_at: datetime
    city: CityRefResponse | None = None
    services: list[ServiceResponse] = Field(default_factory=list)


class STOListItemResponse(BaseModel):
    """STO list item with city."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    city_id: int
    name: str = Field(..., min_length=1, max_length=255)
    slug: str | None = Field(default=None, description="URL slug for /book/:slug")
    address: str = Field(..., min_length=1, max_length=512)
    description: str | None = None
    image_url: str | None = None
    rating: float = Field(..., ge=0, le=5)
    status: str = Field(default="active", description="active=Открыто, иначе Закрыто")
    created_at: datetime
    city: CityRefResponse | None = None

    @field_validator("status", mode="before")
    @classmethod
    def coerce_status(cls, v: str | object) -> str:
        if v is None:
            return "active"
        if hasattr(v, "value"):
            return str(v.value)
        return str(v)


class STOCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    address: str = Field(..., min_length=1, max_length=512)
    city_id: int = Field(..., gt=0)
    rating: float = Field(default=0.0, ge=0, le=5)
    image_url: str | None = None


class STORequestCreate(BaseModel):
    """Request body for POST /sto/request (become partner)."""

    name: str = Field(..., min_length=3, max_length=100)
    city_id: int = Field(..., gt=0)
    address: str = Field(..., min_length=5, max_length=512)
    phone: str = Field(..., min_length=1, max_length=32)
    whatsapp: str | None = Field(None, max_length=32)
    description: str = Field(..., min_length=20, max_length=1000)


class STORequestResponse(BaseModel):
    """Success response for POST /sto/request."""

    success: bool = True
    message: str = "Заявка отправлена на проверку"


class StoOwnerListResponse(BaseModel):
    """STO item for owner panel (GET /sto/my)."""

    id: int
    name: str
    city_id: int
    city_name: str
    address: str
    status: str = "active"
    max_parallel_bookings: int = 3
    created_at: datetime


class PaginatedSTOList(BaseModel):
    items: list[STOListItemResponse]
    total: int
    page: int
    per_page: int
    pages: int


class ServiceCreate(BaseModel):
    sto_id: int = Field(..., gt=0)
    name: str = Field(..., min_length=1, max_length=255)
    price: float = Field(..., ge=0)
    duration_minutes: int = Field(..., ge=1)
