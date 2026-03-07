"""Admin moderation and analytics service."""

import asyncio
import logging
import secrets
from datetime import date, datetime, timedelta, timezone

from app.core.config import settings
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError, Errors
from app.core.security import hash_password
from app.models.enums import STOStatus, UserRole
from app.repositories.activation_token_repository import ActivationTokenRepository
from app.repositories.booking_repository import BookingRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.service_catalog_repository import ServiceCatalogRepository
from app.repositories.sto_repository import STORepository
from app.repositories.sto_service_repository import StoServiceRepository
from app.repositories.sto_request_repository import STORequestRepository
from app.repositories.user_repository import UserRepository
from app.schemas.admin import (
    ActivityByDayItem,
    AdminAnalyticsPoint,
    AdminAnalyticsRangePoint,
    AdminBookingResponse,
    FinanceSummaryResponse,
    STOPopularService,
    STOAnalyticsChartPoint,
    AdminCityRef,
    AdminOwnerRef,
    AdminReviewResponse,
    AdminSTOAnalyticsResponse,
    AdminSTODetailResponse,
    AdminSTODetailExtendedResponse,
    AdminSTOListItem,
    AdminSTORequestListResponse,
    AdminSTORequestResponse,
    AdminSTOServiceItem,
    AdminSTOServiceSimple,
    AdminStatsResponse,
    AdminStatsExtendedResponse,
    AdminUserDetailResponse,
    AdminUserResponse,
    ApproveSTOResponse,
    RejectSTOResponse,
)

logger = logging.getLogger(__name__)


def _parse_period(period: int) -> tuple[date, date]:
    """Parse period (days) to (start_date, end_date)."""
    today = date.today()
    allowed = (7, 30, 90, 365)
    days = period if period in allowed else 30
    start = today - timedelta(days=days)
    return start, today


def _fill_missing_dates(points: list[tuple[str, int]], start: date, end: date) -> list[AdminAnalyticsPoint]:
    """Fill missing dates with 0."""
    point_map = {p[0]: p[1] for p in points}
    out: list[AdminAnalyticsPoint] = []
    d = start
    while d <= end:
        dstr = str(d)
        out.append(AdminAnalyticsPoint(date=dstr, count=point_map.get(dstr, 0)))
        d += timedelta(days=1)
    return out


def _first_day_of_month() -> date:
    today = date.today()
    return today.replace(day=1)


