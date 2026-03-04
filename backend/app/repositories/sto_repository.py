"""STO repository."""

from datetime import date, datetime

from sqlalchemy import delete, cast, func, select, update
from sqlalchemy.types import Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import City, Service, STO
from app.models.enums import STOStatus


class STORepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def count_all(self) -> int:
        """Total STO count (all statuses)."""
        result = await self.db.execute(select(func.count()).select_from(STO))
        return result.scalar() or 0

    async def count_pending(self) -> int:
        """Count STOs with status=pending."""
        result = await self.db.execute(
            select(func.count()).select_from(STO).where(STO.status == STOStatus.pending)
        )
        return result.scalar() or 0

    async def get_paginated(
        self,
        city_id: int | None = None,
        page: int = 1,
        per_page: int = 20,
        search: str | None = None,
        rating_min: float | None = None,
        service_id: int | None = None,
        sort: str = "name",
    ) -> tuple[list[STO], int]:
        """Get active STOs with city, paginated. Returns (items, total)."""
        base = (
            select(STO)
            .where(STO.status == STOStatus.active)
            .options(selectinload(STO.city).selectinload(City.region))
        )
        count_base = select(func.count()).select_from(STO).where(STO.status == STOStatus.active)

        if city_id is not None:
            base = base.where(STO.city_id == city_id)
            count_base = count_base.where(STO.city_id == city_id)

        if search and search.strip():
            pattern = f"%{search.strip()}%"
            base = base.where(STO.name.ilike(pattern))
            count_base = count_base.where(STO.name.ilike(pattern))

        if rating_min is not None:
            base = base.where(STO.rating >= rating_min)
            count_base = count_base.where(STO.rating >= rating_min)

        if service_id is not None:
            subq = select(Service.sto_id).where(Service.id == service_id)
            base = base.where(STO.id.in_(subq))
            count_base = count_base.where(STO.id.in_(subq))

        total_result = await self.db.execute(count_base)
        total = total_result.scalar() or 0

        if sort == "rating":
            base = base.order_by(STO.rating.desc(), STO.name)
        else:
            base = base.order_by(STO.name)

        base = base.offset((page - 1) * per_page).limit(per_page)
        result = await self.db.execute(base)
        items = list(result.scalars().unique().all())
        return items, total

    async def get_by_id(self, sto_id: int) -> STO | None:
        """Get STO by id."""
        result = await self.db.execute(select(STO).where(STO.id == sto_id))
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> STO | None:
        """Get active STO by slug."""
        result = await self.db.execute(
            select(STO)
            .where(STO.slug == slug, STO.status == STOStatus.active)
        )
        return result.scalar_one_or_none()

    async def get_by_slug_with_services(self, slug: str) -> STO | None:
        """Get active STO by slug with city, services."""
        result = await self.db.execute(
            select(STO)
            .where(STO.slug == slug, STO.status == STOStatus.active)
            .options(
                selectinload(STO.city).selectinload(City.region),
                selectinload(STO.services),
                selectinload(STO.owner),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_id_with_owner(self, sto_id: int) -> STO | None:
        """Get STO by id with owner loaded."""
        result = await self.db.execute(
            select(STO)
            .where(STO.id == sto_id)
            .options(selectinload(STO.owner))
        )
        return result.scalar_one_or_none()

    async def get_ids_by_owner_id(self, owner_id: int) -> list[int]:
        """Get STO ids owned by user."""
        result = await self.db.execute(
            select(STO.id).where(STO.owner_id == owner_id)
        )
        return [r[0] for r in result.all()]

    async def get_by_id_with_services(self, sto_id: int) -> STO | None:
        """Get STO by id with city, services and owner loaded."""
        result = await self.db.execute(
            select(STO)
            .where(STO.id == sto_id)
            .options(
                selectinload(STO.city).selectinload(City.region),
                selectinload(STO.services),
                selectinload(STO.owner),
            )
        )
        return result.scalar_one_or_none()

    def _slugify(self, name: str) -> str:
        s = (name or "sto").lower().strip()
        for c in " -_":
            s = s.replace(c, "-")
        while "--" in s:
            s = s.replace("--", "-")
        return s.strip("-") or "sto"

    async def create(
        self,
        name: str,
        address: str,
        city_id: int,
        owner_id: int,
        description: str | None = None,
        rating: float = 0.0,
        image_url: str | None = None,
        phone: str | None = None,
        whatsapp: str | None = None,
        status: STOStatus = STOStatus.active,
        slug: str | None = None,
    ) -> STO:
        """Create new STO."""
        base_slug = slug or self._slugify(name)
        slug_val = base_slug
        n = 0
        while True:
            r = await self.db.execute(select(STO.id).where(STO.slug == slug_val))
            if r.scalar_one_or_none() is None:
                break
            n += 1
            slug_val = f"{base_slug}-{n}"
        sto = STO(
            name=name,
            slug=slug_val,
            address=address,
            city_id=city_id,
            owner_id=owner_id,
            description=description,
            rating=rating,
            image_url=image_url,
            phone=phone,
            whatsapp=whatsapp,
            status=status,
        )
        self.db.add(sto)
        await self.db.flush()
        await self.db.refresh(sto)
        return sto

    async def has_owner_sto_with_status(
        self,
        owner_id: int,
        *statuses: STOStatus,
    ) -> bool:
        """Check if owner has any STO with given status(es)."""
        result = await self.db.execute(
            select(STO.id).where(
                STO.owner_id == owner_id,
                STO.status.in_(statuses),
            ).limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def exists_by_name_city(self, name: str, city_id: int) -> bool:
        """Check if STO with name+city_id already exists."""
        result = await self.db.execute(
            select(STO.id).where(
                STO.name == name.strip(),
                STO.city_id == city_id,
            ).limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def get_active_stos_by_owner(self, owner_id: int) -> list[STO]:
        """Get all active STOs owned by user, ordered by created_at. Loads city."""
        result = await self.db.execute(
            select(STO)
            .where(
                STO.owner_id == owner_id,
                STO.status == STOStatus.active,
            )
            .options(selectinload(STO.city))
            .order_by(STO.created_at.desc())
        )
        return list(result.scalars().unique().all())

    async def get_pending_stos(self) -> list[STO]:
        """Get all STOs with status=pending, ordered by created_at desc. Loads city and owner."""
        result = await self.db.execute(
            select(STO)
            .where(STO.status == STOStatus.pending)
            .options(
                selectinload(STO.city),
                selectinload(STO.owner),
            )
            .order_by(STO.created_at.desc())
        )
        return list(result.scalars().unique().all())

    async def update_profile(
        self,
        sto_id: int,
        *,
        name: str | None = None,
        phone: str | None = None,
        address: str | None = None,
        description: str | None = None,
        image_url: str | None = None,
    ) -> bool:
        """Update STO profile fields. Returns True if updated."""
        values = {}
        if name is not None:
            values["name"] = name.strip()
        if phone is not None:
            values["phone"] = phone.strip() or None
        if address is not None:
            values["address"] = address.strip()
        if description is not None:
            values["description"] = description.strip() or None
        if image_url is not None:
            values["image_url"] = image_url.strip() or None
        if not values:
            return True
        result = await self.db.execute(update(STO).where(STO.id == sto_id).values(**values))
        return result.rowcount > 0

    async def update_rating(self, sto_id: int, rating: float) -> bool:
        """Update STO rating. Returns True if updated."""
        result = await self.db.execute(
            update(STO).where(STO.id == sto_id).values(rating=rating)
        )
        return result.rowcount > 0

    async def update_max_parallel_bookings(
        self, sto_id: int, max_parallel_bookings: int
    ) -> bool:
        """Update max_parallel_bookings. Returns True if updated."""
        result = await self.db.execute(
            update(STO).where(STO.id == sto_id).values(max_parallel_bookings=max_parallel_bookings)
        )
        return result.rowcount > 0

    async def get_all_for_admin(
        self,
        page: int = 1,
        per_page: int = 20,
        search: str | None = None,
        status: STOStatus | None = None,
    ) -> tuple[list[STO], int]:
        """Get all STOs for admin (any status). Returns (items, total)."""
        return await self._get_stos_query(
            page=page, per_page=per_page, search=search, status=status
        )

    async def get_all_for_owner(
        self,
        owner_id: int,
        page: int = 1,
        per_page: int = 20,
        search: str | None = None,
        status: STOStatus | None = None,
    ) -> tuple[list[STO], int]:
        """Get STOs owned by user. Returns (items, total)."""
        return await self._get_stos_query(
            page=page,
            per_page=per_page,
            search=search,
            status=status,
            owner_id=owner_id,
        )

    async def _get_stos_query(
        self,
        page: int = 1,
        per_page: int = 20,
        search: str | None = None,
        status: STOStatus | None = None,
        owner_id: int | None = None,
    ) -> tuple[list[STO], int]:
        """Shared query for get_all_for_admin and get_all_for_owner."""
        base = select(STO).options(
            selectinload(STO.city).selectinload(City.region),
            selectinload(STO.owner),
        )
        count_base = select(func.count()).select_from(STO)
        if search and search.strip():
            pattern = f"%{search.strip()}%"
            base = base.where(STO.name.ilike(pattern))
            count_base = count_base.where(STO.name.ilike(pattern))
        if status is not None:
            base = base.where(STO.status == status)
            count_base = count_base.where(STO.status == status)
        if owner_id is not None:
            base = base.where(STO.owner_id == owner_id)
            count_base = count_base.where(STO.owner_id == owner_id)
        total_result = await self.db.execute(count_base)
        total = total_result.scalar() or 0
        base = base.order_by(STO.created_at.desc())
        base = base.offset((page - 1) * per_page).limit(per_page)
        result = await self.db.execute(base)
        items = list(result.scalars().unique().all())
        return items, total

    async def count_created_by_date_range(
        self, start_date: date | datetime, end_date: date | datetime
    ) -> list[tuple[str, int]]:
        """Count new STOs grouped by created_at. Uses date_trunc. Returns [(date_str, count), ...]."""
        day_trunc = func.date_trunc("day", STO.created_at)
        day_date = cast(day_trunc, Date)
        stmt = (
            select(day_date.label("d"), func.count(STO.id).label("c"))
            .where(day_date >= start_date, day_date <= end_date)
            .group_by(day_trunc)
            .order_by(day_trunc)
        )
        result = await self.db.execute(stmt)
        return [(str(row.d), row.c) for row in result.all()]

    async def update_status(self, sto_id: int, status: STOStatus) -> bool:
        """Update STO status. Returns True if updated."""
        result = await self.db.execute(
            update(STO).where(STO.id == sto_id).values(status=status)
        )
        return result.rowcount > 0

    async def delete_by_id(self, sto_id: int) -> bool:
        """Delete STO by id. Returns True if deleted. Related rows may cascade."""
        result = await self.db.execute(delete(STO).where(STO.id == sto_id))
        return result.rowcount > 0
