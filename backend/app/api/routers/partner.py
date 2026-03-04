"""Partner API for STO owners."""

import logging
from datetime import date

from fastapi import APIRouter, Depends, File, Path, Query, UploadFile

from app.api.deps import (
    get_current_user_sto_owner,
    get_service_catalog_repository,
    get_booking_repository,
    get_message_repository,
    get_review_repository,
    get_sto_repository,
    get_sto_service_repository,
    get_user_repository,
)
from app.schemas.partner import (
    PartnerAnalyticsResponse,
    PartnerBookingResponse,
    PartnerBookingStatusUpdate,
    PartnerCatalogItem,
    PartnerDashboardResponse,
    PartnerProfileResponse,
    PartnerProfileUpdate,
    PartnerServiceAnalyticsItem,
    PartnerServiceCreate,
    PartnerServiceCreateOne,
    PartnerServiceItem,
    PartnerServiceUpdate,
    PartnerStoItem,
)
from app.services.partner_service import PartnerService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/partner", tags=["partner"])


def get_partner_service(
    sto_repo=Depends(get_sto_repository),
    booking_repo=Depends(get_booking_repository),
    review_repo=Depends(get_review_repository),
    sto_service_repo=Depends(get_sto_service_repository),
    user_repo=Depends(get_user_repository),
    catalog_repo=Depends(get_service_catalog_repository),
    msg_repo=Depends(get_message_repository),
) -> PartnerService:
    return PartnerService(
        sto_repo,
        booking_repo,
        review_repo,
        sto_service_repo,
        user_repo,
        catalog_repo,
        msg_repo,
    )


@router.get("/stos", response_model=list[PartnerStoItem])
async def list_my_stos(
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
):
    """List owner's STOs."""
    return await svc.get_my_stos(user["id"])


@router.get("/dashboard", response_model=PartnerDashboardResponse)
async def get_dashboard(
    date_from: date | None = Query(None, description="YYYY-MM-DD"),
    date_to: date | None = Query(None, description="YYYY-MM-DD"),
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
):
    """Dashboard stats for STO owner. date_from/date_to for bookings_by_day (default: current month)."""
    return await svc.get_dashboard(user["id"], date_from=date_from, date_to=date_to)


@router.get("/bookings", response_model=list[PartnerBookingResponse])
async def list_bookings(
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
):
    """All bookings for owner's STOs."""
    return await svc.get_bookings(user["id"])


@router.patch("/bookings/{booking_id}/status", response_model=PartnerBookingResponse)
async def update_booking_status(
    booking_id: int = Path(..., gt=0),
    body: PartnerBookingStatusUpdate = ...,
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
):
    """Update booking status. Only if booking belongs to owner's STO."""
    return await svc.update_booking_status(
        booking_id, body.status, user["id"]
    )


@router.patch("/bookings/{booking_id}/complete", response_model=PartnerBookingResponse)
async def complete_booking(
    booking_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
):
    """Mark booking as completed. Only owner's STO."""
    return await svc.update_booking_status(booking_id, "completed", user["id"])


@router.patch("/bookings/{booking_id}/cancel", response_model=PartnerBookingResponse)
async def cancel_booking(
    booking_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
):
    """Cancel booking. Only owner's STO."""
    return await svc.update_booking_status(booking_id, "cancelled", user["id"])


@router.get("/services", response_model=list[PartnerServiceItem])
async def list_services(
    sto_id: int = Query(..., gt=0, description="ID СТО"),
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
):
    """Services for STO. Only owner's STO."""
    return await svc.get_services(user["id"], sto_id)


@router.put("/services", response_model=list[PartnerServiceItem])
async def update_services(
    sto_id: int = Query(..., gt=0, description="ID СТО"),
    items: list[PartnerServiceCreate] = ...,
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
):
    """Replace STO services. Only owner's STO."""
    return await svc.update_services(user["id"], sto_id, items)


@router.get("/catalog-services", response_model=list[PartnerCatalogItem])
async def list_catalog_services(
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
):
    """Catalog services for dropdown (add service to STO)."""
    return await svc.get_catalog_services(user["id"])


@router.post("/services", response_model=PartnerServiceItem, status_code=201)
async def add_service(
    sto_id: int = Query(..., gt=0),
    body: PartnerServiceCreateOne = ...,
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
):
    """Add one service to STO. Only owner's STO."""
    return await svc.add_service(user["id"], sto_id, body)


@router.patch("/services/{service_id}", response_model=PartnerServiceItem)
async def update_service(
    service_id: int = Path(..., gt=0),
    body: PartnerServiceUpdate = ...,
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
):
    """Update one STO service by id (sto_service id). Only owner's STO."""
    updated = await svc.update_service(user["id"], service_id, body)
    if not updated:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Услуга не найдена")
    return updated


@router.delete("/services/{service_id}", status_code=204)
async def delete_service(
    service_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
):
    """Delete one STO service by id (sto_service id). Only owner's STO."""
    await svc.delete_service(user["id"], service_id)


@router.get("/analytics")
async def get_analytics(
    from_date: date | None = Query(None, alias="from", description="YYYY-MM-DD"),
    to_date: date | None = Query(None, alias="to", description="YYYY-MM-DD"),
    group_by: str = Query("day", description="Aggregation: day|week|month"),
    period: int | None = Query(None, description="7|30|90|365 (legacy, when from/to not provided)"),
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
):
    """
    Analytics. With from+to: {chart, kpi, top_services}. With period only: legacy format.
    Only sto_owner.
    """
    from datetime import timedelta
    from fastapi import HTTPException

    if from_date is not None and to_date is not None:
        if from_date > to_date:
            raise HTTPException(status_code=400, detail="from must be <= to")
        if (to_date - from_date).days > 365:
            raise HTTPException(status_code=400, detail="Date range must not exceed 365 days")
        if group_by not in ("day", "week", "month"):
            raise HTTPException(status_code=400, detail="group_by must be day, week, or month")
        return await svc.get_analytics_full(
            user["id"], from_date, to_date, group_by=group_by
        )
    # Legacy: period-based (chart, popular_services, total_revenue)
    return await svc.get_analytics(user["id"], period=period or 30)


@router.get("/analytics/services", response_model=list[PartnerServiceAnalyticsItem])
async def get_analytics_services(
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
):
    """Analytics by service: service_name, bookings_count, revenue (completed only)."""
    return await svc.get_analytics_services(user["id"])


@router.get("/profile", response_model=PartnerProfileResponse)
async def get_profile(
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
):
    """Partner profile."""
    return await svc.get_profile(user["id"])


@router.patch("/profile", response_model=PartnerProfileResponse)
async def update_profile(
    body: PartnerProfileUpdate = ...,
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
):
    """Update partner profile (e.g. city_id, STO fields)."""
    return await svc.update_profile(user["id"], body)


@router.get("/chats")
async def list_chats(
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
):
    """List chat dialogs for partner's STOs. Each dialog = one booking."""
    return await svc.get_chats(user["id"])


@router.patch("/chats/{booking_id}/read")
async def mark_chat_read(
    booking_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
):
    """Mark messages in chat as read (partner is receiver)."""
    ok = await svc.mark_chat_read(booking_id, user["id"])
    if not ok:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Чат не найден")
    return {"success": True}


@router.post("/profile/photo")
async def upload_profile_photo(
    photo: UploadFile = File(..., description="Фото СТО (jpg, png, webp, макс. 5 МБ)"),
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
):
    """Upload STO photo. Returns new image URL (relative path)."""
    url = await svc.upload_profile_photo(user["id"], photo)
    return {"url": url}