class AdminService:
    def __init__(
        self,
        sto_repo: STORepository,
        user_repo: UserRepository,
        booking_repo: BookingRepository,
        review_repo: ReviewRepository,
        sto_service_repo: StoServiceRepository,
        activation_token_repo: ActivationTokenRepository,
        sto_request_repo: STORequestRepository | None = None,
        catalog_repo: ServiceCatalogRepository | None = None,
    ):
        self.sto_repo = sto_repo
        self.user_repo = user_repo
        self.booking_repo = booking_repo
        self.review_repo = review_repo
        self.sto_service_repo = sto_service_repo
        self.activation_token_repo = activation_token_repo
        self.sto_request_repo = sto_request_repo
        self.catalog_repo = catalog_repo

    async def search_by_id(
        self, entity_id: int
    ) -> dict | None:
        """
        Search by ID: user or STO.
        Returns {"type": "user", "data": {...}} or {"type": "sto", "data": {...}}.
        Returns None if not found. User has priority over STO when both exist.
        """
        user = await self.user_repo.get_by_id(entity_id)
        if user is not None:
            return {
                "type": "user",
                "data": {
                    "id": user.id,
                    "email": user.email,
                    "role": user.role.value if hasattr(user.role, "value") else str(user.role),
                    "city_id": user.city_id,
                },
            }
        sto = await self.sto_repo.get_by_id_with_services(entity_id)
        if sto is not None:
            city_name = sto.city.name if sto.city else ""
            return {
                "type": "sto",
                "data": {
                    "id": sto.id,
                    "name": sto.name,
                    "city": city_name,
                    "status": sto.status.value if hasattr(sto.status, "value") else str(sto.status),
                },
            }
        return None

    async def get_stats(self) -> AdminStatsResponse:
        """Get admin dashboard stats. All queries run in parallel."""
        users_count, stos_count, pending_stos, pending_sto_requests, completed_services, average_rating = (
            await asyncio.gather(
                self.user_repo.count(),
                self.sto_repo.count_all(),
                self.sto_repo.count_pending(),
                self._count_pending_sto_requests(),
                self.booking_repo.count_completed(),
                self.review_repo.get_global_avg_rating(),
            )
        )
        pending_requests = pending_stos + pending_sto_requests
        return AdminStatsResponse(
            users_count=users_count,
            stos_count=stos_count,
            pending_requests=pending_requests,
            completed_services=completed_services,
            average_rating=round(average_rating, 2),
        )

    async def get_stats_for_owner(self, owner_id: int) -> AdminStatsResponse:
        """Get stats for STO owner (only their STOs)."""
        sto_ids = await self.sto_repo.get_ids_by_owner_id(owner_id)
        if not sto_ids:
            return AdminStatsResponse(
                users_count=0,
                stos_count=0,
                pending_requests=0,
                completed_services=0,
                average_rating=0.0,
            )
        tasks = [
            self.booking_repo.count_by_sto(sid) for sid in sto_ids
        ]
        counts_list = await asyncio.gather(*tasks)
        completed = sum(c["completed"] for c in counts_list)
        rating_tasks = [self.review_repo.get_rating_stats(sid) for sid in sto_ids]
        ratings = await asyncio.gather(*rating_tasks)
        total_reviews = sum(r[1] for r in ratings)
        if total_reviews > 0:
            weighted = sum(r[0] * r[1] for r in ratings)
            avg = weighted / total_reviews
        else:
            avg = 0.0
        return AdminStatsResponse(
            users_count=0,
            stos_count=len(sto_ids),
            pending_requests=0,
            completed_services=completed,
            average_rating=round(avg, 2),
        )

    async def get_stats_extended(
        self,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> AdminStatsExtendedResponse:
        """Admin stats with date range and activity_by_day. Default: first day of month — today."""
        start = date_from or _first_day_of_month()
        end = date_to or date.today()
        if start > end:
            start, end = end, start

        (
            users_total,
            users_new,
            stos_total,
            bookings_total,
            bookings_completed,
            revenue_total,
            average_rating,
            users_by_day,
            bookings_by_day,
            revenue_by_day,
        ) = await asyncio.gather(
            self.user_repo.count(),
            self.user_repo.count_created_between(start, end),
            self.sto_repo.count_all(),
            self.booking_repo.count_in_date_range_by_booking_date(start, end),
            self.booking_repo.count_completed_in_date_range_by_booking_date(start, end),
            self.booking_repo.revenue_in_date_range(start, end),
            self.review_repo.get_global_avg_rating(),
            self.user_repo.count_by_date_range(start, end),
            self.booking_repo.count_grouped_by_created_date(start, end),
            self.booking_repo.revenue_grouped_by_created_date(start, end),
        )
        users_map = {d: c for d, c in users_by_day}
        bookings_map = {d: c for d, c in bookings_by_day}
        revenue_map = {d: r for d, r in revenue_by_day}
        all_dates: set[str] = set(users_map) | set(bookings_map) | set(revenue_map)
        sorted_dates = sorted(all_dates) if all_dates else []
        activity_by_day = [
            ActivityByDayItem(
                date=d,
                users=users_map.get(d, 0),
                bookings=bookings_map.get(d, 0),
                revenue=revenue_map.get(d, 0.0),
            )
            for d in sorted_dates
        ]
        return AdminStatsExtendedResponse(
            users_total=users_total,
            users_new=users_new,
            stos_total=stos_total,
            bookings_total=bookings_total,
            bookings_completed=bookings_completed,
            revenue_total=round(float(revenue_total), 2),
            average_rating=round(float(average_rating), 2),
            activity_by_day=activity_by_day,
        )

    async def get_finance_summary(
        self,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> FinanceSummaryResponse:
        """Finance summary with revenue by day. Commission/payout placeholders."""
        start = date_from or _first_day_of_month()
        end = date_to or date.today()
        if start > end:
            start, end = end, start
        revenue_total = await self.booking_repo.revenue_in_date_range(start, end)
        revenue_by_day = await self.booking_repo.revenue_grouped_by_created_date(start, end)
        return FinanceSummaryResponse(
            revenue_total=round(float(revenue_total), 2),
            commission_total=0.0,
            sto_payout_total=0.0,
            revenue_by_day=[
                ActivityByDayItem(date=d, revenue=float(r)) for d, r in revenue_by_day
            ],
        )

    async def get_sto_ids_for_owner(self, owner_id: int) -> list[int]:
        """Get STO ids owned by user."""
        return await self.sto_repo.get_ids_by_owner_id(owner_id)

    async def _count_pending_sto_requests(self) -> int:
        """Count pending sto_requests (partner applications)."""
        if not self.sto_request_repo:
            return 0
        reqs = await self.sto_request_repo.get_all_pending()
        return len(reqs)

    def _sto_request_to_response(self, r) -> AdminSTORequestResponse:
        """Convert STORequest model to AdminSTORequestResponse."""
        return AdminSTORequestResponse(
            id=str(r.id),
            first_name=r.first_name,
            last_name=r.last_name,
            middle_name=r.middle_name,
            email=r.email,
            phone=r.phone,
            iin=r.iin,
            ip_name=r.ip_name,
            bin=r.bin,
            sto_name=r.sto_name,
            sto_description=r.sto_description,
            region_id=r.region_id,
            city_id=r.city_id,
            region_name=r.region.name if r.region else "",
            city_name=r.city.name if r.city else "",
            address=r.address,
            photo_url=r.photo_url,
            status=r.status,
            rejection_reason=getattr(r, "rejection_reason", None),
            created_at=r.created_at,
        )

    async def get_pending_sto_requests(self) -> list[AdminSTORequestResponse]:
        """Get all pending STO requests (from sto_requests table) for admin moderation."""
        if not self.sto_request_repo:
            return []
        reqs = await self.sto_request_repo.get_all_pending()
        return [self._sto_request_to_response(r) for r in reqs]

    async def get_sto_requests_paginated(
        self,
        status: str | None = None,
        page: int = 1,
        per_page: int = 20,
    ) -> AdminSTORequestListResponse:
        """Get STO requests with filter, pagination, sort by created_at DESC."""
        if not self.sto_request_repo:
            return AdminSTORequestListResponse(items=[], total=0, page=page, per_page=per_page)
        items, total = await self.sto_request_repo.get_all_paginated(
            status=status, page=page, per_page=per_page
        )
        return AdminSTORequestListResponse(
            items=[self._sto_request_to_response(r) for r in items],
            total=total,
            page=page,
            per_page=per_page,
        )

    async def get_sto_request_by_id(self, request_id) -> AdminSTORequestResponse | None:
        """Get full STO request detail by UUID."""
        from uuid import UUID

        if not self.sto_request_repo:
            return None
        req = await self.sto_request_repo.get_by_id(UUID(str(request_id)))
        if not req:
            return None
        return self._sto_request_to_response(req)

    async def approve_sto_request_by_uuid(self, request_id) -> ApproveSTOResponse:
        """Approve sto_request: create User, create STO, send activation email."""
        from uuid import UUID

        if not self.sto_request_repo:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        req = await self.sto_request_repo.get_by_id(UUID(str(request_id)))
        if not req:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        if req.status != "pending":
            raise ConflictError(*Errors.STO_NOT_PENDING)

        if await self.user_repo.email_exists(req.email):
            raise ConflictError(*Errors.EMAIL_EXISTS)

        # Create User (sto_owner)
        # Use stored password_hash if partner set password at registration, else temp + activation
        pwd_hash = getattr(req, "password_hash", None) if req else None
        if pwd_hash:
            user = await self.user_repo.create(
                email=req.email.strip().lower(),
                password_hash=pwd_hash,
                role=UserRole.sto_owner,
                city_id=req.city_id,
            )
            await self.user_repo.update_is_active(user.id, True)
        else:
            temp_password = secrets.token_urlsafe(24)
            user = await self.user_repo.create(
                email=req.email.strip().lower(),
                password_hash=hash_password(temp_password),
                role=UserRole.sto_owner,
                city_id=req.city_id,
            )
            await self.user_repo.update_is_active(user.id, False)

        # Create STO
        from app.models import STO
        from app.models.enums import STOStatus

        slug_base = (req.sto_name or "sto").lower().replace(" ", "-").replace("_", "-")
        while "--" in slug_base:
            slug_base = slug_base.replace("--", "-")
        slug_base = slug_base.strip("-") or "sto"
        slug = slug_base
        n = 0
        while await self.sto_repo.get_by_slug(slug) is not None:
            n += 1
            slug = f"{slug_base}-{n}"
        sto = STO(
            name=req.sto_name,
            slug=slug,
            description=req.sto_description,
            address=req.address,
            city_id=req.city_id,
            owner_id=user.id,
            rating=0.0,
            status=STOStatus.active,
            phone=req.phone,
            image_url=req.photo_url,
        )
        self.sto_repo.db.add(sto)
        await self.sto_repo.db.flush()
        await self.sto_repo.db.refresh(sto)

        # Send email: welcome (if password set) or activation (set-password link)
        from app.services.email_service import (
            send_partner_activation_email,
            send_partner_welcome_email,
        )

        if pwd_hash:
            login_url = f"{settings.partner_frontend_url}/login"
            if not send_partner_welcome_email(req.email, login_url):
                raise ConflictError(*Errors.EMAIL_SEND_FAILED)
        else:
            token_str = secrets.token_urlsafe(32)
            expires_at = datetime.now(timezone.utc) + timedelta(
                hours=settings.activation_token_expire_hours
            )
            await self.activation_token_repo.create(user.id, token_str, expires_at)
            activation_link = (
                f"{settings.partner_frontend_url}/set-password?token={token_str}"
            )
            if not send_partner_activation_email(req.email, activation_link):
                raise ConflictError(*Errors.EMAIL_SEND_FAILED)

        await self.sto_request_repo.update_status(req.id, "approved")

        logger.info(
            "STO request approved: id=%s, user_id=%s, sto_id=%s",
            req.id,
            user.id,
            sto.id,
        )
        return ApproveSTOResponse(message="STO approved and activation email sent")

    async def reject_sto_request_by_uuid(
        self, request_id, reason: str | None = None
    ) -> RejectSTOResponse:
        """Reject sto_request: update status, save reason, send email."""
        from uuid import UUID

        from app.services.email_service import send_partner_rejection_email

        if not self.sto_request_repo:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        req = await self.sto_request_repo.get_by_id(UUID(str(request_id)))
        if not req:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        if req.status != "pending":
            raise ConflictError(*Errors.STO_NOT_PENDING)

        await self.sto_request_repo.update_rejection(
            req.id, status="rejected", reason=(reason or "").strip() or None
        )

        if not send_partner_rejection_email(req.email, reason):
            raise ConflictError(*Errors.EMAIL_SEND_FAILED)

        logger.info(
            "STO request rejected: id=%s, email=%s, reason_len=%s",
            req.id,
            req.email,
            len(reason or ""),
        )
        return RejectSTOResponse()

    async def approve_sto(self, sto_id: int) -> ApproveSTOResponse:
        """Approve STO request: set status=active, owner role=sto_owner, send activation email."""
        sto = await self.sto_repo.get_by_id_with_owner(sto_id)
        if not sto:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        if sto.status != STOStatus.pending:
            raise ConflictError(*Errors.STO_NOT_PENDING)
        if not sto.owner_id or not sto.owner:
            raise NotFoundError(*Errors.STO_NOT_FOUND)

        owner = sto.owner
        await self.sto_repo.update_status(sto_id, STOStatus.active)
        await self.user_repo.update_role(owner.id, UserRole.sto_owner)
        await self.user_repo.update_is_active(owner.id, False)

        token_str = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(
            hours=settings.activation_token_expire_hours
        )
        await self.activation_token_repo.create(owner.id, token_str, expires_at)

        from app.services.email_service import send_partner_activation_email

        activation_link = (
            f"{settings.partner_frontend_url}/set-password?token={token_str}"
        )
        if not send_partner_activation_email(owner.email, activation_link):
            raise ConflictError(*Errors.EMAIL_SEND_FAILED)

        logger.info("STO approved: id=%s, owner_id=%s, activation email sent", sto_id, owner.id)
        return ApproveSTOResponse(message="STO approved and activation email sent")

    async def resend_activation(self, user_id: int) -> dict:
        """Resend activation email. Delete old tokens, create new, send email."""
        from app.services.email_service import send_partner_activation_email

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError(*Errors.USER_NOT_FOUND)
        if user.role.value not in ("sto_owner", "sto"):
            raise ConflictError(*Errors.FORBIDDEN)

        await self.activation_token_repo.delete_by_user_id(user_id)

        token_str = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(
            hours=settings.activation_token_expire_hours
        )
        await self.activation_token_repo.create(user_id, token_str, expires_at)

        activation_link = (
            f"{settings.partner_frontend_url}/set-password?token={token_str}"
        )
        if not send_partner_activation_email(user.email, activation_link):
            raise ConflictError(*Errors.EMAIL_SEND_FAILED)

        logger.info("Activation email resent: user_id=%s", user_id)
        return {"message": "Activation email sent"}

    async def reject_sto(self, sto_id: int) -> RejectSTOResponse:
        """Reject STO request: set status=rejected."""
        sto = await self.sto_repo.get_by_id(sto_id)
        if not sto:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        if sto.status != STOStatus.pending:
            raise ConflictError(*Errors.STO_NOT_PENDING)

        await self.sto_repo.update_status(sto_id, STOStatus.rejected)
        logger.info("STO rejected: id=%s", sto_id)
        return RejectSTOResponse()

    async def activate_sto(self, sto_id: int) -> bool:
        """Set STO status to active. Returns True if updated."""
        return await self.sto_repo.update_status(sto_id, STOStatus.active)

    async def deactivate_sto(self, sto_id: int) -> bool:
        """Set STO status to blocked. Returns True if updated."""
        return await self.sto_repo.update_status(sto_id, STOStatus.blocked)

    async def delete_sto(self, sto_id: int) -> bool:
        """Delete STO by id. Returns True if deleted."""
        return await self.sto_repo.delete_by_id(sto_id)

    async def get_analytics(
        self, period: int, analytics_type: str
    ) -> list[AdminAnalyticsPoint]:
        """Get analytics grouped by day. type: users|stos|services, period: 7|30|90|365."""
        start, end = _parse_period(period)
        if analytics_type == "users":
            points = await self.user_repo.count_by_date_range(start, end)
        elif analytics_type == "stos":
            points = await self.sto_repo.count_created_by_date_range(start, end)
        elif analytics_type == "services":
            points = await self.booking_repo.count_completed_by_date_range(start, end)
        else:
            points = []
        return _fill_missing_dates(points, start, end)

    async def get_analytics_range(
        self, date_from: date, date_to: date
    ) -> list[AdminAnalyticsRangePoint]:
        """Get analytics by date range: users, bookings, stos per day. Sorted by date ASC."""
        if date_from > date_to:
            date_from, date_to = date_to, date_from
        users_by_day, bookings_by_day, stos_by_day = await asyncio.gather(
            self.user_repo.count_by_date_range(date_from, date_to),
            self.booking_repo.count_grouped_by_created_date(date_from, date_to),
            self.sto_repo.count_created_by_date_range(date_from, date_to),
        )
        users_map = {d: c for d, c in users_by_day}
        bookings_map = {d: c for d, c in bookings_by_day}
        stos_map = {d: c for d, c in stos_by_day}
        result: list[AdminAnalyticsRangePoint] = []
        d = date_from
        while d <= date_to:
            dstr = str(d)
            result.append(
                AdminAnalyticsRangePoint(
                    date=dstr,
                    users=users_map.get(dstr, 0),
                    bookings=bookings_map.get(dstr, 0),
                    stos=stos_map.get(dstr, 0),
                )
            )
            d += timedelta(days=1)
        return result

    async def get_users(
        self, page: int = 1, per_page: int = 20, search: str | None = None, role: str | None = None
    ) -> tuple[list[AdminUserResponse], int]:
        """List users with pagination."""
        role_enum = None
        if role:
            try:
                role_enum = UserRole(role)
            except ValueError:
                pass
        items, total = await self.user_repo.list_paginated(
            page=page, per_page=per_page, search=search, role=role_enum
        )
        out = [
            AdminUserResponse(
                id=u.id,
                email=u.email,
                first_name=getattr(u, "first_name", None),
                last_name=getattr(u, "last_name", None),
                phone=getattr(u, "phone", None),
                car_brand=getattr(u, "car_brand", None),
                car_model=getattr(u, "car_model", None),
                car_year=getattr(u, "car_year", None),
                role=u.role.value,
                city_id=u.city_id,
                created_at=u.created_at,
                status="active",
            )
            for u in items
        ]
        return out, total

    async def get_user_detail(self, user_id: int) -> AdminUserDetailResponse | None:
        """Get full user detail for admin."""
        user = await self.user_repo.get_by_id_with_city(user_id)
        if not user:
            return None
        city_name = user.city.name if user.city else None
        bookings = await self.booking_repo.get_by_client_id(user_id)
        reviews = await self.review_repo.get_by_user_id(user_id)
        owned_stos: list[AdminSTOListItem] = []
        if user.role.value in ("sto_owner", "sto"):
            stos = await self.sto_repo.get_all_for_owner(
                user_id, page=1, per_page=100, search=None, status=None
            )
            items, _ = stos
            for s in items:
                city_name_s = s.city.name if s.city else None
                owned_stos.append(
                    AdminSTOListItem(
                        id=s.id,
                        name=s.name,
                        address=s.address,
                        status=s.status.value,
                        rating=s.rating,
                        city_id=s.city_id,
                        city_name=city_name_s,
                        owner_id=s.owner_id,
                        created_at=s.created_at,
                    )
                )
        booking_responses = [
            AdminBookingResponse(
                id=b.id,
                sto_id=b.sto_id,
                sto_name=b.sto.name if b.sto else None,
                client_email=b.client.email if b.client else None,
                service_name=b.catalog_service.name if b.catalog_service else None,
                date=str(b.date),
                time=str(b.time),
                status=b.status.value,
                created_at=b.created_at,
            )
            for b in bookings[:50]
        ]
        return AdminUserDetailResponse(
            id=user.id,
            email=user.email,
            first_name=getattr(user, "first_name", None),
            last_name=getattr(user, "last_name", None),
            phone=getattr(user, "phone", None),
            car_brand=getattr(user, "car_brand", None),
            car_model=getattr(user, "car_model", None),
            car_year=getattr(user, "car_year", None),
            role=user.role.value,
            city_id=user.city_id,
            city_name=city_name,
            created_at=user.created_at,
            status="active",
            bookings_count=len(bookings),
            reviews_count=len(reviews),
            bookings=booking_responses,
            owned_stos=owned_stos,
        )

    async def block_user(self, user_id: int) -> bool:
        """Block user (set is_active=False). Returns True if updated."""
        return await self.user_repo.update_is_active(user_id, False)

    async def unblock_user(self, user_id: int) -> bool:
        """Unblock user (set is_active=True). Returns True if updated."""
        return await self.user_repo.update_is_active(user_id, True)

    async def delete_user(self, user_id: int) -> bool:
        """Delete user by id. Returns True if deleted. Do not delete super_admin."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            return False
        if user.role == UserRole.super_admin:
            raise ForbiddenError(*Errors.SUPER_ADMIN_PROTECTED)
        return await self.user_repo.delete_by_id(user_id)

    async def update_user(
        self, user_id: int, role: str | None = None, city_id: int | None = None
    ) -> bool:
        """Update user role/city. Cannot change super_admin role. Returns True if updated."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            return False
        if role is not None:
            try:
                new_role = UserRole(role)
                if user.role == UserRole.super_admin and new_role != UserRole.super_admin:
                    raise ForbiddenError(*Errors.SUPER_ADMIN_PROTECTED)
                await self.user_repo.update_role(user_id, new_role)
            except ValueError:
                pass
        if city_id is not None:
            await self.user_repo.update_city(user_id, city_id)
        return True

    async def get_stos(
        self,
        page: int = 1,
        per_page: int = 20,
        search: str | None = None,
        status: str | None = None,
    ) -> tuple[list[AdminSTOListItem], int]:
        """List all STOs for admin."""
        status_enum = None
        if status:
            try:
                status_enum = STOStatus(status)
            except ValueError:
                pass
        items, total = await self.sto_repo.get_all_for_admin(
            page=page, per_page=per_page, search=search, status=status_enum
        )
        out = []
        for s in items:
            city_name = s.city.name if s.city else None
            out.append(
                AdminSTOListItem(
                    id=s.id,
                    name=s.name,
                    address=s.address,
                    status=s.status.value,
                    rating=s.rating,
                    city_id=s.city_id,
                    city_name=city_name,
                    owner_id=s.owner_id,
                    created_at=s.created_at,
                )
            )
        return out, total

    async def get_stos_for_owner(
        self,
        owner_id: int,
        page: int = 1,
        per_page: int = 20,
        search: str | None = None,
        status: str | None = None,
    ) -> tuple[list[AdminSTOListItem], int]:
        """List STOs for sto_owner (only their STOs)."""
        status_enum = None
        if status:
            try:
                status_enum = STOStatus(status)
            except ValueError:
                pass
        items, total = await self.sto_repo.get_all_for_owner(
            owner_id=owner_id,
            page=page,
            per_page=per_page,
            search=search,
            status=status_enum,
        )
        out = []
        for s in items:
            city_name = s.city.name if s.city else None
            out.append(
                AdminSTOListItem(
                    id=s.id,
                    name=s.name,
                    address=s.address,
                    status=s.status.value,
                    rating=s.rating,
                    city_id=s.city_id,
                    city_name=city_name,
                    owner_id=s.owner_id,
                    created_at=s.created_at,
                )
            )
        return out, total

    async def get_sto_detail(self, sto_id: int) -> AdminSTODetailResponse | None:
        """Get full STO detail for admin."""
        sto = await self.sto_repo.get_by_id_with_services(sto_id)
        if not sto:
            return None
        city = sto.city
        owner = sto.owner
        return AdminSTODetailResponse(
            id=sto.id,
            name=sto.name,
            address=sto.address,
            description=sto.description,
            phone=sto.phone,
            whatsapp=sto.whatsapp,
            status=sto.status.value,
            rating=sto.rating,
            city=AdminCityRef(id=city.id, name=city.name) if city else AdminCityRef(id=0, name=""),
            owner=AdminOwnerRef(id=owner.id, email=owner.email) if owner else None,
            created_at=sto.created_at,
        )

    async def get_sto_detail_extended(
        self, sto_id: int
    ) -> AdminSTODetailExtendedResponse | None:
        """Get STO detail with services and stats."""
        detail = await self.get_sto_detail(sto_id)
        if not detail:
            return None
        services = await self.get_sto_services(sto_id)
        counts = await self.booking_repo.count_by_sto(sto_id)
        revenue = await self.booking_repo.revenue_by_sto(sto_id)
        services_simple = [
            AdminSTOServiceSimple(
                id=ss.service_id,
                name=ss.name,
                price=ss.price,
            )
            for ss in services
        ]
        return AdminSTODetailExtendedResponse(
            id=detail.id,
            name=detail.name,
            address=detail.address,
            description=detail.description,
            phone=detail.phone,
            whatsapp=detail.whatsapp,
            status=detail.status,
            rating=detail.rating,
            city=detail.city,
            owner=detail.owner,
            created_at=detail.created_at,
            services=services_simple,
            total_bookings=counts["total"],
            completed_bookings=counts["completed"],
            revenue=round(revenue, 2),
            clients_count=counts["unique_clients"],
        )

    async def get_sto_services(self, sto_id: int) -> list[AdminSTOServiceItem]:
        """Get services with prices for STO."""
        items = await self.sto_service_repo.get_by_sto_id(sto_id)
        return [
            AdminSTOServiceItem(
                service_id=ss.service_id,
                name=ss.catalog_item.name if ss.catalog_item else "?",
                category=ss.catalog_item.category if ss.catalog_item else "",
                price=float(ss.price),
                duration_minutes=ss.duration_minutes,
            )
            for ss in items
        ]

    async def get_sto_analytics(
        self, sto_id: int, period: int = 30
    ) -> AdminSTOAnalyticsResponse | None:
        """Get analytics for single STO. Admin or STO owner."""
        sto = await self.sto_repo.get_by_id(sto_id)
        if not sto:
            return None
        counts = await self.booking_repo.count_by_sto(sto_id)
        revenue = await self.booking_repo.revenue_by_sto(sto_id)
        avg_rating, _ = await self.review_repo.get_rating_stats(sto_id)
        popular = await self.booking_repo.popular_services_by_sto(sto_id, limit=5)
        popular_list = [
            STOPopularService(service_name=s[1], count=s[2]) for s in popular
        ]
        start, end = _parse_period(period)
        chart_raw = await self.booking_repo.count_completed_by_sto_and_date_range(
            sto_id, start, end
        )
        point_map = {p[0]: p[1] for p in chart_raw}
        chart: list[STOAnalyticsChartPoint] = []
        d = start
        while d <= end:
            dstr = str(d)
            chart.append(STOAnalyticsChartPoint(date=dstr, bookings=point_map.get(dstr, 0)))
            d += timedelta(days=1)
        return AdminSTOAnalyticsResponse(
            total_bookings=counts["total"],
            completed=counts["completed"],
            cancelled=counts["cancelled"],
            revenue=round(revenue, 2),
            average_rating=round(avg_rating, 2),
            clients_count=counts["unique_clients"],
            popular_services=popular_list,
            chart=chart,
        )

    async def get_bookings(
        self,
        sto_id: int | None = None,
        sto_ids: list[int] | None = None,
        limit: int = 500,
        status: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[AdminBookingResponse]:
        """Get all bookings for admin or sto_owner. Optional filters: status, date_from, date_to (booking date)."""
        if sto_ids:
            bookings = await self.booking_repo.get_all_for_admin(
                sto_ids=sto_ids,
                limit=limit,
                status=status,
                date_from=date_from,
                date_to=date_to,
            )
        else:
            bookings = await self.booking_repo.get_all_for_admin(
                sto_id=sto_id,
                limit=limit,
                status=status,
                date_from=date_from,
                date_to=date_to,
            )
        out = []
        for b in bookings:
            sto_name = b.sto.name if b.sto else None
            client_email = b.client.email if b.client else None
            svc_name = b.catalog_service.name if b.catalog_service else None
            out.append(
                AdminBookingResponse(
                    id=b.id,
                    sto_id=b.sto_id,
                    sto_name=sto_name,
                    client_email=client_email,
                    service_name=svc_name,
                    date=str(b.date),
                    time=str(b.time),
                    status=b.status.value,
                    created_at=b.created_at,
                )
            )
        return out

    async def get_reviews(
        self,
        sto_id: int | None = None,
        sto_ids: list[int] | None = None,
        limit: int = 500,
    ) -> list[AdminReviewResponse]:
        """Get all reviews for admin or sto_owner."""
        if sto_ids:
            reviews = await self.review_repo.get_all_for_admin(
                sto_ids=sto_ids, limit=limit
            )
        else:
            reviews = await self.review_repo.get_all_for_admin(
                sto_id=sto_id, limit=limit
            )
        out = []
        for r in reviews:
            sto_name = r.sto.name if r.sto else None
            user_email = r.user.email if r.user else None
            out.append(
                AdminReviewResponse(
                    id=r.id,
                    sto_id=r.sto_id,
                    sto_name=sto_name,
                    user_email=user_email,
                    rating=r.rating,
                    comment=r.comment,
                    created_at=r.created_at,
                )
            )
        return out

    async def get_booking_by_id(self, booking_id: int) -> AdminBookingResponse | None:
        """Get single booking by id for admin."""
        b = await self.booking_repo.get_by_id_with_relations(booking_id)
        if not b:
            return None
        return AdminBookingResponse(
            id=b.id,
            sto_id=b.sto_id,
            sto_name=b.sto.name if b.sto else None,
            client_email=b.client.email if b.client else None,
            service_name=b.catalog_service.name if b.catalog_service else None,
            date=str(b.date),
            time=str(b.time),
            status=b.status.value,
            created_at=b.created_at,
        )

    async def delete_review(self, review_id: int) -> bool:
        """Delete review by id. Returns True if deleted."""
        return await self.review_repo.delete_by_id(review_id)

    # --- Catalog (super_admin only) ---

    async def list_catalog_admin(self) -> list:
        """List all catalog items for admin panel. Requires catalog_repo."""
        if not self.catalog_repo:
            return []
        from app.schemas.service_catalog import AdminCatalogItemResponse

        items = await self.catalog_repo.get_all()
        return [
            AdminCatalogItemResponse(
                id=c.id,
                name=c.name,
                category=c.category,
                description=getattr(c, "description", None),
                is_active=c.is_active,
            )
            for c in items
        ]

    async def create_catalog_item(self, payload, user_id: int, user_email: str):
        """Create catalog item. Log who, what, when."""
        if not self.catalog_repo:
            raise NotFoundError(Errors.NOT_FOUND[0], "Catalog not configured")
        from app.schemas.service_catalog import AdminCatalogItemResponse

        item = await self.catalog_repo.create(
            name=payload.name,
            category=payload.category,
            description=payload.description,
            is_active=payload.is_active,
        )
        logger.info(
            "catalog_create user_id=%s email=%s catalog_id=%s name=%s category=%s",
            user_id,
            user_email,
            item.id,
            item.name,
            item.category,
        )
        return AdminCatalogItemResponse(
            id=item.id,
            name=item.name,
            category=item.category,
            description=item.description,
            is_active=item.is_active,
        )

    async def update_catalog_item(self, catalog_id: int, payload, user_id: int, user_email: str):
        """Update catalog item. Log who, what, when."""
        if not self.catalog_repo:
            raise NotFoundError(Errors.NOT_FOUND[0], "Catalog not configured")
        from app.schemas.service_catalog import AdminCatalogItemResponse

        item = await self.catalog_repo.update(
            catalog_id,
            name=payload.name,
            category=payload.category,
            description=payload.description,
            is_active=payload.is_active,
        )
        if not item:
            raise NotFoundError(*Errors.SERVICE_NOT_FOUND)
        logger.info(
            "catalog_update user_id=%s email=%s catalog_id=%s name=%s category=%s is_active=%s",
            user_id,
            user_email,
            catalog_id,
            item.name,
            item.category,
            item.is_active,
        )
        return AdminCatalogItemResponse(
            id=item.id,
            name=item.name,
            category=item.category,
            description=item.description,
            is_active=item.is_active,
        )

    async def delete_catalog_item(self, catalog_id: int, user_id: int, user_email: str) -> bool:
        """Delete catalog item. Log who, what, when."""
        if not self.catalog_repo:
            raise NotFoundError(Errors.NOT_FOUND[0], "Catalog not configured")
        item = await self.catalog_repo.get_by_id(catalog_id)
        if not item:
            raise NotFoundError(*Errors.SERVICE_NOT_FOUND)
        name, category = item.name, item.category
        ok = await self.catalog_repo.delete_by_id(catalog_id)
        if ok:
            logger.info(
                "catalog_delete user_id=%s email=%s catalog_id=%s name=%s category=%s",
                user_id,
                user_email,
                catalog_id,
                name,
                category,
            )
        return ok
