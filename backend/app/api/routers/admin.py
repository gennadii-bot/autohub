"""Admin API — moderation, analytics, users, STOs."""

from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy import and_, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.types import Date

from app.api.deps import (
    get_activation_token_repository,
    get_booking_repository,
    get_review_repository,
    get_service_catalog_repository,
    get_sto_repository,
    get_sto_request_repository,
    get_sto_service_repository,
    get_user_repository,
    get_current_admin,
    get_current_admin_or_sto_owner,
    get_current_super_admin,
    get_db,
    require_admin_or_sto_owner_of_sto,
)
from app.models import Booking, City, Review, STO, STORequest, StoService, User
from app.models.enums import BookingStatus
from app.schemas.admin import (
    AdminAnalyticsPoint,
    AdminAnalyticsRangePoint,
    AdminBookingResponse,
    AdminReviewResponse,
    AdminSTOAnalyticsResponse,
    AdminSTODetailResponse,
    AdminSTODetailExtendedResponse,
    AdminSTOListItem,
    AdminSTORequestListResponse,
    AdminSTORequestResponse,
    AdminSTOServiceItem,
    AdminStatsResponse,
    AdminUserDetailResponse,
    AdminUserResponse,
    AdminUserUpdate,
    ApproveSTOResponse,
    RejectSTOResponse,
    RejectSTORequestBody,
)
from app.schemas.service_catalog import (
    AdminCatalogCreate,
    AdminCatalogItemResponse,
    AdminCatalogUpdate,
)
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["admin"])


def get_admin_service(
    sto_repo=Depends(get_sto_repository),
    user_repo=Depends(get_user_repository),
    booking_repo=Depends(get_booking_repository),
    review_repo=Depends(get_review_repository),
    sto_service_repo=Depends(get_sto_service_repository),
    activation_token_repo=Depends(get_activation_token_repository),
    sto_request_repo=Depends(get_sto_request_repository),
    catalog_repo=Depends(get_service_catalog_repository),
) -> AdminService:
    return AdminService(
        sto_repo,
        user_repo,
        booking_repo,
        review_repo,
        sto_service_repo,
        activation_token_repo,
        sto_request_repo,
        catalog_repo,
    )


def _first_day_of_month() -> date:
    today = date.today()
    return today.replace(day=1)


def _calculate_delta(current: int | float, comparison: int | float) -> float:
    """Calculate percent change. If comparison==0: 100 if current>0 else 0. Rounded to 1 decimal."""
    if comparison == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - comparison) / comparison) * 100, 1)


def _iter_buckets(from_date: date, to_date: date, group_by: str) -> list[date]:
    """Generate bucket start dates for group_by (day|week|month)."""
    buckets: list[date] = []
    if group_by == "day":
        d = from_date
        while d <= to_date:
            buckets.append(d)
            d += timedelta(days=1)
    elif group_by == "week":
        # Monday of week containing from_date
        d = from_date - timedelta(days=from_date.weekday())
        while d <= to_date:
            buckets.append(d)
            d += timedelta(days=7)
    else:  # month
        d = from_date.replace(day=1)
        while d <= to_date:
            buckets.append(d)
            if d.month == 12:
                d = d.replace(year=d.year + 1, month=1)
            else:
                d = d.replace(month=d.month + 1)
    return buckets


