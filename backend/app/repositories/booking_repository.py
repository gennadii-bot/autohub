"""Booking repository."""

from datetime import date, datetime, time, timezone

from sqlalchemy import and_, cast, func, select
from sqlalchemy.types import Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Booking, STO, StoService
from app.models.enums import BookingStatus


class BookingRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        sto_id: int,
        service_id: int,
        date_val: date,
        time_val: time,
        *,
        client_id: int | None = None,
        guest_name: str | None = None,
        guest_email: str | None = None,
        guest_phone: str | None = None,
    ) -> Booking:
        """Create a new booking. Either client_id or guest_* required."""
        booking = Booking(
            client_id=client_id,
            sto_id=sto_id,
            service_id=service_id,
            date=date_val,
            time=time_val,
            guest_name=guest_name,
            guest_email=guest_email,
            guest_phone=guest_phone,
            status=BookingStatus.pending,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(booking)
        await self.db.flush()
        await self.db.refresh(booking)
        return booking

    async def get_by_id(self, booking_id: int) -> Booking | None:
        """Get booking by id."""
        result = await self.db.execute(
            select(Booking).where(Booking.id == booking_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id_with_relations(self, booking_id: int) -> Booking | None:
        """Get booking by id with client, sto and catalog_service loaded."""
        result = await self.db.execute(
            select(Booking)
            .where(Booking.id == booking_id)
            .options(
                selectinload(Booking.client),
                selectinload(Booking.sto),
                selectinload(Booking.catalog_service),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_client_id(self, client_id: int) -> list[Booking]:
        """Get all bookings for a client with sto, sto_services, catalog_service, client, review loaded."""
        result = await self.db.execute(
            select(Booking)
            .where(Booking.client_id == client_id)
            .options(
                selectinload(Booking.client),
                selectinload(Booking.sto).selectinload(STO.sto_services),
                selectinload(Booking.catalog_service),
                selectinload(Booking.review),
            )
            .order_by(Booking.date, Booking.time)
        )
        return list(result.scalars().unique().all())

    async def get_by_sto_id(self, sto_id: int) -> list[Booking]:
        """Get all bookings for a single STO, ordered by date, time."""
        result = await self.db.execute(
            select(Booking)
            .where(Booking.sto_id == sto_id)
            .options(
                selectinload(Booking.client),
                selectinload(Booking.sto),
                selectinload(Booking.catalog_service),
            )
            .order_by(Booking.date, Booking.time)
        )
        return list(result.scalars().unique().all())

    async def get_by_sto_ids(
        self, sto_ids: list[int]
    ) -> list[Booking]:
        """Get all non-cancelled bookings for given STOs."""
        if not sto_ids:
            return []
        result = await self.db.execute(
            select(Booking)
            .where(
                Booking.sto_id.in_(sto_ids),
                Booking.status != BookingStatus.cancelled,
            )
            .options(
                selectinload(Booking.client),
                selectinload(Booking.sto),
                selectinload(Booking.catalog_service),
            )
            .order_by(Booking.date, Booking.time)
        )
        return list(result.scalars().unique().all())

    async def find_by_slot(
        self,
        client_id: int,
        sto_id: int,
        service_id: int,
        date_val: date,
        time_val: time,
    ) -> Booking | None:
        """Find existing non-cancelled booking for same slot."""
        result = await self.db.execute(
            select(Booking).where(
                Booking.client_id == client_id,
                Booking.sto_id == sto_id,
                Booking.service_id == service_id,
                Booking.date == date_val,
                Booking.time == time_val,
                Booking.status != BookingStatus.cancelled,
            )
        )
        return result.scalar_one_or_none()

    async def update_status(self, booking: Booking, new_status: BookingStatus) -> Booking:
        """Update booking status."""
        booking.status = new_status
        await self.db.flush()
        await self.db.refresh(booking)
        return booking

    async def update_date_time(
        self, booking: Booking, new_date: date, new_time: time
    ) -> Booking:
        """Update booking date and time (for reschedule)."""
        booking.date = new_date
        booking.time = new_time
        await self.db.flush()
        await self.db.refresh(booking)
        return booking

    async def count_parallel_at_slot(
        self,
        sto_id: int,
        date_val: date,
        time_val: time,
        *,
        exclude_booking_id: int | None = None,
    ) -> int:
        """Count pending+accepted+rescheduled bookings at exact (sto, date, time).
        Optionally exclude a booking (e.g. when rescheduling to same slot)."""
        cond = and_(
            Booking.sto_id == sto_id,
            Booking.date == date_val,
            Booking.time == time_val,
            Booking.status.in_(
                [BookingStatus.pending, BookingStatus.accepted, BookingStatus.rescheduled],
            ),
        )
        if exclude_booking_id is not None:
            cond = and_(cond, Booking.id != exclude_booking_id)
        result = await self.db.execute(
            select(func.count(Booking.id)).where(cond)
        )
        return result.scalar() or 0

    async def count_all(self) -> int:
        """Total bookings count."""
        result = await self.db.execute(select(func.count()).select_from(Booking))
        return result.scalar() or 0

    async def count_completed(self) -> int:
        """Count completed bookings."""
        result = await self.db.execute(
            select(func.count()).select_from(Booking).where(
                Booking.status == BookingStatus.completed
            )
        )
        return result.scalar() or 0

    async def count_in_date_range_by_booking_date(
        self, start_date: date, end_date: date
    ) -> int:
        """Count all bookings with booking date in range."""
        result = await self.db.execute(
            select(func.count()).select_from(Booking).where(
                Booking.date >= start_date,
                Booking.date <= end_date,
            )
        )
        return result.scalar() or 0

    async def count_completed_in_date_range_by_booking_date(
        self, start_date: date, end_date: date
    ) -> int:
        """Count completed bookings with booking date in range."""
        result = await self.db.execute(
            select(func.count()).select_from(Booking).where(
                Booking.date >= start_date,
                Booking.date <= end_date,
                Booking.status == BookingStatus.completed,
            )
        )
        return result.scalar() or 0

    async def count_grouped_by_created_date(
        self, start_date: date, end_date: date
    ) -> list[tuple[str, int]]:
        """Count bookings grouped by created_at date. Returns [(date_str, count), ...]."""
        day_date = cast(func.date_trunc("day", Booking.created_at), Date)
        stmt = (
            select(day_date.label("d"), func.count(Booking.id).label("c"))
            .where(day_date >= start_date, day_date <= end_date)
            .group_by(day_date)
            .order_by(day_date)
        )
        result = await self.db.execute(stmt)
        return [(str(row.d), row.c) for row in result.all()]

    async def revenue_grouped_by_created_date(
        self, start_date: date, end_date: date
    ) -> list[tuple[str, float]]:
        """Revenue (completed, from StoService join) grouped by created_at date. Returns [(date_str, revenue), ...]."""
        day_date = cast(func.date_trunc("day", Booking.created_at), Date)
        stmt = (
            select(day_date.label("d"), func.coalesce(func.sum(StoService.price), 0).label("rev"))
            .select_from(Booking)
            .join(
                StoService,
                and_(
                    Booking.sto_id == StoService.sto_id,
                    Booking.service_id == StoService.service_id,
                ),
            )
            .where(
                Booking.status == BookingStatus.completed,
                day_date >= start_date,
                day_date <= end_date,
            )
            .group_by(day_date)
            .order_by(day_date)
        )
        result = await self.db.execute(stmt)
        return [(str(row.d), float(row.rev)) for row in result.all()]

    async def total_revenue_all(self) -> float:
        """Total revenue (completed bookings, StoService price) across all STOs."""
        stmt = (
            select(func.coalesce(func.sum(StoService.price), 0))
            .select_from(Booking)
            .join(
                StoService,
                and_(
                    Booking.sto_id == StoService.sto_id,
                    Booking.service_id == StoService.service_id,
                ),
            )
            .where(Booking.status == BookingStatus.completed)
        )
        result = await self.db.execute(stmt)
        return float(result.scalar() or 0)

    async def revenue_in_date_range(
        self, start_date: date, end_date: date
    ) -> float:
        """Total revenue for completed bookings with created_at in range."""
        day_date = cast(func.date_trunc("day", Booking.created_at), Date)
        stmt = (
            select(func.coalesce(func.sum(StoService.price), 0))
            .select_from(Booking)
            .join(
                StoService,
                and_(
                    Booking.sto_id == StoService.sto_id,
                    Booking.service_id == StoService.service_id,
                ),
            )
            .where(
                Booking.status == BookingStatus.completed,
                day_date >= start_date,
                day_date <= end_date,
            )
        )
        result = await self.db.execute(stmt)
        return float(result.scalar() or 0)

    async def count_completed_by_date_range(
        self, start_date: date, end_date: date
    ) -> list[tuple[str, int]]:
        """Count completed bookings grouped by created_at. Uses date_trunc. Returns [(date_str, count), ...]."""
        day_trunc = func.date_trunc("day", Booking.created_at)
        day_date = cast(day_trunc, Date)
        stmt = (
            select(day_date.label("d"), func.count(Booking.id).label("c"))
            .where(
                Booking.status == BookingStatus.completed,
                day_date >= start_date,
                day_date <= end_date,
            )
            .group_by(day_trunc)
            .order_by(day_trunc)
        )
        result = await self.db.execute(stmt)
        return [(str(row.d), row.c) for row in result.all()]

    async def revenue_by_sto(self, sto_id: int) -> float:
        """Total revenue (sum of service prices) for completed bookings at STO."""
        from sqlalchemy import and_

        subq = (
            select(func.coalesce(func.sum(StoService.price), 0))
            .select_from(Booking)
            .join(
                StoService,
                and_(
                    Booking.sto_id == StoService.sto_id,
                    Booking.service_id == StoService.service_id,
                ),
            )
            .where(
                Booking.sto_id == sto_id,
                Booking.status == BookingStatus.completed,
            )
        )
        result = await self.db.execute(subq)
        val = result.scalar()
        return float(val or 0)

    async def revenue_by_sto_ids(self, sto_ids: list[int]) -> float:
        """Total revenue for completed bookings across multiple STOs."""
        if not sto_ids:
            return 0.0
        from sqlalchemy import and_

        subq = (
            select(func.coalesce(func.sum(StoService.price), 0))
            .select_from(Booking)
            .join(
                StoService,
                and_(
                    Booking.sto_id == StoService.sto_id,
                    Booking.service_id == StoService.service_id,
                ),
            )
            .where(
                Booking.sto_id.in_(sto_ids),
                Booking.status == BookingStatus.completed,
            )
        )
        result = await self.db.execute(subq)
        val = result.scalar()
        return float(val or 0)

    async def count_by_sto_ids(self, sto_ids: list[int]) -> dict[str, int]:
        """Aggregate counts across multiple STOs."""
        if not sto_ids:
            return {"total": 0, "completed": 0, "cancelled": 0}
        total_r = await self.db.execute(
            select(func.count()).select_from(Booking).where(Booking.sto_id.in_(sto_ids))
        )
        completed_r = await self.db.execute(
            select(func.count())
            .select_from(Booking)
            .where(
                Booking.sto_id.in_(sto_ids),
                Booking.status == BookingStatus.completed,
            )
        )
        cancelled_r = await self.db.execute(
            select(func.count())
            .select_from(Booking)
            .where(
                Booking.sto_id.in_(sto_ids),
                Booking.status == BookingStatus.cancelled,
            )
        )
        return {
            "total": total_r.scalar() or 0,
            "completed": completed_r.scalar() or 0,
            "cancelled": cancelled_r.scalar() or 0,
        }

    async def count_completed_by_sto_ids_and_date_range(
        self, sto_ids: list[int], start_date: date, end_date: date
    ) -> list[tuple[str, int]]:
        """Count completed bookings for STOs grouped by date (booking date)."""
        if not sto_ids:
            return []
        date_col = func.date(Booking.date)
        subq = (
            select(date_col.label("d"), func.count(Booking.id).label("c"))
            .where(
                Booking.sto_id.in_(sto_ids),
                Booking.status == BookingStatus.completed,
                date_col >= start_date,
                date_col <= end_date,
            )
            .group_by(date_col)
            .order_by(date_col)
        )
        result = await self.db.execute(subq)
        return [(str(row.d), row.c) for row in result.all()]

    async def revenue_by_sto_ids_grouped_by_date(
        self,
        sto_ids: list[int],
        start_date: date,
        end_date: date,
        group_by: str = "day",
    ) -> list[tuple[str, float]]:
        """Revenue (completed) for sto_ids grouped by created_at. [(date_str, revenue), ...]."""
        return await self._revenue_by_sto_ids_grouped(
            sto_ids, start_date, end_date, group_by=group_by
        )

    async def count_by_sto_ids_grouped_by_created_date(
        self,
        sto_ids: list[int],
        start_date: date,
        end_date: date,
        group_by: str = "day",
    ) -> list[tuple[str, int]]:
        """Count completed bookings for sto_ids grouped by created_at. [(date_str, count), ...]."""
        return await self._count_completed_by_sto_ids_grouped(
            sto_ids, start_date, end_date, group_by=group_by
        )

    def _trunc_expr(self, col, group_by: str):
        """Return SQL expression for grouping by day/week/month."""
        if group_by == "week":
            return cast(func.date_trunc("week", col), Date)
        if group_by == "month":
            return cast(func.date_trunc("month", col), Date)
        return cast(func.date_trunc("day", col), Date)

    async def count_all_by_sto_ids_grouped_by_created_date(
        self,
        sto_ids: list[int],
        start_date: date,
        end_date: date,
        group_by: str = "day",
    ) -> list[tuple[str, int]]:
        """Count all bookings (any status) for sto_ids grouped by created_at. [(date_str, count), ...]."""
        return await self._count_all_by_sto_ids_grouped(
            sto_ids, start_date, end_date, group_by=group_by
        )

    async def _count_all_by_sto_ids_grouped(
        self,
        sto_ids: list[int],
        start_date: date,
        end_date: date,
        group_by: str = "day",
    ) -> list[tuple[str, int]]:
        """Count all bookings grouped by created_at with day/week/month. [(date_str, count), ...]."""
        if not sto_ids:
            return []
        trunc = self._trunc_expr(Booking.created_at, group_by)
        stmt = (
            select(trunc.label("d"), func.count(Booking.id).label("c"))
            .where(
                Booking.sto_id.in_(sto_ids),
                trunc >= start_date,
                trunc <= end_date,
            )
            .group_by(trunc)
            .order_by(trunc)
        )
        result = await self.db.execute(stmt)
        return [(str(row.d), row.c) for row in result.all()]

    async def _count_completed_by_sto_ids_grouped(
        self,
        sto_ids: list[int],
        start_date: date,
        end_date: date,
        group_by: str = "day",
    ) -> list[tuple[str, int]]:
        """Count completed bookings grouped. [(date_str, count), ...]."""
        if not sto_ids:
            return []
        trunc = self._trunc_expr(Booking.created_at, group_by)
        stmt = (
            select(trunc.label("d"), func.count(Booking.id).label("c"))
            .where(
                Booking.sto_id.in_(sto_ids),
                Booking.status == BookingStatus.completed,
                trunc >= start_date,
                trunc <= end_date,
            )
            .group_by(trunc)
            .order_by(trunc)
        )
        result = await self.db.execute(stmt)
        return [(str(row.d), row.c) for row in result.all()]

    async def _revenue_by_sto_ids_grouped(
        self,
        sto_ids: list[int],
        start_date: date,
        end_date: date,
        group_by: str = "day",
    ) -> list[tuple[str, float]]:
        """Revenue grouped by created_at. [(date_str, revenue), ...]."""
        if not sto_ids:
            return []
        trunc = self._trunc_expr(Booking.created_at, group_by)
        stmt = (
            select(trunc.label("d"), func.coalesce(func.sum(StoService.price), 0).label("rev"))
            .select_from(Booking)
            .join(
                StoService,
                and_(
                    Booking.sto_id == StoService.sto_id,
                    Booking.service_id == StoService.service_id,
                ),
            )
            .where(
                Booking.sto_id.in_(sto_ids),
                Booking.status == BookingStatus.completed,
                trunc >= start_date,
                trunc <= end_date,
            )
            .group_by(trunc)
            .order_by(trunc)
        )
        result = await self.db.execute(stmt)
        return [(str(row.d), float(row.rev)) for row in result.all()]

    async def analytics_services_by_sto_ids(
        self, sto_ids: list[int]
    ) -> list[tuple[str, int, float]]:
        """For partner analytics: (service_name, bookings_count, revenue) per service, completed only."""
        if not sto_ids:
            return []
        from app.models import ServiceCatalog

        stmt = (
            select(
                ServiceCatalog.name.label("name"),
                func.count(Booking.id).label("cnt"),
                func.coalesce(func.sum(StoService.price), 0).label("rev"),
            )
            .select_from(Booking)
            .join(
                StoService,
                and_(
                    Booking.sto_id == StoService.sto_id,
                    Booking.service_id == StoService.service_id,
                ),
            )
            .join(ServiceCatalog, ServiceCatalog.id == Booking.service_id)
            .where(
                Booking.sto_id.in_(sto_ids),
                Booking.status == BookingStatus.completed,
            )
            .group_by(ServiceCatalog.id, ServiceCatalog.name)
            .order_by(func.count(Booking.id).desc())
        )
        result = await self.db.execute(stmt)
        return [(row.name, row.cnt, float(row.rev)) for row in result.all()]

    async def popular_services_by_sto_ids(
        self, sto_ids: list[int], limit: int = 5
    ) -> list[tuple[int, str, int]]:
        """Top services by completed bookings count across STOs."""
        if not sto_ids:
            return []
        from app.models import ServiceCatalog

        subq = (
            select(
                Booking.service_id,
                func.count(Booking.id).label("cnt"),
            )
            .where(
                Booking.sto_id.in_(sto_ids),
                Booking.status == BookingStatus.completed,
            )
            .group_by(Booking.service_id)
        )
        result = await self.db.execute(subq)
        rows = result.all()
        if not rows:
            return []
        service_ids = [r[0] for r in rows[: limit * 2]]
        names_q = select(ServiceCatalog.id, ServiceCatalog.name).where(
            ServiceCatalog.id.in_(service_ids)
        )
        names_result = await self.db.execute(names_q)
        name_map = {r[0]: r[1] for r in names_result.all()}
        return [(sid, name_map.get(sid, "?"), cnt) for sid, cnt in rows[:limit]]

    async def popular_services_by_sto(
        self, sto_id: int, limit: int = 5
    ) -> list[tuple[int, str, int]]:
        """Top services by completed bookings count for STO. Returns [(service_id, name, count), ...]."""
        from app.models import ServiceCatalog

        subq = (
            select(
                Booking.service_id,
                func.count(Booking.id).label("cnt"),
            )
            .where(
                Booking.sto_id == sto_id,
                Booking.status == BookingStatus.completed,
            )
            .group_by(Booking.service_id)
        )
        result = await self.db.execute(subq)
        rows = result.all()
        if not rows:
            return []
        service_ids = [r[0] for r in rows[: limit * 2]]
        names_q = select(ServiceCatalog.id, ServiceCatalog.name).where(
            ServiceCatalog.id.in_(service_ids)
        )
        names_result = await self.db.execute(names_q)
        name_map = {r[0]: r[1] for r in names_result.all()}
        out = [(sid, name_map.get(sid, "?"), cnt) for sid, cnt in rows[:limit]]
        return out

    async def count_by_sto(
        self, sto_id: int
    ) -> dict[str, int]:
        """Count bookings by status for STO. Returns dict with total, completed, cancelled, etc."""
        total_r = await self.db.execute(
            select(func.count()).select_from(Booking).where(Booking.sto_id == sto_id)
        )
        completed_r = await self.db.execute(
            select(func.count())
            .select_from(Booking)
            .where(
                Booking.sto_id == sto_id,
                Booking.status == BookingStatus.completed,
            )
        )
        cancelled_r = await self.db.execute(
            select(func.count())
            .select_from(Booking)
            .where(
                Booking.sto_id == sto_id,
                Booking.status == BookingStatus.cancelled,
            )
        )
        unique_clients_r = await self.db.execute(
            select(func.count(func.distinct(Booking.client_id))).where(
                Booking.sto_id == sto_id,
                Booking.status == BookingStatus.completed,
            )
        )
        return {
            "total": total_r.scalar() or 0,
            "completed": completed_r.scalar() or 0,
            "cancelled": cancelled_r.scalar() or 0,
            "unique_clients": unique_clients_r.scalar() or 0,
        }

    async def count_completed_by_sto_and_date_range(
        self, sto_id: int, start_date: date, end_date: date
    ) -> list[tuple[str, int]]:
        """Count completed bookings for STO grouped by date."""
        date_col = func.date(Booking.date)
        subq = (
            select(date_col.label("d"), func.count(Booking.id).label("c"))
            .where(
                Booking.sto_id == sto_id,
                Booking.status == BookingStatus.completed,
                date_col >= start_date,
                date_col <= end_date,
            )
            .group_by(date_col)
            .order_by(date_col)
        )
        result = await self.db.execute(subq)
        return [(str(row.d), row.c) for row in result.all()]

    async def get_all_for_admin(
        self,
        sto_id: int | None = None,
        sto_ids: list[int] | None = None,
        limit: int = 500,
        status: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[Booking]:
        """Get all bookings for admin, optionally filtered by sto, status, date range."""
        q = (
            select(Booking)
            .options(
                selectinload(Booking.client),
                selectinload(Booking.sto).selectinload(STO.sto_services),
                selectinload(Booking.catalog_service),
            )
            .order_by(Booking.created_at.desc())
        )
        if sto_id is not None:
            q = q.where(Booking.sto_id == sto_id)
        elif sto_ids:
            q = q.where(Booking.sto_id.in_(sto_ids))
        if status is not None:
            try:
                status_enum = BookingStatus(status)
                q = q.where(Booking.status == status_enum)
            except ValueError:
                pass
        if date_from is not None:
            q = q.where(Booking.date >= date_from)
        if date_to is not None:
            q = q.where(Booking.date <= date_to)
        q = q.limit(limit)
        result = await self.db.execute(q)
        return list(result.scalars().unique().all())

    async def get_bookings_for_date(
        self,
        sto_id: int,
        date_val: date,
        sto_service_duration_map: dict[tuple[int, int], int],
    ) -> list[tuple[Booking, int]]:
        """Get non-cancelled bookings for sto+date with duration from sto_service_duration_map.
        Map key: (sto_id, service_id), value: duration_minutes.
        """
        result = await self.db.execute(
            select(Booking)
            .where(
                Booking.sto_id == sto_id,
                Booking.date == date_val,
                Booking.status != BookingStatus.cancelled,
            )
        )
        bookings = list(result.scalars().unique().all())
        out: list[tuple[Booking, int]] = []
        for b in bookings:
            duration = sto_service_duration_map.get(
                (b.sto_id, b.service_id), 30
            )
            out.append((b, duration))
        return out
