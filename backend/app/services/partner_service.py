"""Partner API service for STO owners."""

import asyncio
import logging
import secrets
from datetime import date, timedelta
from pathlib import Path


def _first_day_of_month() -> date:
    today = date.today()
    return today.replace(day=1)

from fastapi import UploadFile

from app.core.config import settings

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError, Errors
from app.repositories.booking_repository import BookingRepository
from app.repositories.message_repository import MessageRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.service_catalog_repository import ServiceCatalogRepository
from app.repositories.sto_repository import STORepository
from app.repositories.sto_service_repository import StoServiceRepository
from app.repositories.user_repository import UserRepository
from app.schemas.partner import (
    PartnerAnalyticsResponse,
    PartnerBookingsByDayItem,
    PartnerBookingClientInfo,
    PartnerBookingResponse,
    PartnerCatalogItem,
    PartnerDashboardResponse,
    PartnerProfileResponse,
    PartnerProfileUpdate,
    PartnerServiceAnalyticsItem,
    PartnerServiceCreateOne,
    PartnerServiceItem,
    PartnerServiceUpdate,
    PartnerStoItem,
)

logger = logging.getLogger(__name__)


def _parse_period(period: int) -> tuple[date, date]:
    """Parse period (days) to (start_date, end_date)."""
    today = date.today()
    allowed = (7, 30, 90, 365)
    days = period if period in allowed else 30
    start = today - timedelta(days=days)
    return start, today


