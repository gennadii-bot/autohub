"""Review business logic."""

import logging

from app.core.exceptions import ConflictError, Errors, ForbiddenError, NotFoundError
from app.models import Review
from app.models.enums import BookingStatus
from app.repositories.booking_repository import BookingRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.sto_repository import STORepository

logger = logging.getLogger(__name__)


async def update_sto_rating_from_reviews(
    sto_repo: STORepository,
    review_repo: ReviewRepository,
    sto_id: int,
) -> None:
    """Recalculate and update STO rating from reviews."""
    avg_rating, _ = await review_repo.get_rating_stats(sto_id)
    await sto_repo.update_rating(sto_id, avg_rating)


def _mask_email(email: str) -> str:
    """Mask email for display: a***@example.com."""
    if not email or "@" not in email:
        return "Клиент"
    local, domain = email.rsplit("@", 1)
    if len(local) <= 2:
        masked = local[0] + "***"
    else:
        masked = local[0] + "***" + local[-1]
    return f"{masked}@{domain}"


class ReviewService:
    def __init__(
        self,
        review_repo: ReviewRepository,
        booking_repo: BookingRepository,
        sto_repo: STORepository,
    ):
        self.review_repo = review_repo
        self.booking_repo = booking_repo
        self.sto_repo = sto_repo

    async def create_review(
        self,
        user_id: int,
        booking_id: int,
        rating: int,
        comment: str | None = None,
    ) -> Review:
        """Create review. Only for completed booking owned by user."""
        booking = await self.booking_repo.get_by_id_with_relations(booking_id)
        if booking is None:
            raise NotFoundError(*Errors.BOOKING_NOT_FOUND)
        if booking.client_id != user_id:
            raise ForbiddenError(*Errors.FORBIDDEN)
        if booking.status != BookingStatus.completed:
            raise ConflictError(*Errors.REVIEW_BOOKING_NOT_COMPLETED)
        existing = await self.review_repo.get_by_booking_id(booking_id)
        if existing is not None:
            raise ConflictError(*Errors.REVIEW_ALREADY_EXISTS)
        review = await self.review_repo.create(
            user_id=user_id,
            sto_id=booking.sto_id,
            booking_id=booking_id,
            rating=rating,
            comment=comment,
        )
        await update_sto_rating_from_reviews(
            self.sto_repo, self.review_repo, booking.sto_id
        )
        return review

    async def get_sto_reviews(
        self, sto_id: int, limit: int = 100
    ) -> tuple[float, int, list[dict]]:
        """Returns (avg_rating, total_reviews, items). items have rating, comment, created_at, user_display."""
        sto = await self.sto_repo.get_by_id(sto_id)
        if sto is None:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        avg_rating, total = await self.review_repo.get_rating_stats(sto_id)
        reviews = await self.review_repo.get_by_sto_id(sto_id, limit=limit)
        items = [
            {
                "rating": r.rating,
                "comment": r.comment,
                "created_at": r.created_at,
                "user_display": _mask_email(r.user.email) if r.user else "Клиент",
            }
            for r in reviews
        ]
        return (avg_rating, total, items)
