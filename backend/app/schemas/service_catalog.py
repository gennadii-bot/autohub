"""Pydantic schemas for service catalog and STO services."""

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class CatalogItemResponse(BaseModel):
    """Catalog item for GET /services/catalog."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str


class AdminCatalogItemResponse(BaseModel):
    """Catalog item for admin (includes is_active, description)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str
    description: str | None = None
    is_active: bool


class AdminCatalogCreate(BaseModel):
    """POST /admin/services."""

    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(None, max_length=2000)
    is_active: bool = True


class AdminCatalogUpdate(BaseModel):
    """PATCH /admin/services/{id}."""

    name: str | None = Field(None, min_length=1, max_length=255)
    category: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None, max_length=2000)
    is_active: bool | None = None


class StoServiceItemResponse(BaseModel):
    """STO service item for GET /sto/{id}/services (owner)."""

    service_id: int
    price: float
    is_active: bool


class StoServiceItemUpdate(BaseModel):
    """Single item for PUT /sto/{id}/services."""

    service_id: int = Field(..., gt=0)
    price: float = Field(..., ge=0)
    is_active: bool = True


class BookingServiceResponse(BaseModel):
    """Service for booking form (GET /sto/{id}/booking-services)."""

    id: int  # catalog service_id
    name: str
    price: float
    duration_minutes: int