class PartnerService:
    def __init__(
        self,
        sto_repo: STORepository,
        booking_repo: BookingRepository,
        review_repo: ReviewRepository,
        sto_service_repo: StoServiceRepository,
        user_repo: UserRepository,
        catalog_repo: ServiceCatalogRepository,
        msg_repo: MessageRepository | None = None,
    ):
        self.sto_repo = sto_repo
        self.booking_repo = booking_repo
        self.review_repo = review_repo
        self.sto_service_repo = sto_service_repo
        self.user_repo = user_repo
        self.catalog_repo = catalog_repo
        self.msg_repo = msg_repo

    def _require_sto_owner(self, user: dict) -> None:
        if user.get("role") not in ("sto_owner", "sto"):
            raise ForbiddenError(*Errors.FORBIDDEN)

    async def _get_owner_sto_ids(self, owner_id: int) -> list[int]:
        """Get STO ids owned by user."""
        return await self.sto_repo.get_ids_by_owner_id(owner_id)

    async def get_my_stos(self, owner_id: int) -> list[PartnerStoItem]:
        """List owner's STOs."""
        items, _ = await self.sto_repo.get_all_for_owner(
            owner_id, page=1, per_page=100, search=None, status=None
        )
        return [
            PartnerStoItem(
                id=s.id,
                name=s.name,
                address=s.address,
                city_name=s.city.name if s.city else "",
            )
            for s in items
        ]

    async def get_dashboard(
        self,
        owner_id: int,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> PartnerDashboardResponse:
        """Dashboard stats for owner. Optional date_from/date_to for bookings_by_day (default: month)."""
        sto_ids = await self._get_owner_sto_ids(owner_id)
        if not sto_ids:
            return PartnerDashboardResponse(
                total_bookings=0,
                completed=0,
                cancelled=0,
                revenue=0.0,
                average_rating=0.0,
                bookings_by_day=[],
            )

        counts = await self.booking_repo.count_by_sto_ids(sto_ids)
        revenue = await self.booking_repo.revenue_by_sto_ids(sto_ids)
        avg_rating, _ = await self.review_repo.get_rating_stats_by_sto_ids(sto_ids)

        start = date_from or _first_day_of_month()
        end = date_to or date.today()
        if start > end:
            start, end = end, start
        counts_by_day = await self.booking_repo.count_by_sto_ids_grouped_by_created_date(
            sto_ids, start, end
        )
        revenue_by_day = await self.booking_repo.revenue_by_sto_ids_grouped_by_date(
            sto_ids, start, end
        )
        count_map = {d: c for d, c in counts_by_day}
        rev_map = {d: r for d, r in revenue_by_day}
        all_dates = sorted(set(count_map) | set(rev_map))
        bookings_by_day = [
            PartnerBookingsByDayItem(
                date=d,
                bookings=count_map.get(d, 0),
                revenue=rev_map.get(d, 0.0),
            )
            for d in all_dates
        ]

        logger.info("Partner dashboard: owner_id=%s, total=%s", owner_id, counts["total"])

        return PartnerDashboardResponse(
            total_bookings=counts["total"],
            completed=counts["completed"],
            cancelled=counts["cancelled"],
            revenue=round(revenue, 2),
            average_rating=avg_rating,
            bookings_by_day=bookings_by_day,
        )

    async def get_analytics_services(
        self, owner_id: int
    ) -> list[PartnerServiceAnalyticsItem]:
        """List of service_name, bookings_count, revenue for owner's STOs (completed only)."""
        sto_ids = await self._get_owner_sto_ids(owner_id)
        if not sto_ids:
            return []
        rows = await self.booking_repo.analytics_services_by_sto_ids(sto_ids)
        return [
            PartnerServiceAnalyticsItem(
                service_name=name,
                bookings_count=cnt,
                revenue=round(rev, 2),
            )
            for name, cnt, rev in rows
        ]

    async def get_bookings(self, owner_id: int) -> list[PartnerBookingResponse]:
        """Get all bookings for owner's STOs."""
        sto_ids = await self._get_owner_sto_ids(owner_id)
        if not sto_ids:
            return []

        bookings = await self.booking_repo.get_all_for_admin(sto_ids=sto_ids, limit=500)

        def _client_info(client):
            if not client:
                return None
            return PartnerBookingClientInfo(
                first_name=getattr(client, "first_name", None),
                last_name=getattr(client, "last_name", None),
                phone=getattr(client, "phone", None),
                car_brand=getattr(client, "car_brand", None),
                car_model=getattr(client, "car_model", None),
                car_year=getattr(client, "car_year", None),
            )

        def _price(b):
            if not b.sto or not b.sto.sto_services:
                return None
            for ss in b.sto.sto_services:
                if ss.service_id == b.service_id:
                    return float(ss.price) if ss.price is not None else None
            return None

        return [
            PartnerBookingResponse(
                id=b.id,
                client_id=b.client_id,
                client_email=b.client.email if b.client else (b.guest_email or ""),
                client=_client_info(b.client) if b.client else None,
                sto_id=b.sto_id,
                sto_name=b.sto.name if b.sto else "",
                service_id=b.service_id,
                service_name=b.catalog_service.name if b.catalog_service else "",
                date=str(b.date),
                time=str(b.time),
                status=b.status.value,
                price=_price(b),
                created_at=b.created_at,
            )
            for b in bookings
        ]

    async def get_chats(self, owner_id: int) -> list[dict]:
        """Get chat dialogs for partner: bookings with last message and unread count."""
        sto_ids = await self._get_owner_sto_ids(owner_id)
        if not sto_ids or not self.msg_repo:
            return []

        from app.models.enums import BookingStatus

        bookings = await self.booking_repo.get_all_for_admin(
            sto_ids=sto_ids,
            limit=200,
            status=None,
        )
        # Exclude cancelled
        bookings = [b for b in bookings if b.status != BookingStatus.cancelled]
        booking_ids = [b.id for b in bookings]

        unread_map = await self.msg_repo.get_unread_counts_by_booking(
            booking_ids, owner_id
        )
        last_map = await self.msg_repo.get_last_messages_for_bookings(booking_ids)

        def _client_name(b):
            if b.client:
                parts = [b.client.first_name, b.client.last_name]
                name = " ".join(p for p in parts if p).strip()
                if name:
                    return name
            return b.client.email if b.client else (b.guest_email or "Гость")

        return [
            {
                "booking_id": b.id,
                "client_name": _client_name(b),
                "client_email": b.client.email if b.client else (b.guest_email or ""),
                "client_phone": b.client.phone if b.client else (b.guest_phone or ""),
                "service_name": b.catalog_service.name if b.catalog_service else "",
                "booking_date": str(b.date),
                "booking_time": str(b.time),
                "status": b.status.value,
                "sto_name": b.sto.name if b.sto else "",
                "last_message": last_map.get(b.id, ("", None))[0],
                "last_message_at": last_map.get(b.id, ("", None))[1],
                "unread_count": unread_map.get(b.id, 0),
            }
            for b in bookings
        ]

    async def mark_chat_read(self, booking_id: int, owner_id: int) -> bool:
        """Mark all messages in chat (where partner is receiver) as read."""
        sto_ids = await self._get_owner_sto_ids(owner_id)
        if not sto_ids or not self.msg_repo:
            return False

        booking = await self.booking_repo.get_by_id_with_relations(booking_id)
        if not booking or booking.sto_id not in sto_ids:
            return False

        await self.msg_repo.mark_as_read_by_receiver(booking_id, owner_id)
        return True

    async def update_booking_status(
        self, booking_id: int, new_status: str, owner_id: int
    ) -> PartnerBookingResponse:
        """Update booking status. Check ownership."""
        from app.models.enums import BookingStatus

        booking = await self.booking_repo.get_by_id_with_relations(booking_id)
        if not booking:
            raise NotFoundError(*Errors.BOOKING_NOT_FOUND)

        sto_ids = await self._get_owner_sto_ids(owner_id)
        if booking.sto_id not in sto_ids:
            raise ForbiddenError(*Errors.FORBIDDEN)

        try:
            status_enum = BookingStatus(new_status)
        except ValueError:
            raise ForbiddenError(*Errors.INVALID_STATUS_TRANSITION)

        from app.core.exceptions import ConflictError

        valid_transitions = {
            "pending": ["accepted", "cancelled"],
            "accepted": ["completed", "cancelled"],
        }
        old_status = booking.status.value
        allowed = valid_transitions.get(old_status, [])
        if new_status not in allowed:
            raise ConflictError(*Errors.INVALID_STATUS_TRANSITION)

        await self.booking_repo.update_status(booking, status_enum)

        logger.info(
            "Partner booking status: id=%s, %s -> %s, owner_id=%s",
            booking_id,
            old_status,
            new_status,
            owner_id,
        )

        client_info = None
        if booking.client:
            client_info = PartnerBookingClientInfo(
                first_name=getattr(booking.client, "first_name", None),
                last_name=getattr(booking.client, "last_name", None),
                phone=getattr(booking.client, "phone", None),
                car_brand=getattr(booking.client, "car_brand", None),
                car_model=getattr(booking.client, "car_model", None),
                car_year=getattr(booking.client, "car_year", None),
            )
        return PartnerBookingResponse(
            id=booking.id,
            client_id=booking.client_id,
            client_email=booking.client.email if booking.client else "",
            client=client_info,
            sto_id=booking.sto_id,
            sto_name=booking.sto.name if booking.sto else "",
            service_id=booking.service_id,
            service_name=booking.catalog_service.name if booking.catalog_service else "",
            date=str(booking.date),
            time=str(booking.time),
            status=new_status,
            created_at=booking.created_at,
        )

    async def get_services(self, owner_id: int, sto_id: int) -> list[PartnerServiceItem]:
        """Get services for STO. Check ownership."""
        sto = await self.sto_repo.get_by_id(sto_id)
        if not sto:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        if sto.owner_id != owner_id:
            raise ForbiddenError(*Errors.FORBIDDEN)

        items = await self.sto_service_repo.get_by_sto_id(sto_id)
        return [
            PartnerServiceItem(
                id=ss.id,
                service_id=ss.service_id,
                name=ss.catalog_item.name if ss.catalog_item else "?",
                category=ss.catalog_item.category if ss.catalog_item else "",
                price=float(ss.price),
                duration_minutes=ss.duration_minutes,
                is_active=ss.is_active,
            )
            for ss in items
        ]

    async def update_services(
        self,
        owner_id: int,
        sto_id: int,
        items: list,
    ) -> list[PartnerServiceItem]:
        """Replace STO services. Check ownership."""
        from app.models.enums import STOStatus

        sto = await self.sto_repo.get_by_id(sto_id)
        if not sto:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        if sto.owner_id != owner_id:
            raise ForbiddenError(*Errors.FORBIDDEN)
        if sto.status != STOStatus.active:
            raise ForbiddenError(*Errors.FORBIDDEN)

        data = [
            (
                i.service_id,
                float(i.price),
                getattr(i, "is_active", True),
                getattr(i, "duration_minutes", 30),
            )
            for i in items
        ]
        await self.sto_service_repo.replace_for_sto(
            sto_id, data, default_duration=30
        )
        return await self.get_services(owner_id, sto_id)

    async def get_catalog_services(self, owner_id: int) -> list[PartnerCatalogItem]:
        """List catalog services for dropdown (add service to STO)."""
        items = await self.catalog_repo.get_all_active()
        return [
            PartnerCatalogItem(
                id=c.id,
                name=c.name,
                category=c.category or "",
            )
            for c in items
        ]

    async def add_service(
        self, owner_id: int, sto_id: int, payload: PartnerServiceCreateOne
    ) -> PartnerServiceItem:
        """Add one service to STO. Check ownership."""
        from app.models.enums import STOStatus

        sto = await self.sto_repo.get_by_id(sto_id)
        if not sto:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        if sto.owner_id != owner_id:
            raise ForbiddenError(*Errors.FORBIDDEN)
        if sto.status != STOStatus.active:
            raise ForbiddenError(*Errors.FORBIDDEN)
        existing = await self.sto_service_repo.get_by_sto_and_service(
            sto_id, payload.service_id
        )
        if existing:
            raise ForbiddenError(*Errors.CONFLICT, message="Услуга уже добавлена в это СТО")
        ss = await self.sto_service_repo.create_one(
            sto_id=sto_id,
            service_id=payload.service_id,
            price=payload.price,
            duration_minutes=payload.duration_minutes,
            is_active=payload.is_active,
        )
        return PartnerServiceItem(
            id=ss.id,
            service_id=ss.service_id,
            name=ss.catalog_item.name if ss.catalog_item else "?",
            category=ss.catalog_item.category if ss.catalog_item else "",
            price=float(ss.price),
            duration_minutes=ss.duration_minutes,
            is_active=ss.is_active,
        )

    async def update_service(
        self, owner_id: int, ss_id: int, payload: PartnerServiceUpdate
    ) -> PartnerServiceItem | None:
        """Update one STO service by id. Check ownership via STO."""
        ss = await self.sto_service_repo.get_by_id(ss_id)
        if not ss or not ss.sto:
            raise NotFoundError(*Errors.SERVICE_NOT_FOUND)
        if ss.sto.owner_id != owner_id:
            raise ForbiddenError(*Errors.FORBIDDEN)
        updated = await self.sto_service_repo.update_one(
            ss_id,
            price=payload.price,
            duration_minutes=payload.duration_minutes,
            is_active=payload.is_active,
        )
        if not updated:
            return None
        return PartnerServiceItem(
            id=updated.id,
            service_id=updated.service_id,
            name=updated.catalog_item.name if updated.catalog_item else "?",
            category=updated.catalog_item.category if updated.catalog_item else "",
            price=float(updated.price),
            duration_minutes=updated.duration_minutes,
            is_active=updated.is_active,
        )

    async def delete_service(self, owner_id: int, ss_id: int) -> bool:
        """Delete one STO service by id. Check ownership."""
        ss = await self.sto_service_repo.get_by_id(ss_id)
        if not ss or not ss.sto:
            raise NotFoundError(*Errors.SERVICE_NOT_FOUND)
        if ss.sto.owner_id != owner_id:
            raise ForbiddenError(*Errors.FORBIDDEN)
        return await self.sto_service_repo.delete_by_id(ss_id)

    async def get_analytics(
        self, owner_id: int, period: int = 30
    ) -> PartnerAnalyticsResponse:
        """Analytics for owner's STOs."""
        sto_ids = await self._get_owner_sto_ids(owner_id)
        if not sto_ids:
            return PartnerAnalyticsResponse(
                chart=[],
                popular_services=[],
                total_revenue=0.0,
            )

        start, end = _parse_period(period)
        chart_raw = await self.booking_repo.count_completed_by_sto_ids_and_date_range(
            sto_ids, start, end
        )
        popular = await self.booking_repo.popular_services_by_sto_ids(
            sto_ids, limit=5
        )
        revenue = await self.booking_repo.revenue_by_sto_ids(sto_ids)

        # Build chart with revenue per day (simplified: we don't have revenue by date in repo)
        point_map = {p[0]: p[1] for p in chart_raw}
        chart = []
        d = start
        while d <= end:
            dstr = str(d)
            chart.append({
                "date": dstr,
                "bookings": point_map.get(dstr, 0),
                "revenue": 0.0,  # Would need revenue_by_date in repo
            })
            d += timedelta(days=1)

        popular_list = [
            {"service_name": s[1], "count": s[2]} for s in popular
        ]

        return PartnerAnalyticsResponse(
            chart=chart,
            popular_services=popular_list,
            total_revenue=round(revenue, 2),
        )

    async def get_analytics_range(
        self, owner_id: int, date_from: date, date_to: date
    ) -> list[dict]:
        """Legacy: [{date, users, bookings, stos}]. Use get_analytics_detailed for new format."""
        sto_ids = await self._get_owner_sto_ids(owner_id)
        if not sto_ids:
            return []
        if date_from > date_to:
            date_from, date_to = date_to, date_from
        bookings_by_day = await self.booking_repo.count_all_by_sto_ids_grouped_by_created_date(
            sto_ids, date_from, date_to
        )
        bookings_map = {d: c for d, c in bookings_by_day}
        result: list[dict] = []
        d = date_from
        while d <= date_to:
            dstr = str(d)
            result.append({
                "date": dstr,
                "users": 0,
                "bookings": bookings_map.get(dstr, 0),
                "stos": 0,
            })
            d += timedelta(days=1)
        return result

    def _iter_buckets(self, from_date: date, to_date: date, group_by: str) -> list[date]:
        """Generate bucket start dates for group_by (day|week|month)."""
        buckets: list[date] = []
        if group_by == "day":
            d = from_date
            while d <= to_date:
                buckets.append(d)
                d += timedelta(days=1)
        elif group_by == "week":
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

    async def get_analytics_detailed(
        self,
        owner_id: int,
        date_from: date,
        date_to: date,
        group_by: str = "day",
    ) -> list[dict]:
        """Analytics by date range: bookings, completed, revenue. group_by: day|week|month."""
        sto_ids = await self._get_owner_sto_ids(owner_id)
        if not sto_ids:
            return []
        if date_from > date_to:
            date_from, date_to = date_to, date_from
        bookings_all, bookings_completed, revenue_by_day = await asyncio.gather(
            self.booking_repo.count_all_by_sto_ids_grouped_by_created_date(
                sto_ids, date_from, date_to, group_by=group_by
            ),
            self.booking_repo.count_by_sto_ids_grouped_by_created_date(
                sto_ids, date_from, date_to, group_by=group_by
            ),
            self.booking_repo.revenue_by_sto_ids_grouped_by_date(
                sto_ids, date_from, date_to, group_by=group_by
            ),
        )
        bookings_map = {str(d): c for d, c in bookings_all}
        completed_map = {str(d): c for d, c in bookings_completed}
        revenue_map = {str(d): r for d, r in revenue_by_day}
        buckets = self._iter_buckets(date_from, date_to, group_by)
        result: list[dict] = []
        for d in buckets:
            dstr = str(d)
            result.append({
                "date": dstr,
                "bookings": bookings_map.get(dstr, 0),
                "completed": completed_map.get(dstr, 0),
                "revenue": round(revenue_map.get(dstr, 0.0), 2),
            })
        return result

    async def get_analytics_full(
        self,
        owner_id: int,
        date_from: date,
        date_to: date,
        group_by: str = "day",
    ) -> dict:
        """Full analytics: chart, kpi (totals), top_services. group_by: day|week|month."""
        sto_ids = await self._get_owner_sto_ids(owner_id)
        chart, popular, (avg_rating, _) = await asyncio.gather(
            self.get_analytics_detailed(owner_id, date_from, date_to, group_by=group_by),
            self.booking_repo.analytics_services_by_sto_ids(sto_ids),
            self.review_repo.get_rating_stats_by_sto_ids(sto_ids),
        )
        top_services = [
            {"service_name": s[0], "bookings_count": s[1], "revenue": round(s[2], 2)}
            for s in popular[:10]
        ]
        total_bookings = sum(r["bookings"] for r in chart)
        total_completed = sum(r["completed"] for r in chart)
        total_revenue = sum(r["revenue"] for r in chart)
        return {
            "chart": chart,
            "kpi": {
                "bookings_total": total_bookings,
                "completed": total_completed,
                "revenue": round(total_revenue, 2),
                "average_rating": round(avg_rating, 2),
            },
            "top_services": top_services,
        }

    async def get_profile(self, user_id: int) -> PartnerProfileResponse:
        """Get partner profile (user + first STO if any)."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError(*Errors.USER_NOT_FOUND)

        sto_id = None
        sto_name = None
        sto_phone = None
        sto_address = None
        sto_description = None
        sto_image_url = None
        stos = await self.sto_repo.get_active_stos_by_owner(user_id)
        if stos:
            s = stos[0]
            sto_id = s.id
            sto_name = s.name
            sto_phone = s.phone
            sto_address = s.address
            sto_description = s.description
            sto_image_url = s.image_url

        return PartnerProfileResponse(
            id=user.id,
            email=user.email,
            role=user.role.value,
            city_id=user.city_id,
            created_at=user.created_at,
            sto_id=sto_id,
            sto_name=sto_name,
            sto_phone=sto_phone,
            sto_address=sto_address,
            sto_description=sto_description,
            sto_image_url=sto_image_url,
        )

    async def update_profile(
        self, user_id: int, payload: PartnerProfileUpdate
    ) -> PartnerProfileResponse:
        """Update partner profile (user + first STO if fields provided)."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError(*Errors.USER_NOT_FOUND)

        if payload.city_id is not None:
            await self.user_repo.update_city(user_id, payload.city_id)

        stos = await self.sto_repo.get_active_stos_by_owner(user_id)
        if stos and (
            payload.sto_name is not None
            or payload.sto_phone is not None
            or payload.sto_address is not None
            or payload.sto_description is not None
            or payload.sto_image_url is not None
        ):
            s = stos[0]
            await self.sto_repo.update_profile(
                s.id,
                name=payload.sto_name,
                phone=payload.sto_phone,
                address=payload.sto_address,
                description=payload.sto_description,
                image_url=payload.sto_image_url,
            )

        return await self.get_profile(user_id)

    async def upload_profile_photo(self, owner_id: int, file: UploadFile) -> str:
        """Save uploaded photo for partner's first STO, update image_url, return relative URL."""
        from app.core.exceptions import BadRequestError

        ALLOWED_EXT = (".jpg", ".jpeg", ".png", ".webp")
        MAX_SIZE = 5 * 1024 * 1024  # 5 MB

        if not file.filename:
            raise BadRequestError(*Errors.PHOTO_FORMAT_INVALID)
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXT:
            raise BadRequestError(*Errors.PHOTO_FORMAT_INVALID)
        content = await file.read()
        if len(content) > MAX_SIZE:
            raise BadRequestError(*Errors.PHOTO_TOO_LARGE)

        media_root = Path(settings.media_root)
        sto_dir = media_root / "stos"
        sto_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{secrets.token_hex(8)}{ext}"
        filepath = sto_dir / filename
        filepath.write_bytes(content)

        relative_url = f"/{settings.media_root}/stos/{filename}"
        stos = await self.sto_repo.get_active_stos_by_owner(owner_id)
        if not stos:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        await self.sto_repo.update_profile(stos[0].id, image_url=relative_url)
        return relative_url
