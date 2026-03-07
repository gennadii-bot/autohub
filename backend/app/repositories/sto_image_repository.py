"""STO Image repository."""

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import STOImage


class STOImageRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def count_by_sto(self, sto_id: int) -> int:
        """Count images for STO."""
        result = await self.db.execute(
            select(func.count()).select_from(STOImage).where(STOImage.sto_id == sto_id)
        )
        return result.scalar() or 0

    async def get_by_sto_id(self, sto_id: int) -> list[STOImage]:
        """Get all images for STO, ordered by created_at."""
        result = await self.db.execute(
            select(STOImage).where(STOImage.sto_id == sto_id).order_by(STOImage.id)
        )
        return list(result.scalars().unique().all())

    async def create(self, sto_id: int, image_url: str) -> STOImage:
        """Add image for STO."""
        img = STOImage(sto_id=sto_id, image_url=image_url)
        self.db.add(img)
        await self.db.flush()
        await self.db.refresh(img)
        return img

    async def delete_by_id(self, image_id: int) -> bool:
        """Delete image by id. Returns True if deleted."""
        result = await self.db.execute(delete(STOImage).where(STOImage.id == image_id))
        return result.rowcount > 0

    async def get_by_id(self, image_id: int) -> STOImage | None:
        """Get image by id."""
        result = await self.db.execute(select(STOImage).where(STOImage.id == image_id))
        return result.scalar_one_or_none()
