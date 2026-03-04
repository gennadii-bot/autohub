"""STO (станции техобслуживания) API."""

from fastapi import APIRouter, Depends, Path, Query

from app.api.deps import (
    get_booking_service,
    get_current_user_sto_owner,
    get_current_user_sto_or_admin,
    get_review_service,
    get_schedule_service,
    get_service_service,
    get_sto_repository,
    get_sto_service,
    get_sto_service_repository,
    get_sto_services_service,
    require_user_only,
)
from app.schemas import STOCreate, STOListItemResponse, STOResponse
from app.schemas.booking import OwnerBookingResponse
from app.schemas.service_catalog import (
    BookingServiceResponse,
    StoServiceItemResponse,
    StoServiceItemUpdate,
)
from app.schemas.review import ReviewListResponse
from app.schemas.schedule import ScheduleItemCreate
from app.schemas.sto_settings import StoSettingsUpdate
from app.schemas.sto import (
    PaginatedSTOList,
    ServiceResponse,
    STORequestCreate,
    STORequestResponse,
    StoOwnerListResponse,
)
from app.services import BookingService, STOService
from app.services.review_service import ReviewService
from app.services.schedule_service import ScheduleService
from app.services.service_service import ServiceService
from app.services.sto_services_service import StoServicesService

router = APIRouter(prefix="/sto", tags=["sto"])


@router.get("", response_model=PaginatedSTOList)
async def list_stos(
    city_id: int | None = Query(None, gt=0, description="Фильтр по городу"),
    page: int = Query(1, ge=1, description="Номер страницы"),
    per_page: int = Query(20, ge=1, le=100, description="Записей на страницу"),
    search: str | None = Query(None, description="Поиск по названию"),
    rating_min: float | None = Query(None, ge=0, le=5, description="Минимальный рейтинг"),
    service_id: int | None = Query(None, gt=0, description="Фильтр по услуге"),
    sort: str = Query("name", description="Сортировка: name | rating"),
    sto_svc: STOService = Depends(get_sto_service),
):
    """Список СТО с пагинацией, фильтрами и сортировкой."""
    return await sto_svc.list_stos(
        city_id=city_id,
        page=page,
        per_page=per_page,
        search=search,
        rating_min=rating_min,
        service_id=service_id,
        sort=sort,
    )


@router.get("/my", response_model=list[StoOwnerListResponse])
async def get_my_stos(
    user: dict = Depends(get_current_user_sto_owner),
    sto_svc: STOService = Depends(get_sto_service),
):
    """Мои активные СТО. Только sto_owner."""
    return await sto_svc.get_my_active_stos(user_id=user["id"])


@router.get("/{sto_id}/slots")
@router.get("/{sto_id}/available-slots")
async def get_sto_slots(
    sto_id: int = Path(..., gt=0),
    date: str = Query(..., description="Дата YYYY-MM-DD"),
    service_id: int = Query(..., gt=0, description="ID услуги из каталога (StoService)"),
    sto_svc: STOService = Depends(get_sto_service),
) -> list:
    """Слоты времени с флагом available. [{"time": "HH:MM", "available": bool}, ...]."""
    from datetime import datetime

    from fastapi import HTTPException

    try:
        date_val = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Неверный формат даты")

    slots = await sto_svc.get_available_slots(
        sto_id=sto_id,
        date_val=date_val,
        service_id=service_id,
    )
    return slots


@router.get("/{sto_id}/services", response_model=list[ServiceResponse])
async def list_sto_services(
    sto_id: int = Path(..., gt=0),
    service_svc: ServiceService = Depends(get_service_service),
):
    """Список услуг СТО (legacy, из services)."""
    return await service_svc.list_sto_services(sto_id)


@router.get("/{sto_id}/booking-services", response_model=list[BookingServiceResponse])
async def list_sto_booking_services(
    sto_id: int = Path(..., gt=0),
    sto_svc_repo=Depends(get_sto_service_repository),
    sto_repo=Depends(get_sto_repository),
):
    """Активные услуги СТО для записи (из каталога). Публичный endpoint."""
    from app.core.exceptions import NotFoundError, Errors
    from app.models.enums import STOStatus

    sto = await sto_repo.get_by_id(sto_id)
    if not sto or sto.status != STOStatus.active:
        raise NotFoundError(*Errors.STO_NOT_FOUND)
    items = await sto_svc_repo.get_active_by_sto_id(sto_id)
    return [
        BookingServiceResponse(
            id=ss.service_id,
            name=ss.catalog_item.name,
            price=float(ss.price),
            duration_minutes=ss.duration_minutes,
        )
        for ss in items
    ]


@router.get("/dashboard/bookings", response_model=list[OwnerBookingResponse])
async def get_sto_dashboard_bookings(
    user: dict = Depends(get_current_user_sto_or_admin),
    booking_svc: BookingService = Depends(get_booking_service),
):
    """Все записи для СТО текущего пользователя (sto_owner)."""
    bookings = await booking_svc.get_bookings_for_sto_owner(user["id"])
    return [OwnerBookingResponse.from_booking(b) for b in bookings]


@router.get("/my/{sto_id}/bookings", response_model=list[OwnerBookingResponse])
async def get_my_sto_bookings(
    sto_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user_sto_owner),
    booking_svc: BookingService = Depends(get_booking_service),
):
    """Записи для конкретного СТО владельца."""
    bookings = await booking_svc.get_bookings_for_sto(
        sto_id=sto_id,
        user_id=user["id"],
        role=user.get("role"),
    )
    return [OwnerBookingResponse.from_booking(b) for b in bookings]


