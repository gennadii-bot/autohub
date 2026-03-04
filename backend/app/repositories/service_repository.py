"""Service repository."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Service


class ServiceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_sto_id(self, sto_id: int) -> list[Service]:
        """Get all services for STO, ordered by name."""
        result = await self.db.execute(
            select(Service).where(Service.sto_id == sto_id).order_by(Service.name)
        )
        return list(result.scalars().all())

    async def create(
        self,
        sto_id: int,
        name: str,
        price: float,
        duration_minutes: int,
    ) -> Service:
        """Create new service."""
        from decimal import Decimal

        svc = Service(
            sto_id=sto_id,
            name=name,
            price=Decimal(str(price)),
            duration_minutes=duration_minutes,
        )
        self.db.add(svc)
        await self.db.flush()
        await self.db.refresh(svc)
        return svc
