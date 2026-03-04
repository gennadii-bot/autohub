"""StoService repository."""

from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import ServiceCatalog, StoService, STO


class StoServiceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_sto_id(self, sto_id: int) -> list[StoService]:
        """Get all StoService for STO, with catalog loaded."""
        result = await self.db.execute(
            select(StoService)
            .where(StoService.sto_id == sto_id)
            .options(selectinload(StoService.catalog_item))
            .join(ServiceCatalog, StoService.service_id == ServiceCatalog.id)
            .order_by(ServiceCatalog.category, ServiceCatalog.name)
        )
        return list(result.scalars().unique().all())

    async def get_active_by_sto_id(self, sto_id: int) -> list[StoService]:
        """Get active StoService for STO, with catalog loaded."""
        result = await self.db.execute(
            select(StoService)
            .where(
                StoService.sto_id == sto_id,
                StoService.is_active.is_(True),
            )
            .options(selectinload(StoService.catalog_item))
            .order_by(StoService.service_id)
        )
        return list(result.scalars().unique().all())

    async def get_by_id(self, ss_id: int) -> StoService | None:
        """Get StoService by primary key."""
        result = await self.db.execute(
            select(StoService)
            .where(StoService.id == ss_id)
            .options(selectinload(StoService.catalog_item), selectinload(StoService.sto))
        )
        return result.scalar_one_or_none()

    async def get_by_sto_and_service(
        self, sto_id: int, service_id: int
    ) -> StoService | None:
        """Get StoService for (sto_id, catalog service_id)."""
        result = await self.db.execute(
            select(StoService)
            .where(
                StoService.sto_id == sto_id,
                StoService.service_id == service_id,
            )
            .options(selectinload(StoService.catalog_item))
        )
        return result.scalar_one_or_none()

    async def create_one(
        self,
        sto_id: int,
        service_id: int,
        price: float,
        duration_minutes: int = 30,
        is_active: bool = True,
    ) -> StoService:
        """Create one StoService row."""
        from decimal import Decimal

        ss = StoService(
            sto_id=sto_id,
            service_id=service_id,
            price=Decimal(str(price)),
            duration_minutes=duration_minutes,
            is_active=is_active,
        )
        self.db.add(ss)
        await self.db.flush()
        await self.db.refresh(ss)
        await self.db.refresh(ss, ["catalog_item"])
        return ss

    async def update_one(
        self,
        ss_id: int,
        *,
        price: float | None = None,
        duration_minutes: int | None = None,
        is_active: bool | None = None,
    ) -> StoService | None:
        """Update one StoService by id."""
        ss = await self.get_by_id(ss_id)
        if not ss:
            return None
        if price is not None:
            from decimal import Decimal

            ss.price = Decimal(str(price))
        if duration_minutes is not None:
            ss.duration_minutes = duration_minutes
        if is_active is not None:
            ss.is_active = is_active
        await self.db.flush()
        await self.db.refresh(ss)
        await self.db.refresh(ss, ["catalog_item"])
        return ss

    async def delete_by_id(self, ss_id: int) -> bool:
        """Delete StoService by id. Returns True if deleted."""
        ss = await self.get_by_id(ss_id)
        if not ss:
            return False
        await self.db.delete(ss)
        await self.db.flush()
        return True

    async def replace_for_sto(
        self,
        sto_id: int,
        items: list[tuple[int, float, bool] | tuple[int, float, bool, int]],
        default_duration: int = 30,
    ) -> list[StoService]:
        """Delete existing StoService for sto_id, create new ones. Returns created list.
        Items: (service_id, price, is_active) or (service_id, price, is_active, duration_minutes).
        """
        await self.db.execute(delete(StoService).where(StoService.sto_id == sto_id))
        created: list[StoService] = []
        for item in items:
            service_id = item[0]
            price = item[1]
            is_active = item[2]
            duration = item[3] if len(item) > 3 else default_duration
            ss = StoService(
                sto_id=sto_id,
                service_id=service_id,
                price=Decimal(str(price)),
                duration_minutes=duration,
                is_active=is_active,
            )
            self.db.add(ss)
            created.append(ss)
        await self.db.flush()
        for ss in created:
            await self.db.refresh(ss)
        return created
