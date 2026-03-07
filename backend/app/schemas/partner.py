"""Pydantic schemas for Partner API."""

from datetime import datetime

from pydantic import BaseModel, Field


class PartnerBookingsByDayItem(BaseModel):
    """One day in bookings_by_day."""

    date: str
    bookings: int = 0
    revenue: float = 0.0


class PartnerDashboardResponse(BaseModel):
    """GET /partner/dashboard."""

    total_bookings: int
    completed: int
    cancelled: int
    revenue: float
    average_rating: float
    bookings_by_day: list[PartnerBookingsByDayItem] = []


class PartnerServiceAnalyticsItem(BaseModel):
    """GET /partner/analytics/services item."""

    service_name: str
    bookings_count: int
    revenue: float


class PartnerBookingClientInfo(BaseModel):
    """Client info in booking for STO owner."""

    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    car_brand: str | None = None
    car_model: str | None = None
    car_year: int | None = None


class PartnerBookingResponse(BaseModel):
    """Booking for partner panel."""

    id: int
    client_id: int
    client_email: str = ""
    client: PartnerBookingClientInfo | None = None
    sto_id: int
    sto_name: str = ""
    service_id: int
    service_name: str = ""
    date: str
    time: str
    status: str
    price: float | None = None
    created_at: datetime


class PartnerBookingStatusUpdate(BaseModel):
    """PATCH /partner/bookings/{id}/status."""

    status: str = Field(..., pattern="^(accepted|cancelled|completed)$")


class PartnerServiceItem(BaseModel):
    """Service item for partner."""

    id: int
    service_id: int
    name: str
    category: str = ""
    price: float
    duration_minutes: int
    is_active: bool


class PartnerCatalogItem(BaseModel):
    """Catalog service for dropdown (add service)."""

    id: int
    name: str
    category: str = ""


class PartnerServiceCreateOne(BaseModel):
    """POST: add one service to STO."""

    service_id: int = Field(..., gt=0)
    price: float = Field(..., ge=0)
    duration_minutes: int = Field(30, ge=1, le=480)
    is_active: bool = True


class PartnerServiceCreate(BaseModel):
    """Create/update service (PUT replace list)."""

    service_id: int = Field(..., gt=0)
    price: float = Field(..., ge=0)
    duration_minutes: int = Field(30, ge=1, le=480)
    is_active: bool = True


class PartnerServiceUpdate(BaseModel):
    """PATCH one service."""

    price: float | None = Field(None, ge=0)
    duration_minutes: int | None = Field(None, ge=1, le=480)
    is_active: bool | None = None


class PartnerAnalyticsResponse(BaseModel):
    """GET /partner/analytics."""

    chart: list[dict]
    popular_services: list[dict]
    total_revenue: float


class PartnerProfileResponse(BaseModel):
    """GET /partner/profile."""

    id: int
    email: str
    role: str
    city_id: int | None
    created_at: datetime
    sto_id: int | None = None
    sto_name: str | None = None
    sto_phone: str | None = None
    sto_address: str | None = None
    sto_description: str | None = None
    sto_image_url: str | None = None
    sto_region: str | None = None
    sto_city: str | None = None
    sto_owner_initials: str | None = None
    sto_images: list[dict] = []


class PartnerProfileUpdate(BaseModel):
    """PATCH /partner/profile."""

    city_id: int | None = None
    sto_name: str | None = None
    sto_phone: str | None = None
    sto_address: str | None = None
    sto_description: str | None = None
    sto_image_url: str | None = None
    sto_region: str | None = None
    sto_city: str | None = None
    sto_owner_initials: str | None = None


class PartnerStoItem(BaseModel):
    """STO item for partner."""

    id: int
    name: str
    address: str
    city_name: str = ""
