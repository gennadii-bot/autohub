"""Service catalog repository."""

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ServiceCatalog


class ServiceCatalogRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_active(self) -> list[ServiceCatalog]:
        """Get all active catalog items, ordered by category, name."""
        result = await self.db.execute(
            select(ServiceCatalog)
            .where(ServiceCatalog.is_active.is_(True))
            .order_by(ServiceCatalog.category, ServiceCatalog.name)
        )
        return list(result.scalars().all())

    async def get_all(self) -> list[ServiceCatalog]:
        """Get all catalog items (active and inactive), for admin."""
        result = await self.db.execute(
            select(ServiceCatalog).order_by(ServiceCatalog.category, ServiceCatalog.name)
        )
        return list(result.scalars().all())

    async def get_by_id(self, catalog_id: int) -> ServiceCatalog | None:
        """Get catalog item by id."""
        result = await self.db.execute(
            select(ServiceCatalog).where(ServiceCatalog.id == catalog_id)
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        name: str,
        category: str,
        description: str | None = None,
        is_active: bool = True,
    ) -> ServiceCatalog:
        """Create catalog item."""
        item = ServiceCatalog(
            name=name.strip(),
            category=category.strip(),
            description=description.strip() if description else None,
            is_active=is_active,
        )
        self.db.add(item)
        await self.db.flush()
        await self.db.refresh(item)
        return item

    async def update(
        self,
        catalog_id: int,
        *,
        name: str | None = None,
        category: str | None = None,
        description: str | None = None,
        is_active: bool | None = None,
    ) -> ServiceCatalog | None:
        """Update catalog item."""
        item = await self.get_by_id(catalog_id)
        if not item:
            return None
        if name is not None:
            item.name = name.strip()
        if category is not None:
            item.category = category.strip()
        if description is not None:
            item.description = description.strip() or None
        if is_active is not None:
            item.is_active = is_active
        await self.db.flush()
        await self.db.refresh(item)
        return item

    async def delete_by_id(self, catalog_id: int) -> bool:
        """Delete catalog item. Returns True if deleted."""
        item = await self.get_by_id(catalog_id)
        if not item:
            return False
        await self.db.delete(item)
        await self.db.flush()
        return True
