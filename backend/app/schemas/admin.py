"""Pydantic schemas for admin endpoints."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AdminAnalyticsPoint(BaseModel):
    """Single point for analytics chart."""

    date: str
    count: int


class AdminAnalyticsRangePoint(BaseModel):
    """One day in analytics range (users, bookings, stos)."""

    date: str
    users: int = 0
    bookings: int = 0
    stos: int = 0


class AdminAnalyticsResponse(BaseModel):
    """Analytics data for charts."""

    type: str  # users | stos | bookings
    period: str  # 7days | 30days | 6months | 1year
    data: list[AdminAnalyticsPoint]


class AdminUserResponse(BaseModel):
    """User in admin list."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    car_brand: str | None = None
    car_model: str | None = None
    car_year: int | None = None
    role: str
    city_id: int | None
    created_at: datetime | None = None
    status: str = "active"


class AdminUserDetailResponse(BaseModel):
    """Full user detail for admin. GET /admin/users/{id}."""

    id: int
    email: str
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    car_brand: str | None = None
    car_model: str | None = None
    car_year: int | None = None
    role: str
    city_id: int | None
    city_name: str | None = None
    created_at: datetime | None
    status: str = "active"
    bookings_count: int = 0
    reviews_count: int = 0
    bookings: list["AdminBookingResponse"] = []
    owned_stos: list["AdminSTOListItem"] = []


class AdminUserUpdate(BaseModel):
    """PUT /admin/users/{id} body."""

    role: str | None = None
    city_id: int | None = None


class AdminCityRef(BaseModel):
    """City reference in admin STO request."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class AdminOwnerRef(BaseModel):
    """Owner reference in admin STO request."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str


class AdminSTOListItem(BaseModel):
    """STO in admin list."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    address: str
    status: str
    rating: float
    city_id: int
    city_name: str | None = None
    owner_id: int | None
    created_at: datetime | None = None


class AdminSTODetailResponse(BaseModel):
    """Full STO detail for admin."""

    id: int
    name: str
    address: str
    description: str | None
    phone: str | None
    whatsapp: str | None
    status: str
    rating: float
    city: AdminCityRef
    owner: AdminOwnerRef | None
    created_at: datetime | None = None


class AdminSTOServiceSimple(BaseModel):
    """Service with id, name, price for STO detail."""

    id: int
    name: str
    price: float


class AdminSTODetailExtendedResponse(BaseModel):
    """Extended STO detail with services and stats."""

    id: int
    name: str
    address: str
    description: str | None
    phone: str | None
    whatsapp: str | None
    status: str
    rating: float
    city: AdminCityRef
    owner: AdminOwnerRef | None
    created_at: datetime | None = None
    services: list[AdminSTOServiceSimple] = []
    total_bookings: int = 0
    completed_bookings: int = 0
    revenue: float = 0.0
    clients_count: int = 0


class AdminSTOServiceItem(BaseModel):
    """Service with price for STO."""

    service_id: int
    name: str
    category: str
    price: float
    duration_minutes: int


class STOPopularService(BaseModel):
    """Popular service in STO analytics."""

    service_name: str
    count: int


class STOAnalyticsChartPoint(BaseModel):
    """Single point for STO activity chart."""

    date: str
    bookings: int


class AdminSTOAnalyticsResponse(BaseModel):
    """Analytics for single STO. Admin or STO owner."""

    total_bookings: int
    completed: int
    cancelled: int
    revenue: float
    average_rating: float
    clients_count: int
    popular_services: list[STOPopularService]
    chart: list[STOAnalyticsChartPoint]


class AdminBookingResponse(BaseModel):
    """Booking in admin list."""

    id: int
    sto_id: int
    sto_name: str | None = None
    client_email: str | None = None
    service_name: str | None = None
    date: str
    time: str
    status: str
    created_at: datetime | None = None


class AdminReviewResponse(BaseModel):
    """Review in admin list."""

    id: int
    sto_id: int
    sto_name: str | None = None
    user_email: str | None = None
    rating: int
    comment: str | None = None
    created_at: datetime


class AdminSTORequestResponse(BaseModel):
    """STO request from sto_requests table (partner application form)."""

    id: str  # UUID
    first_name: str
    last_name: str
    middle_name: str | None
    email: str
    phone: str
    iin: str
    ip_name: str | None
    bin: str | None
    sto_name: str
    sto_description: str | None
    region_id: int
    city_id: int
    region_name: str
    city_name: str
    address: str
    photo_url: str | None
    status: str
    rejection_reason: str | None = None
    created_at: datetime


class AdminSTORequestListResponse(BaseModel):
    """Paginated list of STO requests."""

    items: list[AdminSTORequestResponse]
    total: int
    page: int
    per_page: int


class RejectSTORequestBody(BaseModel):
    """Body for POST /admin/sto-requests/{id}/reject."""

    reason: str | None = None


class ApproveSTOResponse(BaseModel):
    """Success response for approve."""

    success: bool = True
    message: str = "STO approved and activation email sent"


class RejectSTOResponse(BaseModel):
    """Success response for reject."""

    success: bool = True
    message: str = "Заявка отклонена"


class AdminStatsResponse(BaseModel):
    """Admin dashboard stats. GET /admin/stats."""

    users_count: int
    stos_count: int
    pending_requests: int
    completed_services: int
    average_rating: float


class ActivityByDayItem(BaseModel):
    """One day in activity_by_day."""

    date: str
    users: int = 0
    bookings: int = 0
    revenue: float = 0.0


class AdminStatsExtendedResponse(BaseModel):
    """GET /admin/stats?date_from=&date_to= with calendar stats."""

    users_total: int
    users_new: int
    stos_total: int
    bookings_total: int
    bookings_completed: int
    revenue_total: float
    average_rating: float
    activity_by_day: list[ActivityByDayItem] = []


class FinanceSummaryResponse(BaseModel):
    """GET /admin/finance/summary."""

    revenue_total: float
    commission_total: float = 0.0
    sto_payout_total: float = 0.0
    revenue_by_day: list[ActivityByDayItem] = []


# Resolve forward refs for AdminUserDetailResponse
AdminUserDetailResponse.model_rebuild()
