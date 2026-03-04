"""STO business logic."""

import logging
from datetime import date, time

from sqlalchemy.exc import IntegrityError

from app.core.exceptions import BadRequestError, ConflictError, Errors, NotFoundError
from app.models import STO
from app.models.enums import STOStatus
from app.repositories.booking_repository import BookingRepository
from app.repositories.sto_repository import STORepository
from app.repositories.sto_schedule_repository import StoScheduleRepository
from app.repositories.sto_service_repository import StoServiceRepository
from app.schemas.sto import (
    PaginatedSTOList,
    STOListItemResponse,
    STOCreate,
    STORequestCreate,
    STORequestResponse,
    STOResponse,
    StoOwnerListResponse,
)

logger = logging.getLogger(__name__)

# Business hours: 9:00 - 18:00, 30-min slots
SLOT_START = time(9, 0)
SLOT_END = time(18, 0)
SLOT_MINUTES = 30


class STOService:
    def __init__(
        self,
        repo: STORepository,
        booking_repo: BookingRepository | None = None,
        sto_svc_repo: StoServiceRepository | None = None,
        schedule_repo: StoScheduleRepository | None = None,
    ):
        self.repo = repo
        self._booking_repo = booking_repo
        self._sto_svc_repo = sto_svc_repo
        self._schedule_repo = schedule_repo

    @property
    def booking_repo(self) -> BookingRepository:
        if self._booking_repo is None:
            raise RuntimeError("BookingRepository not injected")
        return self._booking_repo

    @property
    def sto_svc_repo(self) -> StoServiceRepository:
        if self._sto_svc_repo is None:
            raise RuntimeError("StoServiceRepository not injected")
        return self._sto_svc_repo

    @property
    def schedule_repo(self) -> StoScheduleRepository:
        if self._schedule_repo is None:
            raise RuntimeError("StoScheduleRepository not injected")
        return self._schedule_repo

    async def list_stos(
        self,
        city_id: int | None = None,
        page: int = 1,
        per_page: int = 20,
        search: str | None = None,
        rating_min: float | None = None,
        service_id: int | None = None,
        sort: str = "name",
    ) -> PaginatedSTOList:
        """Get paginated STOs with city, filters and sort."""
        items, total = await self.repo.get_paginated(
            city_id=city_id,
            page=page,
            per_page=per_page,
            search=search,
            rating_min=rating_min,
            service_id=service_id,
            sort=sort,
        )
        pages = (total + per_page - 1) // per_page if total > 0 else 1
        return PaginatedSTOList(
            items=[STOListItemResponse.model_validate(s) for s in items],
            total=total,
            page=page,
            per_page=per_page,
            pages=pages,
        )

    async def get_sto_with_services(self, sto_id: int) -> STOResponse:
        """Get STO by id with city and services. Raises NotFoundError if not found."""
        sto = await self.repo.get_by_id_with_services(sto_id)
        if sto is None:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        return STOResponse.model_validate(sto)

    async def get_my_active_stos(
        self, user_id: int
    ) -> list[StoOwnerListResponse]:
        """Get all active STOs owned by user. For sto_owner role."""
        stos = await self.repo.get_active_stos_by_owner(owner_id=user_id)
        return [
            StoOwnerListResponse(
                id=s.id,
                name=s.name,
                city_id=s.city_id,
                city_name=s.city.name if s.city else "",
                address=s.address,
                status=s.status.value,
                created_at=s.created_at,
            )
            for s in stos
        ]

    async def get_my_sto_for_panel(
        self, sto_id: int, user_id: int
    ) -> StoOwnerListResponse:
        """Get STO by id for owner panel. Raises 403 if not owner or not active."""
        from app.core.exceptions import ForbiddenError

        sto = await self.repo.get_by_id_with_services(sto_id)
        if not sto:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        if sto.owner_id != user_id:
            raise ForbiddenError(*Errors.FORBIDDEN)
        if sto.status != STOStatus.active:
            raise ForbiddenError(*Errors.FORBIDDEN)
        return StoOwnerListResponse(
            id=sto.id,
            name=sto.name,
            city_id=sto.city_id,
            city_name=sto.city.name if sto.city else "",
            address=sto.address,
            status=sto.status.value,
            max_parallel_bookings=sto.max_parallel_bookings,
            created_at=sto.created_at,
        )

    async def create_sto(self, payload: STOCreate, owner_id: int) -> STO:
        """Create STO. owner_id required (sto_owner)."""
        sto = await self.repo.create(
            name=payload.name,
            address=payload.address,
            city_id=payload.city_id,
            owner_id=owner_id,
            description=payload.description,
            rating=payload.rating,
            image_url=payload.image_url,
        )
        return sto

    async def submit_sto_request(
        self,
        payload: STORequestCreate,
        user_id: int,
    ) -> STORequestResponse:
        """Submit STO partner request. Only for role=client. Creates STO with status=pending."""
        has_pending_or_active = await self.repo.has_owner_sto_with_status(
            user_id,
            STOStatus.pending,
            STOStatus.active,
        )
        if has_pending_or_active:
            raise ConflictError(*Errors.STO_ALREADY_EXISTS)

        if await self.repo.exists_by_name_city(payload.name.strip(), payload.city_id):
            raise ConflictError(*Errors.STO_DUPLICATE_NAME_CITY)

        try:
            await self.repo.create(
                name=payload.name.strip(),
                address=payload.address.strip(),
                city_id=payload.city_id,
                owner_id=user_id,
                description=payload.description.strip(),
                rating=0.0,
                phone=payload.phone.strip(),
                whatsapp=payload.whatsapp.strip() if payload.whatsapp else None,
                status=STOStatus.pending,
            )
        except IntegrityError as e:
            logger.warning("submit_sto_request IntegrityError: %s", e)
            err_str = str(e).lower()
            if "uq_stos_name_city_id" in err_str or "unique" in err_str:
                raise ConflictError(*Errors.STO_DUPLICATE_NAME_CITY)
            raise

        logger.info("STO request submitted: user_id=%s, name=%s", user_id, payload.name)
        return STORequestResponse()

    async def get_available_slots(
        self,
        sto_id: int,
        date_val: date,
        service_id: int,
    ) -> list[dict]:
        """Get time slots with availability. Returns [{"time": "HH:MM", "available": bool}, ...]."""
        if date_val < date.today():
            return []
        sto_svc = await self.sto_svc_repo.get_by_sto_and_service(sto_id, service_id)
        if sto_svc is None:
            return []
        duration_minutes = sto_svc.duration_minutes

        # Get schedule for day
        day_of_week = date_val.weekday()
        schedules = await self.schedule_repo.get_by_sto_id(sto_id)
        schedule_for_day = next(
            (s for s in schedules if s.day_of_week == day_of_week), None
        )
        if schedules:
            if schedule_for_day is None or not schedule_for_day.is_working:
                return []
            start_min = (
                schedule_for_day.start_time.hour * 60
                + schedule_for_day.start_time.minute
            )
            end_limit = (
                schedule_for_day.end_time.hour * 60
                + schedule_for_day.end_time.minute
            )
        else:
            if day_of_week >= 5:
                return []
            start_min, end_limit = 9 * 60, 18 * 60

        # Build duration map for bookings
        sto_services = await self.sto_svc_repo.get_by_sto_id(sto_id)
        duration_map = {
            (sto_id, ss.service_id): ss.duration_minutes for ss in sto_services
        }
        bookings_with_duration = await self.booking_repo.get_bookings_for_date(
            sto_id, date_val, duration_map
        )

        def to_minutes(t: time) -> int:
            return t.hour * 60 + t.minute

        def overlaps(
            slot_start_min: int,
            slot_end_min: int,
            book_start_min: int,
            book_end_min: int,
        ) -> bool:
            return slot_start_min < book_end_min and slot_end_min > book_start_min

        occupied: list[tuple[int, int]] = []
        for booking, dur in bookings_with_duration:
            start_min_b = to_minutes(booking.time)
            end_min_b = start_min_b + dur
            occupied.append((start_min_b, end_min_b))

        slots: list[dict] = []
        slot_dur = duration_minutes

        current = start_min
        while current + slot_dur <= end_limit:
            slot_end = current + slot_dur
            is_free = True
            for (occ_start, occ_end) in occupied:
                if overlaps(current, slot_end, occ_start, occ_end):
                    is_free = False
                    break
            h, m = divmod(current, 60)
            time_str = f"{h:02d}:{m:02d}"
            slots.append({"time": time_str, "available": is_free})
            current += SLOT_MINUTES

        return slots
