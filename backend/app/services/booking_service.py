"""Booking business logic with state machine."""

import logging
from datetime import date, time

from sqlalchemy.exc import IntegrityError

from app.core.exceptions import BadRequestError, ConflictError, Errors, ForbiddenError, NotFoundError
from app.models import Booking
from app.models.enums import BookingStatus, STOStatus
from app.repositories.booking_repository import BookingRepository
from app.repositories.sto_repository import STORepository
from app.repositories.sto_schedule_repository import StoScheduleRepository
from app.repositories.sto_service_repository import StoServiceRepository
from app.services.notification_service import (
    notify_booking_accepted,
    notify_booking_cancelled,
    notify_booking_completed,
    notify_booking_created,
    notify_booking_rescheduled,
)

logger = logging.getLogger(__name__)

# State machine: from -> [to]
VALID_TRANSITIONS: dict[BookingStatus, set[BookingStatus]] = {
    BookingStatus.pending: {BookingStatus.accepted, BookingStatus.cancelled, BookingStatus.rescheduled},
    BookingStatus.accepted: {BookingStatus.completed, BookingStatus.cancelled, BookingStatus.rescheduled},
    BookingStatus.rescheduled: {BookingStatus.accepted, BookingStatus.completed, BookingStatus.cancelled},
    BookingStatus.completed: set(),
    BookingStatus.cancelled: set(),
}


def _can_transition(current: BookingStatus, new_status: BookingStatus) -> bool:
    return new_status in VALID_TRANSITIONS.get(current, set())


