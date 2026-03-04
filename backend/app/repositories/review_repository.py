"""Review repository."""

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Review


class ReviewRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: int,
        sto_id: int,
        booking_id: int,
        rating: int,
        comment: str | None = None,
    ) -> Review:
        review = Review(
            user_id=user_id,
            sto_id=sto_id,
            booking_id=booking_id,
            rating=rating,
            comment=comment or None,
        )
        self.db.add(review)
        await self.db.flush()
        await self.db.refresh(review)
        return review

    async def get_by_booking_id(self, booking_id: int) -> Review | None:
        result = await self.db.execute(
            select(Review).where(Review.booking_id == booking_id)
        )
        return result.scalar_one_or_none()

    async def get_by_user_id(self, user_id: int, limit: int = 100) -> list[Review]:
        """Get all reviews by user."""
        result = await self.db.execute(
            select(Review)
            .where(Review.user_id == user_id)
            .options(selectinload(Review.sto))
            .order_by(Review.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().unique().all())

    async def get_by_sto_id(
        self, sto_id: int, limit: int = 100
    ) -> list[Review]:
        result = await self.db.execute(
            select(Review)
            .where(Review.sto_id == sto_id)
            .options(selectinload(Review.user))
            .order_by(Review.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().unique().all())

    async def get_global_avg_rating(self) -> float:
        """Global average rating across all reviews."""
        result = await self.db.execute(
            select(func.coalesce(func.avg(Review.rating), 0)).select_from(Review)
        )
        val = result.scalar()
        return round(float(val or 0), 2) if val is not None else 0.0

    async def get_all_for_admin(
        self,
        sto_id: int | None = None,
        sto_ids: list[int] | None = None,
        limit: int = 500,
    ) -> list[Review]:
        """Get all reviews for admin, optionally filtered by sto_id or sto_ids."""
        q = (
            select(Review)
            .options(
                selectinload(Review.user),
                selectinload(Review.sto),
            )
            .order_by(Review.created_at.desc())
        )
        if sto_id is not None:
            q = q.where(Review.sto_id == sto_id)
        elif sto_ids:
            q = q.where(Review.sto_id.in_(sto_ids))
        q = q.limit(limit)
        result = await self.db.execute(q)
        return list(result.scalars().unique().all())

    async def delete_by_id(self, review_id: int) -> bool:
        """Delete review by id. Returns True if deleted."""
        result = await self.db.execute(delete(Review).where(Review.id == review_id))
        return result.rowcount > 0

    async def get_rating_stats(self, sto_id: int) -> tuple[float, int]:
        """Returns (avg_rating, total_reviews)."""
        result = await self.db.execute(
            select(
                func.coalesce(func.avg(Review.rating), 0).label("avg"),
                func.count(Review.id).label("total"),
            ).where(Review.sto_id == sto_id)
        )
        row = result.one()
        avg_val = float(row.avg) if row.avg is not None else 0.0
        total_val = row.total or 0
        return (round(avg_val, 2), total_val)

    async def get_rating_stats_by_sto_ids(
        self, sto_ids: list[int]
    ) -> tuple[float, int]:
        """Returns (avg_rating, total_reviews) across multiple STOs."""
        if not sto_ids:
            return (0.0, 0)
        result = await self.db.execute(
            select(
                func.coalesce(func.avg(Review.rating), 0).label("avg"),
                func.count(Review.id).label("total"),
            ).where(Review.sto_id.in_(sto_ids))
        )
        row = result.one()
        avg_val = float(row.avg) if row.avg is not None else 0.0
        total_val = row.total or 0
        return (round(avg_val, 2), total_val)
