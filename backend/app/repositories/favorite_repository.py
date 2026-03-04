"""Favorite repository."""

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Favorite


class FavoriteRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add(self, user_id: int, sto_id: int) -> Favorite:
        """Add STO to favorites. Raises IntegrityError if already exists."""
        fav = Favorite(user_id=user_id, sto_id=sto_id)
        self.db.add(fav)
        await self.db.flush()
        await self.db.refresh(fav)
        return fav

    async def remove(self, user_id: int, sto_id: int) -> bool:
        """Remove STO from favorites. Returns True if removed."""
        result = await self.db.execute(
            delete(Favorite).where(
                Favorite.user_id == user_id,
                Favorite.sto_id == sto_id,
            )
        )
        return result.rowcount > 0

    async def exists(self, user_id: int, sto_id: int) -> bool:
        """Check if STO is in user's favorites."""
        result = await self.db.execute(
            select(Favorite).where(
                Favorite.user_id == user_id,
                Favorite.sto_id == sto_id,
            )
        )
        return result.scalar_one_or_none() is not None

    async def get_sto_ids(self, user_id: int) -> list[int]:
        """Get list of sto_ids that user has favorited."""
        result = await self.db.execute(
            select(Favorite.sto_id).where(Favorite.user_id == user_id)
        )
        return [r[0] for r in result.all()]

    async def get_favorites_with_sto(self, user_id: int) -> list[Favorite]:
        """Get favorites with STO loaded."""
        result = await self.db.execute(
            select(Favorite)
            .where(Favorite.user_id == user_id)
            .options(selectinload(Favorite.sto))
        )
        return list(result.scalars().unique().all())