@router.get("/stats")
async def get_admin_stats(
    date_from: date | None = Query(None, description="YYYY-MM-DD"),
    date_to: date | None = Query(None, description="YYYY-MM-DD"),
    current_user: dict = Depends(get_current_admin_or_sto_owner),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Статистика для админ-панели. С date_from/date_to — расширенная с activity_by_day."""
    print("CURRENT ROLE:", current_user.get("role"))  # noqa: T201 — debug
    start = date_from or _first_day_of_month()
    end = date_to or date.today()
    if start > end:
        start, end = end, start
    extended = await admin_svc.get_stats_extended(date_from=start, date_to=end)
    data = {
        "users_total": extended.users_total,
        "users_new": extended.users_new,
        "stos_total": extended.stos_total,
        "bookings_total": extended.bookings_total,
        "bookings_completed": extended.bookings_completed,
        "revenue_total": extended.revenue_total,
        "average_rating": extended.average_rating,
        "activity_by_day": [x.model_dump() for x in extended.activity_by_day],
    }
    return {"success": True, "data": data}


@router.get("/finance/summary")
async def get_finance_summary(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    _user: dict = Depends(get_current_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Сводка по финансам: revenue_total, revenue_by_day. date_from/date_to — по умолчанию месяц."""
    start = date_from or _first_day_of_month()
    end = date_to or date.today()
    if start > end:
        start, end = end, start
    summary = await admin_svc.get_finance_summary(date_from=start, date_to=end)
    return {
        "success": True,
        "data": {
            "revenue_total": summary.revenue_total,
            "commission_total": summary.commission_total,
            "sto_payout_total": summary.sto_payout_total,
            "revenue_by_day": [x.model_dump() for x in summary.revenue_by_day],
        },
    }


@router.get("/sto-requests")
async def list_sto_requests(
    status: str | None = Query(None, description="Фильтр: pending, approved, rejected"),
    page: int = Query(1, ge=1, description="Страница"),
    per_page: int = Query(20, ge=1, le=100, description="Записей на странице"),
    _user: dict = Depends(get_current_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Список заявок на подключение СТО. Только admin."""
    result = await admin_svc.get_sto_requests_paginated(status=status, page=page, per_page=per_page)
    return {"success": True, "data": result.model_dump() if hasattr(result, "model_dump") else result}


@router.get("/sto-requests/{request_id}")
async def get_sto_request_detail(
    request_id: UUID,
    _user: dict = Depends(get_current_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Полные данные заявки по UUID. Только admin."""
    from app.core.exceptions import NotFoundError, Errors

    detail = await admin_svc.get_sto_request_by_id(request_id)
    if not detail:
        raise NotFoundError(*Errors.STO_NOT_FOUND)
    return {"success": True, "data": detail}


@router.post("/sto-requests/{request_id}/approve", response_model=ApproveSTOResponse)
async def approve_sto_request(
    request_id: UUID = Path(..., description="UUID заявки из sto_requests"),
    _user: dict = Depends(get_current_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Одобрить заявку СТО (sto_requests). Создаёт User, STO, отправляет email. Только admin."""
    return await admin_svc.approve_sto_request_by_uuid(request_id)


@router.patch("/sto/{sto_id}/approve", response_model=ApproveSTOResponse)
async def approve_sto(
    sto_id: int = Path(..., gt=0),
    _user: dict = Depends(get_current_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Одобрить заявку СТО (alias). Только admin."""
    return await admin_svc.approve_sto(sto_id)


@router.post("/sto-requests/{request_id}/reject", response_model=RejectSTOResponse)
async def reject_sto_request(
    request_id: UUID,
    body: RejectSTORequestBody,
    _user: dict = Depends(get_current_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Отклонить заявку СТО. Сохраняет reason, отправляет email с причиной. Только admin."""
    return await admin_svc.reject_sto_request_by_uuid(request_id, reason=body.reason)


@router.patch("/sto/{sto_id}/reject", response_model=RejectSTOResponse)
async def reject_sto(
    sto_id: int = Path(..., gt=0),
    _user: dict = Depends(get_current_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Отклонить заявку СТО. Только admin."""
    return await admin_svc.reject_sto(sto_id)


def _trunc_expr(col, group_by: str):
    """Return SQL expression for grouping by day/week/month."""
    if group_by == "day":
        return cast(col, Date)
    if group_by == "week":
        return cast(func.date_trunc("week", col), Date)
    return cast(func.date_trunc("month", col), Date)


async def _build_analytics_response(
    db: AsyncSession,
    from_date: date,
    to_date: date,
    city_id: int | None = None,
    sto_id: int | None = None,
    group_by: str = "day",
) -> list[dict]:
    """Build analytics array for date range. group_by: day|week|month."""
    buckets = _iter_buckets(from_date, to_date, group_by)
    bucket_set = {b.isoformat() for b in buckets}

    include_users = sto_id is None
    include_stos = sto_id is None

    def _day(col):
        return _trunc_expr(col, group_by)

    # Users
    users_map: dict[str, int] = {}
    if include_users:
        users_day = _day(User.created_at)
        users_stmt = (
            select(users_day.label("d"), func.count(User.id).label("c"))
            .where(users_day >= from_date, users_day <= to_date)
        )
        if city_id is not None:
            users_stmt = users_stmt.where(User.city_id == city_id)
        users_stmt = users_stmt.group_by(users_day)
        users_result = await db.execute(users_stmt)
        for row in users_result.all():
            dstr = str(row.d)
            if dstr in bucket_set:
                users_map[dstr] = row.c

    # STOs
    stos_map: dict[str, int] = {}
    if include_stos:
        stos_day = _day(STO.created_at)
        stos_stmt = (
            select(stos_day.label("d"), func.count(STO.id).label("c"))
            .where(stos_day >= from_date, stos_day <= to_date)
        )
        if city_id is not None:
            stos_stmt = stos_stmt.where(STO.city_id == city_id)
        stos_stmt = stos_stmt.group_by(stos_day)
        stos_result = await db.execute(stos_stmt)
        for row in stos_result.all():
            dstr = str(row.d)
            if dstr in bucket_set:
                stos_map[dstr] = row.c
    elif sto_id is not None:
        sto_result = await db.execute(select(STO.created_at).where(STO.id == sto_id))
        row = sto_result.scalar_one_or_none()
        if row and row[0]:
            created_d = row[0].date() if hasattr(row[0], "date") else date.fromisoformat(str(row[0])[:10])
            dstr = created_d.isoformat()
            if dstr in bucket_set:
                stos_map[dstr] = 1

    # Bookings total
    bookings_day = _day(Booking.created_at)
    bookings_stmt = (
        select(bookings_day.label("d"), func.count(Booking.id).label("c"))
        .where(bookings_day >= from_date, bookings_day <= to_date)
    )
    if sto_id is not None:
        bookings_stmt = bookings_stmt.where(Booking.sto_id == sto_id)
    elif city_id is not None:
        subq = select(STO.id).where(STO.city_id == city_id)
        bookings_stmt = bookings_stmt.where(Booking.sto_id.in_(subq))
    bookings_stmt = bookings_stmt.group_by(bookings_day)
    bookings_result = await db.execute(bookings_stmt)
    bookings_map = {str(row.d): row.c for row in bookings_result.all() if str(row.d) in bucket_set}

    # Bookings completed
    completed_day = _day(Booking.created_at)
    completed_stmt = (
        select(completed_day.label("d"), func.count(Booking.id).label("c"))
        .where(
            Booking.status == BookingStatus.completed,
            completed_day >= from_date,
            completed_day <= to_date,
        )
    )
    if sto_id is not None:
        completed_stmt = completed_stmt.where(Booking.sto_id == sto_id)
    elif city_id is not None:
        subq = select(STO.id).where(STO.city_id == city_id)
        completed_stmt = completed_stmt.where(Booking.sto_id.in_(subq))
    completed_stmt = completed_stmt.group_by(completed_day)
    completed_result = await db.execute(completed_stmt)
    completed_map = {str(row.d): row.c for row in completed_result.all() if str(row.d) in bucket_set}

    # Revenue (always, from StoService)
    rev_day = _day(Booking.created_at)
    rev_stmt = (
        select(rev_day.label("d"), func.coalesce(func.sum(StoService.price), 0).label("rev"))
        .select_from(Booking)
        .join(StoService, and_(
            Booking.sto_id == StoService.sto_id,
            Booking.service_id == StoService.service_id,
        ))
        .where(
            Booking.status == BookingStatus.completed,
            rev_day >= from_date,
            rev_day <= to_date,
        )
    )
    if sto_id is not None:
        rev_stmt = rev_stmt.where(Booking.sto_id == sto_id)
    elif city_id is not None:
        subq = select(STO.id).where(STO.city_id == city_id)
        rev_stmt = rev_stmt.where(Booking.sto_id.in_(subq))
    rev_stmt = rev_stmt.group_by(rev_day)
    rev_result = await db.execute(rev_stmt)
    revenue_map = {str(row.d): round(float(row.rev), 2) for row in rev_result.all() if str(row.d) in bucket_set}

    # Average rating per bucket (reviews created in period, filter by sto when applicable)
    rating_day = _day(Review.created_at)
    rating_stmt = (
        select(rating_day.label("d"), func.coalesce(func.avg(Review.rating), 0).label("avg"))
        .where(rating_day >= from_date, rating_day <= to_date)
    )
    if sto_id is not None:
        rating_stmt = rating_stmt.where(Review.sto_id == sto_id)
    elif city_id is not None:
        subq = select(STO.id).where(STO.city_id == city_id)
        rating_stmt = rating_stmt.where(Review.sto_id.in_(subq))
    rating_stmt = rating_stmt.group_by(rating_day)
    rating_result = await db.execute(rating_stmt)
    rating_map = {str(row.d): round(float(row.avg), 2) for row in rating_result.all() if str(row.d) in bucket_set}

    result = []
    for d in buckets:
        dstr = d.isoformat()
        result.append({
            "date": dstr,
            "users": users_map.get(dstr, 0),
            "bookings": bookings_map.get(dstr, 0),
            "bookings_completed": completed_map.get(dstr, 0),
            "stos": stos_map.get(dstr, 0),
            "revenue": revenue_map.get(dstr, 0.0),
            "average_rating": rating_map.get(dstr, 0.0),
        })
    return result


async def _build_cities_breakdown(
    db: AsyncSession,
    from_date: date,
    to_date: date,
    city_id: int | None = None,
    sto_id: int | None = None,
) -> list[dict]:
    """Bookings count per city for PieChart. Returns [{name, value}, ...]."""
    bookings_day = cast(func.date_trunc("day", Booking.created_at), Date)
    stmt = (
        select(City.name.label("name"), func.count(Booking.id).label("value"))
        .select_from(Booking)
        .join(STO, Booking.sto_id == STO.id)
        .join(City, STO.city_id == City.id)
        .where(bookings_day >= from_date, bookings_day <= to_date)
    )
    if sto_id is not None:
        stmt = stmt.where(Booking.sto_id == sto_id)
    elif city_id is not None:
        stmt = stmt.where(STO.city_id == city_id)
    stmt = stmt.group_by(City.id, City.name).order_by(func.count(Booking.id).desc())
    result = await db.execute(stmt)
    return [{"name": row.name, "value": row.value} for row in result.all()]


@router.get("/analytics")
async def get_analytics(
    from_date: date = Query(..., alias="from", description="YYYY-MM-DD"),
    to_date: date = Query(..., alias="to", description="YYYY-MM-DD"),
    city_id: int | None = Query(None, description="Filter by city"),
    sto_id: int | None = Query(None, description="Filter by STO (only that STO)"),
    compare_from: date | None = Query(None, alias="compare_from", description="Comparison period start"),
    compare_to: date | None = Query(None, alias="compare_to", description="Comparison period end"),
    group_by: str = Query("day", description="Aggregation: day|week|month"),
    _user: dict = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Аналитика: users, bookings, bookings_completed, stos, revenue, average_rating.
    Только super_admin. group_by: day|week|month.
    """
    if group_by not in ("day", "week", "month"):
        raise HTTPException(status_code=400, detail="group_by must be day, week, or month")
    if from_date > to_date:
        raise HTTPException(status_code=400, detail="from must be <= to")
    if (to_date - from_date).days > 365:
        raise HTTPException(status_code=400, detail="Date range must not exceed 365 days")

    if sto_id is not None:
        sto_check = await db.execute(select(STO.id).where(STO.id == sto_id))
        if sto_check.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="СТО не найдено")

    current_result = await _build_analytics_response(db, from_date, to_date, city_id, sto_id, group_by)
    by_city = await _build_cities_breakdown(db, from_date, to_date, city_id, sto_id)

    if compare_from is not None and compare_to is not None:
        if compare_from > compare_to:
            raise HTTPException(status_code=400, detail="compare_from must be <= compare_to")
        if (compare_to - compare_from).days > 365:
            raise HTTPException(status_code=400, detail="Comparison range must not exceed 365 days")
        comparison_result = await _build_analytics_response(db, compare_from, compare_to, city_id, sto_id, group_by)

        sum_users_cur = sum(r.get("users", 0) for r in current_result)
        sum_bookings_cur = sum(r.get("bookings", 0) for r in current_result)
        sum_stos_cur = sum(r.get("stos", 0) for r in current_result)
        sum_revenue_cur = sum(r.get("revenue", 0) for r in current_result)
        sum_users_cmp = sum(r.get("users", 0) for r in comparison_result)
        sum_bookings_cmp = sum(r.get("bookings", 0) for r in comparison_result)
        sum_stos_cmp = sum(r.get("stos", 0) for r in comparison_result)
        sum_revenue_cmp = sum(r.get("revenue", 0) for r in comparison_result)

        kpi = {
            "users": {
                "current_total": sum_users_cur,
                "comparison_total": sum_users_cmp,
                "delta_percent": _calculate_delta(sum_users_cur, sum_users_cmp),
            },
            "bookings": {
                "current_total": sum_bookings_cur,
                "comparison_total": sum_bookings_cmp,
                "delta_percent": _calculate_delta(sum_bookings_cur, sum_bookings_cmp),
            },
            "stos": {
                "current_total": sum_stos_cur,
                "comparison_total": sum_stos_cmp,
                "delta_percent": _calculate_delta(sum_stos_cur, sum_stos_cmp),
            },
            "revenue": {
                "current_total": round(sum_revenue_cur, 2),
                "comparison_total": round(sum_revenue_cmp, 2),
                "delta_percent": _calculate_delta(sum_revenue_cur, sum_revenue_cmp),
            },
        }

        return {
            "current": current_result,
            "comparison": comparison_result,
            "kpi": kpi,
            "by_city": by_city,
        }

    return {"current": current_result, "by_city": by_city}


@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    role: str | None = Query(None),
    _user: dict = Depends(get_current_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Список пользователей с пагинацией. Только admin."""
    items, total = await admin_svc.get_users(page, per_page, search, role)
    return {
        "success": True,
        "data": {"items": items, "total": total, "page": page, "per_page": per_page},
    }


@router.post("/users/{user_id}/resend-activation")
async def resend_activation(
    user_id: int = Path(..., gt=0),
    _user: dict = Depends(get_current_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Повторно отправить письмо активации. Только admin."""
    return await admin_svc.resend_activation(user_id)


@router.get("/users/{user_id}")
async def get_user_detail(
    user_id: int = Path(..., gt=0),
    _user: dict = Depends(get_current_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Детали пользователя. Только admin."""
    from fastapi import HTTPException

    detail = await admin_svc.get_user_detail(user_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return {"success": True, "data": detail.model_dump() if hasattr(detail, "model_dump") else detail}


@router.put("/users/{user_id}")
async def update_user(
    user_id: int = Path(..., gt=0),
    body: AdminUserUpdate = ...,
    _user: dict = Depends(get_current_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Обновить пользователя (role, city_id). Только admin."""
    await admin_svc.update_user(user_id, role=body.role, city_id=body.city_id)
    return {"success": True, "data": {"id": user_id, "updated": True}}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int = Path(..., gt=0),
    _user: dict = Depends(get_current_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Удалить пользователя. Нельзя удалить super_admin."""
    deleted = await admin_svc.delete_user(user_id)
    if not deleted:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return {"success": True, "data": {"id": user_id, "deleted": True}}


@router.patch("/users/{user_id}/block")
async def block_user(
    user_id: int = Path(..., gt=0),
    _user: dict = Depends(get_current_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Заблокировать пользователя (is_active=False)."""
    ok = await admin_svc.block_user(user_id)
    return {"success": True, "data": {"id": user_id, "blocked": ok}}


@router.patch("/users/{user_id}/unblock")
async def unblock_user(
    user_id: int = Path(..., gt=0),
    _user: dict = Depends(get_current_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Разблокировать пользователя (is_active=True)."""
    ok = await admin_svc.unblock_user(user_id)
    return {"success": True, "data": {"id": user_id, "unblocked": ok}}


@router.get("/stos")
async def list_stos(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_admin_or_sto_owner),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Список СТО. Admin/Super Admin — все без фильтров; STO Owner — только свои."""
    role = (user.get("role") or "").strip()
    if role in ("admin", "super_admin"):
        # Прямой запрос всех STO без фильтров по статусу/поиску
        stmt = (
            select(STO)
            .options(selectinload(STO.city))
            .order_by(STO.created_at.desc())
        )
        total_result = await db.execute(select(func.count()).select_from(STO))
        total = (total_result.scalar() or 0)
        stmt = stmt.offset((page - 1) * per_page).limit(per_page)
        result = await db.execute(stmt)
        stos = list(result.scalars().unique().all())
        items = [
            AdminSTOListItem(
                id=s.id,
                name=s.name,
                address=s.address,
                status=s.status.value,
                rating=s.rating,
                city_id=s.city_id,
                city_name=s.city.name if s.city else None,
                owner_id=s.owner_id,
                created_at=s.created_at,
            )
            for s in stos
        ]
        return {
            "success": True,
            "data": {"items": items, "total": total, "page": page, "per_page": per_page},
        }
    # sto_owner — только свои СТО
    items, total = await admin_svc.get_stos_for_owner(
        user["id"], page=page, per_page=per_page, search=None, status=None
    )
    return {
        "success": True,
        "data": {"items": items, "total": total, "page": page, "per_page": per_page},
    }


@router.get("/sto/{sto_id}")
async def get_sto_detail(
    sto_id: int = Path(..., gt=0),
    _user: dict = Depends(require_admin_or_sto_owner_of_sto),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Детали СТО с услугами и статистикой. Admin — любой, STO Owner — только свой."""
    from fastapi import HTTPException

    detail = await admin_svc.get_sto_detail_extended(sto_id)
    if not detail:
        raise HTTPException(status_code=404, detail="СТО не найдено")
    return {"success": True, "data": detail.model_dump() if hasattr(detail, "model_dump") else detail}


@router.get("/stos/{sto_id}")
async def get_sto_by_id(
    sto_id: int = Path(..., gt=0),
    _user: dict = Depends(require_admin_or_sto_owner_of_sto),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Детали СТО по id (alias GET /admin/sto/{id})."""
    from fastapi import HTTPException

    detail = await admin_svc.get_sto_detail_extended(sto_id)
    if not detail:
        raise HTTPException(status_code=404, detail="СТО не найдено")
    return {"success": True, "data": detail.model_dump() if hasattr(detail, "model_dump") else detail}


@router.patch("/stos/{sto_id}/activate")
async def activate_sto(
    sto_id: int = Path(..., gt=0),
    _user: dict = Depends(get_current_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Активировать СТО (status=active). Только admin."""
    ok = await admin_svc.activate_sto(sto_id)
    return {"success": True, "data": {"id": sto_id, "activated": ok}}


@router.patch("/stos/{sto_id}/deactivate")
async def deactivate_sto(
    sto_id: int = Path(..., gt=0),
    _user: dict = Depends(get_current_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Деактивировать СТО (status=blocked). Только admin."""
    ok = await admin_svc.deactivate_sto(sto_id)
    return {"success": True, "data": {"id": sto_id, "deactivated": ok}}


@router.delete("/stos/{sto_id}")
async def delete_sto(
    sto_id: int = Path(..., gt=0),
    _user: dict = Depends(get_current_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Удалить СТО. Только admin."""
    ok = await admin_svc.delete_sto(sto_id)
    if not ok:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="СТО не найдено")
    return {"success": True, "data": {"id": sto_id, "deleted": True}}


@router.get("/sto/{sto_id}/services", response_model=list[AdminSTOServiceItem])
async def get_sto_services(
    sto_id: int = Path(..., gt=0),
    _user: dict = Depends(require_admin_or_sto_owner_of_sto),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Услуги и цены СТО. Admin — любой, STO Owner — только свой."""
    return await admin_svc.get_sto_services(sto_id)


@router.get("/sto/{sto_id}/analytics", response_model=AdminSTOAnalyticsResponse)
async def get_sto_analytics(
    sto_id: int = Path(..., gt=0),
    period: int = Query(30, description="7|30|90|365"),
    _user: dict = Depends(require_admin_or_sto_owner_of_sto),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """
    Аналитика по СТО. Admin видит любой СТО, STO Owner — только свой.
    """
    analytics = await admin_svc.get_sto_analytics(sto_id, period)
    if not analytics:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="СТО не найдено")
    return analytics


@router.get("/bookings")
async def list_bookings(
    sto_id: int | None = Query(None, description="Фильтр по СТО"),
    status: str | None = Query(None, description="pending|accepted|cancelled|completed"),
    date_from: date | None = Query(None, description="YYYY-MM-DD"),
    date_to: date | None = Query(None, description="YYYY-MM-DD"),
    limit: int = Query(500, ge=1, le=1000),
    user: dict = Depends(get_current_admin_or_sto_owner),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Записи. Admin — все, STO Owner — только свои СТО. Фильтры: status, date_from, date_to."""
    role = (user.get("role") or "").strip()
    if role not in ("admin", "super_admin"):
        sto_ids = await admin_svc.get_sto_ids_for_owner(user["id"])
        if not sto_ids:
            return {"success": True, "data": []}
        items = await admin_svc.get_bookings(
            sto_ids=sto_ids, limit=limit, status=status, date_from=date_from, date_to=date_to
        )
    else:
        items = await admin_svc.get_bookings(
            sto_id=sto_id, limit=limit, status=status, date_from=date_from, date_to=date_to
        )
    return {"success": True, "data": [x.model_dump() if hasattr(x, "model_dump") else x for x in items]}


@router.get("/bookings/{booking_id}")
async def get_booking_by_id(
    booking_id: int = Path(..., gt=0),
    _user: dict = Depends(get_current_admin_or_sto_owner),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Одна запись по id."""
    from fastapi import HTTPException

    detail = await admin_svc.get_booking_by_id(booking_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    return {"success": True, "data": detail.model_dump() if hasattr(detail, "model_dump") else detail}


@router.get("/reviews")
async def list_reviews(
    sto_id: int | None = Query(None, description="Фильтр по СТО"),
    limit: int = Query(500, ge=1, le=1000),
    user: dict = Depends(get_current_admin_or_sto_owner),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Отзывы. Admin — все, STO Owner — только свои СТО."""
    role = (user.get("role") or "").strip()
    if role not in ("admin", "super_admin"):
        sto_ids = await admin_svc.get_sto_ids_for_owner(user["id"])
        if not sto_ids:
            return {"success": True, "data": []}
        items = await admin_svc.get_reviews(sto_ids=sto_ids, limit=limit)
    else:
        items = await admin_svc.get_reviews(sto_id=sto_id, limit=limit)
    return {"success": True, "data": [x.model_dump() if hasattr(x, "model_dump") else x for x in items]}


@router.delete("/reviews/{review_id}")
async def delete_review(
    review_id: int = Path(..., gt=0),
    _user: dict = Depends(get_current_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Удалить отзыв. Только admin."""
    ok = await admin_svc.delete_review(review_id)
    if not ok:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Отзыв не найден")
    return {"success": True, "data": {"id": review_id, "deleted": True}}


# --- Catalog: GET /admin/services (super_admin only), POST/PATCH/DELETE idem ---

@router.get("/services")
async def get_all_services(
    _user: dict = Depends(get_current_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Список каталога услуг. Admin и super_admin могут просматривать. POST/PATCH/DELETE — только super_admin."""
    items = await admin_svc.list_catalog_admin()
    return {"success": True, "data": [x.model_dump() if hasattr(x, "model_dump") else x for x in items]}


@router.post("/services", response_model=AdminCatalogItemResponse, status_code=201)
async def create_admin_service(
    body: AdminCatalogCreate,
    user: dict = Depends(get_current_super_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Создать услугу в каталоге. Только super_admin."""
    return await admin_svc.create_catalog_item(body, user["id"], user.get("email", ""))


@router.patch("/services/{catalog_id}", response_model=AdminCatalogItemResponse)
async def update_admin_service(
    catalog_id: int = Path(..., gt=0),
    body: AdminCatalogUpdate = ...,
    user: dict = Depends(get_current_super_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Редактировать услугу в каталоге. Только super_admin."""
    return await admin_svc.update_catalog_item(catalog_id, body, user["id"], user.get("email", ""))


@router.delete("/services/{catalog_id}", status_code=204)
async def delete_admin_service(
    catalog_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_super_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    """Удалить услугу из каталога. Только super_admin."""
    await admin_svc.delete_catalog_item(catalog_id, user["id"], user.get("email", ""))