@router.get("/my/{sto_id}", response_model=StoOwnerListResponse)
async def get_my_sto_detail(
    sto_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user_sto_owner),
    sto_svc: STOService = Depends(get_sto_service),
):
    """СТО по id для панели владельца. Только свой active СТО."""
    return await sto_svc.get_my_sto_for_panel(sto_id=sto_id, user_id=user["id"])


@router.get("/my/{sto_id}/services", response_model=list[StoServiceItemResponse])
async def get_my_sto_services(
    sto_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user_sto_owner),
    svc: StoServicesService = Depends(get_sto_services_service),
):
    """Услуги СТО для владельца. Только свой СТО."""
    return await svc.get_sto_services(sto_id=sto_id, user_id=user["id"])


@router.put("/my/{sto_id}/services", response_model=list[StoServiceItemResponse])
async def update_my_sto_services(
    payload: list[StoServiceItemUpdate],
    sto_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user_sto_owner),
    svc: StoServicesService = Depends(get_sto_services_service),
):
    """Обновить услуги СТО. Только владелец."""
    return await svc.update_sto_services(
        sto_id=sto_id,
        user_id=user["id"],
        items=payload,
    )


@router.patch("/my/{sto_id}/settings")
async def update_my_sto_settings(
    payload: StoSettingsUpdate,
    sto_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user_sto_owner),
    sto_repo=Depends(get_sto_repository),
):
    """Обновить настройки СТО (max_parallel_bookings). Только владелец."""
    from app.core.exceptions import ForbiddenError, NotFoundError, Errors
    from app.models.enums import STOStatus

    sto = await sto_repo.get_by_id(sto_id)
    if not sto:
        raise NotFoundError(*Errors.STO_NOT_FOUND)
    if sto.owner_id != user["id"]:
        raise ForbiddenError(*Errors.FORBIDDEN)
    if sto.status != STOStatus.active:
        raise ForbiddenError(*Errors.FORBIDDEN)
    await sto_repo.update_max_parallel_bookings(
        sto_id, payload.max_parallel_bookings
    )
    return {"max_parallel_bookings": payload.max_parallel_bookings}


@router.get("/my/{sto_id}/schedule")
async def get_my_sto_schedule(
    sto_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user_sto_owner),
    schedule_svc: ScheduleService = Depends(get_schedule_service),
):
    """Расписание СТО (владелец)."""
    return await schedule_svc.get_schedule(sto_id, user["id"], is_owner=True)


@router.put("/my/{sto_id}/schedule")
async def update_my_sto_schedule(
    payload: list[ScheduleItemCreate],
    sto_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user_sto_owner),
    schedule_svc: ScheduleService = Depends(get_schedule_service),
):
    """Обновить расписание. Только владелец."""
    return await schedule_svc.update_schedule(
        sto_id=sto_id,
        user_id=user["id"],
        items=[p.model_dump() for p in payload],
    )


@router.get("/by-slug/{slug}", response_model=STOResponse)
async def get_sto_by_slug(
    slug: str = Path(..., min_length=1),
    sto_repo=Depends(get_sto_repository),
    sto_svc: STOService = Depends(get_sto_service),
):
    """СТО по slug для публичной страницы записи. Без авторизации."""
    from app.core.exceptions import NotFoundError, Errors

    sto = await sto_repo.get_by_slug_with_services(slug)
    if not sto:
        raise NotFoundError(*Errors.STO_NOT_FOUND)
    return await sto_svc.get_sto_with_services(sto.id)


@router.get("/{sto_id}/reviews", response_model=ReviewListResponse)
async def get_sto_reviews(
    sto_id: int = Path(..., gt=0),
    review_svc: ReviewService = Depends(get_review_service),
):
    """Отзывы СТО с рейтингом."""
    avg_rating, total, items = await review_svc.get_sto_reviews(sto_id)
    return ReviewListResponse(
        avg_rating=avg_rating,
        total_reviews=total,
        items=items,
    )


@router.get("/{sto_id}/schedule")
async def get_sto_schedule(
    sto_id: int = Path(..., gt=0),
    schedule_svc: ScheduleService = Depends(get_schedule_service),
):
    """Расписание СТО (0=Пн..6=Вс)."""
    return await schedule_svc.get_schedule(sto_id)


@router.get("/{sto_id}", response_model=STOResponse)
async def get_sto(
    sto_id: int = Path(..., gt=0),
    sto_svc: STOService = Depends(get_sto_service),
):
    """СТО по id с городом и услугами."""
    return await sto_svc.get_sto_with_services(sto_id)


@router.post("/request", response_model=STORequestResponse, status_code=201)
async def submit_sto_request(
    payload: STORequestCreate,
    user: dict = Depends(require_user_only),
    sto_svc: STOService = Depends(get_sto_service),
):
    """Подать заявку на партнёрство (become partner). Только role=client."""
    return await sto_svc.submit_sto_request(payload, user_id=user["id"])


@router.post("", response_model=STOResponse, status_code=201)
async def create_sto(
    payload: STOCreate,
    user: dict = Depends(get_current_user_sto_owner),
    sto_svc: STOService = Depends(get_sto_service),
):
    """Создать СТО (только sto_owner)."""
    sto = await sto_svc.create_sto(payload, owner_id=user["id"])
    return await sto_svc.get_sto_with_services(sto.id)