class BookingService:
    def __init__(
        self,
        booking_repo: BookingRepository,
        sto_repo: STORepository,
        sto_svc_repo: StoServiceRepository,
        schedule_repo: StoScheduleRepository,
        notif_repo=None,
    ):
        self.booking_repo = booking_repo
        self.sto_repo = sto_repo
        self.sto_svc_repo = sto_svc_repo
        self.schedule_repo = schedule_repo
        self.notif_repo = notif_repo

    async def get_bookings_for_sto_owner(self, user_id: int) -> list[Booking]:
        """Get all bookings for STOs owned by user."""
        sto_ids = await self.sto_repo.get_ids_by_owner_id(user_id)
        return await self.booking_repo.get_by_sto_ids(sto_ids)

    async def get_bookings_for_sto(
        self, sto_id: int, user_id: int, role: str | None = None
    ) -> list[Booking]:
        """Get bookings for a specific STO. Only owner or admin."""
        sto = await self.sto_repo.get_by_id(sto_id)
        if sto is None:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        if role != "admin" and (sto.owner_id is None or sto.owner_id != user_id):
            raise ForbiddenError(*Errors.FORBIDDEN)
        return await self.booking_repo.get_by_sto_id(sto_id)

    def _check_is_participant(
        self, booking: Booking, user_id: int, role: str | None = None
    ) -> None:
        """Raises ForbiddenError if user is not client, STO owner, or admin."""
        if role == "admin":
            return
        is_client = booking.client_id == user_id
        is_sto_owner = (
            booking.sto.owner_id is not None and booking.sto.owner_id == user_id
        )
        if not (is_client or is_sto_owner):
            logger.warning(
                "Booking access denied: user_id=%s, booking_id=%s",
                user_id,
                booking.id,
            )
            raise ForbiddenError(*Errors.FORBIDDEN)

    def _check_is_sto_owner(
        self, booking: Booking, user_id: int, role: str | None = None
    ) -> None:
        """Raises ForbiddenError if user is not STO owner or admin."""
        if role == "admin":
            return
        if booking.sto.owner_id is None or booking.sto.owner_id != user_id:
            logger.warning(
                "STO owner access denied: user_id=%s, booking_id=%s",
                user_id,
                booking.id,
            )
            raise ForbiddenError(*Errors.FORBIDDEN)

    async def create_booking(
        self,
        client_id: int,
        sto_id: int,
        service_id: int,
        date_val: date,
        time_val: time,
        *,
        role: str,
    ) -> Booking:
        """Create booking. Only client role (admin also allowed). service_id = catalog id. Duplicate -> return existing or 409."""
        if role not in ("client", "admin"):
            raise ForbiddenError(*Errors.FORBIDDEN)
        sto = await self.sto_repo.get_by_id_with_owner(sto_id)
        if sto is None:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        if sto.status != STOStatus.active:
            raise NotFoundError(*Errors.STO_NOT_FOUND)

        sto_svc = await self.sto_svc_repo.get_by_sto_and_service(sto_id, service_id)
        if sto_svc is None:
            raise NotFoundError(*Errors.SERVICE_NOT_FOUND)

        # Check schedule: STO works on this day, time in range
        day_of_week = date_val.weekday()  # 0=Mon, 6=Sun
        schedules = await self.schedule_repo.get_by_sto_id(sto_id)
        if schedules:
            schedule_for_day = next(
                (s for s in schedules if s.day_of_week == day_of_week), None
            )
            if schedule_for_day is None or not schedule_for_day.is_working:
                raise ConflictError(*Errors.STO_CLOSED)
            start_min = (
                schedule_for_day.start_time.hour * 60
                + schedule_for_day.start_time.minute
            )
            end_min = (
                schedule_for_day.end_time.hour * 60
                + schedule_for_day.end_time.minute
            )
            slot_min = time_val.hour * 60 + time_val.minute
            if slot_min < start_min or slot_min >= end_min:
                raise ConflictError(*Errors.SLOT_UNAVAILABLE)
        else:
            # No schedule: default Mon-Fri 09:00-18:00
            if day_of_week >= 5:
                raise ConflictError(*Errors.STO_CLOSED)
            slot_min = time_val.hour * 60 + time_val.minute
            if slot_min < 9 * 60 or slot_min >= 18 * 60:
                raise ConflictError(*Errors.SLOT_UNAVAILABLE)

        # Check max_parallel_bookings
        count = await self.booking_repo.count_parallel_at_slot(
            sto_id, date_val, time_val
        )
        if count >= sto.max_parallel_bookings:
            raise ConflictError(*Errors.SLOT_UNAVAILABLE)

        try:
            booking = await self.booking_repo.create(
                sto_id=sto_id,
                service_id=service_id,
                date_val=date_val,
                time_val=time_val,
                client_id=client_id,
            )
        except IntegrityError:
            await self.booking_repo.db.rollback()
            existing = await self.booking_repo.find_by_slot(
                client_id=client_id or 0,
                sto_id=sto_id,
                service_id=service_id,
                date_val=date_val,
                time_val=time_val,
            )
            if existing is not None:
                logger.info(
                    "Duplicate booking: returning existing id=%s (client_id=%s, sto_id=%s)",
                    existing.id,
                    client_id,
                    sto_id,
                )
                return existing
            logger.warning("IntegrityError on booking create: client_id=%s, sto_id=%s", client_id, sto_id)
            raise ConflictError(*Errors.DUPLICATE_BOOKING)

        logger.info(
            "Booking created: id=%s, client_id=%s, sto_id=%s, service_id=%s, date=%s",
            booking.id,
            client_id,
            sto_id,
            service_id,
            date_val,
        )

        try:
            from app.repositories.user_repository import UserRepository

            user_repo = UserRepository(self.booking_repo.db)
            client = await user_repo.get_by_id(client_id)
            client_email = client.email if client else ""
            if client_email:
                await notify_booking_created(
                    client_email=client_email,
                    sto_name=sto.name,
                    service_name=sto_svc.catalog_item.name,
                    date_str=booking.date.isoformat(),
                    time_str=booking.time.strftime("%H:%M"),
                    owner=sto.owner,
                    sto=sto,
                )
        except Exception as e:
            logger.error("Notification failed (booking id=%s): %s", booking.id, e)

        return booking

    async def create_booking_guest(
        self,
        sto_id: int,
        service_id: int,
        date_val: date,
        time_val: time,
        *,
        guest_name: str,
        guest_email: str | None = None,
        guest_phone: str,
    ) -> Booking:
        """Create guest booking (no auth)."""
        sto = await self.sto_repo.get_by_id_with_owner(sto_id)
        if sto is None:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        if sto.status != STOStatus.active:
            raise NotFoundError(*Errors.STO_NOT_FOUND)

        sto_svc = await self.sto_svc_repo.get_by_sto_and_service(sto_id, service_id)
        if sto_svc is None:
            raise NotFoundError(*Errors.SERVICE_NOT_FOUND)

        day_of_week = date_val.weekday()
        schedules = await self.schedule_repo.get_by_sto_id(sto_id)
        if schedules:
            schedule_for_day = next(
                (s for s in schedules if s.day_of_week == day_of_week), None
            )
            if schedule_for_day is None or not schedule_for_day.is_working:
                raise ConflictError(*Errors.STO_CLOSED)
            start_min = (
                schedule_for_day.start_time.hour * 60
                + schedule_for_day.start_time.minute
            )
            end_min = (
                schedule_for_day.end_time.hour * 60
                + schedule_for_day.end_time.minute
            )
            slot_min = time_val.hour * 60 + time_val.minute
            if slot_min < start_min or slot_min >= end_min:
                raise ConflictError(*Errors.SLOT_UNAVAILABLE)
        else:
            if day_of_week >= 5:
                raise ConflictError(*Errors.STO_CLOSED)
            slot_min = time_val.hour * 60 + time_val.minute
            if slot_min < 9 * 60 or slot_min >= 18 * 60:
                raise ConflictError(*Errors.SLOT_UNAVAILABLE)

        count = await self.booking_repo.count_parallel_at_slot(
            sto_id, date_val, time_val
        )
        if count >= sto.max_parallel_bookings:
            raise ConflictError(*Errors.SLOT_UNAVAILABLE)

        booking = await self.booking_repo.create(
            sto_id=sto_id,
            service_id=service_id,
            date_val=date_val,
            time_val=time_val,
            client_id=None,
            guest_name=guest_name,
            guest_email=guest_email,
            guest_phone=guest_phone,
        )

        logger.info(
            "Guest booking created: id=%s, sto_id=%s, guest_phone=%s",
            booking.id, sto_id, guest_phone,
        )

        try:
            from app.repositories.user_repository import UserRepository

            user_repo = UserRepository(self.booking_repo.db)
            client = None
            client_email = guest_email or guest_phone
            if client_email:
                await notify_booking_created(
                    client_email=client_email,
                    sto_name=sto.name,
                    service_name=sto_svc.catalog_item.name,
                    date_str=booking.date.isoformat(),
                    time_str=booking.time.strftime("%H:%M"),
                    owner=sto.owner,
                    sto=sto,
                )
        except Exception as e:
            logger.error("Notification failed (booking id=%s): %s", booking.id, e)

        return booking

    async def get_my_bookings(
        self, client_id: int, *, role: str
    ) -> list[Booking]:
        """Get all bookings for client. Only client or admin."""
        if role not in ("client", "admin"):
            raise ForbiddenError(*Errors.FORBIDDEN)
        return await self.booking_repo.get_by_client_id(client_id)

    async def accept_booking(
        self, booking_id: int, user_id: int, role: str | None = None
    ) -> Booking:
        """pending -> accepted. Only sto_owner or admin."""
        return await self._transition(
            booking_id,
            BookingStatus.accepted,
            user_id,
            sto_only=True,
            role=role,
        )

    async def cancel_booking(
        self, booking_id: int, user_id: int, role: str | None = None
    ) -> Booking:
        """pending/accepted -> cancelled. Client, sto_owner, or admin."""
        return await self._transition(
            booking_id,
            BookingStatus.cancelled,
            user_id,
            sto_only=False,
            role=role,
        )

    async def complete_booking(
        self, booking_id: int, user_id: int, role: str | None = None
    ) -> Booking:
        """accepted -> completed. Only sto_owner or admin."""
        return await self._transition(
            booking_id,
            BookingStatus.completed,
            user_id,
            sto_only=True,
            role=role,
        )

    async def reschedule_booking(
        self,
        booking_id: int,
        new_date: date,
        new_time: time,
        user_id: int,
        role: str | None = None,
    ) -> Booking:
        """pending/accepted -> rescheduled. Update date/time. Only sto_owner or admin."""
        booking = await self.booking_repo.get_by_id_with_relations(booking_id)
        if booking is None:
            raise NotFoundError(*Errors.BOOKING_NOT_FOUND)
        self._check_is_sto_owner(booking, user_id, role)

        old_status = booking.status
        if not _can_transition(old_status, BookingStatus.rescheduled):
            raise ConflictError(*Errors.INVALID_STATUS_TRANSITION)

        sto_id = booking.sto_id
        sto = await self.sto_repo.get_by_id_with_owner(sto_id)
        if sto is None or sto.status != STOStatus.active:
            raise NotFoundError(*Errors.STO_NOT_FOUND)

        # Validate new slot (same logic as create_booking)
        day_of_week = new_date.weekday()
        schedules = await self.schedule_repo.get_by_sto_id(sto_id)
        if schedules:
            schedule_for_day = next(
                (s for s in schedules if s.day_of_week == day_of_week), None
            )
            if schedule_for_day is None or not schedule_for_day.is_working:
                raise ConflictError(*Errors.STO_CLOSED)
            start_min = (
                schedule_for_day.start_time.hour * 60
                + schedule_for_day.start_time.minute
            )
            end_min = (
                schedule_for_day.end_time.hour * 60
                + schedule_for_day.end_time.minute
            )
            slot_min = new_time.hour * 60 + new_time.minute
            if slot_min < start_min or slot_min >= end_min:
                raise ConflictError(*Errors.SLOT_UNAVAILABLE)
        else:
            if day_of_week >= 5:
                raise ConflictError(*Errors.STO_CLOSED)
            slot_min = new_time.hour * 60 + new_time.minute
            if slot_min < 9 * 60 or slot_min >= 18 * 60:
                raise ConflictError(*Errors.SLOT_UNAVAILABLE)

        count = await self.booking_repo.count_parallel_at_slot(
            sto_id, new_date, new_time, exclude_booking_id=booking_id
        )
        if count >= sto.max_parallel_bookings:
            raise ConflictError(*Errors.SLOT_UNAVAILABLE)

        await self.booking_repo.update_date_time(booking, new_date, new_time)
        await self.booking_repo.update_status(booking, BookingStatus.rescheduled)

        logger.info(
            "Booking rescheduled: id=%s, new_date=%s, new_time=%s, user_id=%s",
            booking_id, new_date, new_time, user_id,
        )

        try:
            await self._notify_booking_status_change(
                booking, BookingStatus.rescheduled, old_status
            )
        except Exception as e:
            logger.error(
                "Notification failed (booking id=%s): %s",
                booking.id, e,
            )

        return booking

    async def _transition(
        self,
        booking_id: int,
        new_status: BookingStatus,
        user_id: int,
        sto_only: bool,
        role: str | None = None,
    ) -> Booking:
        """Apply status transition with state machine and access check."""
        booking = await self.booking_repo.get_by_id_with_relations(booking_id)
        if booking is None:
            raise NotFoundError(*Errors.BOOKING_NOT_FOUND)

        if sto_only:
            self._check_is_sto_owner(booking, user_id, role)
        else:
            self._check_is_participant(booking, user_id, role)

        old_status = booking.status
        # Client cannot cancel confirmed (accepted) booking
        if (
            new_status == BookingStatus.cancelled
            and old_status == BookingStatus.accepted
            and role == "client"
            and booking.client_id == user_id
        ):
            raise BadRequestError(*Errors.BOOKING_CONFIRMED_CANNOT_CANCEL)

        if not _can_transition(old_status, new_status):
            logger.warning(
                "Invalid booking transition: id=%s, %s -> %s",
                booking_id,
                old_status.value,
                new_status.value,
            )
            raise ConflictError(*Errors.INVALID_STATUS_TRANSITION)

        await self.booking_repo.update_status(booking, new_status)

        logger.info(
            "Booking status updated: id=%s, %s -> %s, user_id=%s",
            booking_id,
            old_status.value,
            new_status.value,
            user_id,
        )

        try:
            await self._notify_booking_status_change(
                booking, new_status, old_status
            )
        except Exception as e:
            logger.error(
                "Telegram notification failed (booking id=%s): %s",
                booking.id,
                e,
            )

        return booking

    async def _notify_booking_status_change(
        self,
        booking: Booking,
        new_status: BookingStatus,
        old_status: BookingStatus,
    ) -> None:
        """Send notifications on status change. Email to client, Telegram to owner, DB notification."""
        from app.services.notification_service import notify_owner_booking_cancelled

        sto = booking.sto
        service_name = booking.catalog_service.name if booking.catalog_service else ""
        client = booking.client
        client_email = client.email if client else ""
        client_id = client.id if client else None
        date_str = booking.date.isoformat()
        time_str = booking.time.strftime("%H:%M")

        # DB notification for client
        if client_id and self.notif_repo:
            try:
                if new_status == BookingStatus.accepted:
                    await self.notif_repo.create(
                        client_id,
                        "Ваша запись подтверждена",
                        f"СТО {sto.name}. {service_name}, {date_str} {time_str}",
                        notif_type="booking",
                    )
                elif new_status == BookingStatus.cancelled:
                    await self.notif_repo.create(
                        client_id,
                        "Ваша запись отменена",
                        f"СТО {sto.name}. {service_name}",
                        notif_type="booking",
                    )
                elif new_status == BookingStatus.rescheduled:
                    await self.notif_repo.create(
                        client_id,
                        "Запись перенесена",
                        f"СТО {sto.name}. Новая дата: {date_str} {time_str}",
                        notif_type="booking",
                    )
            except Exception as e:
                logger.warning("DB notification failed (booking id=%s): %s", booking.id, e)

        if new_status == BookingStatus.accepted and client_email:
            await notify_booking_accepted(
                client_email=client_email,
                sto_name=sto.name,
                service_name=service_name,
                date_str=date_str,
                time_str=time_str,
            )
        elif new_status == BookingStatus.cancelled:
            if client_email:
                await notify_booking_cancelled(
                    client_email=client_email,
                    sto_name=sto.name,
                    service_name=service_name,
                    date_str=date_str,
                    time_str=time_str,
                )
            await notify_owner_booking_cancelled(
                owner=sto.owner,
                sto=sto,
                client_email=client_email or "—",
                service_name=service_name,
                date_str=date_str,
                time_str=time_str,
                booking_id=booking.id,
            )
        elif new_status == BookingStatus.completed and client_email:
            await notify_booking_completed(
                client_email=client_email,
                sto_name=sto.name,
                service_name=service_name,
                date_str=date_str,
                time_str=time_str,
            )
        elif new_status == BookingStatus.rescheduled and client_email:
            await notify_booking_rescheduled(
                client_email=client_email,
                sto_name=sto.name,
                service_name=service_name,
                date_str=date_str,
                time_str=time_str,
            )
