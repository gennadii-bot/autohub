"""Reviews API."""

from fastapi import APIRouter, Depends, Path

from app.api.deps import get_current_user, get_review_service
from app.schemas.review import ReviewCreate, ReviewListResponse
from app.services.review_service import ReviewService

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("", status_code=201)
async def create_review(
    payload: ReviewCreate,
    user: dict = Depends(get_current_user),
    service: ReviewService = Depends(get_review_service),
):
    """Оставить отзыв на завершённую запись."""
    review = await service.create_review(
        user_id=user["id"],
        booking_id=payload.booking_id,
        rating=payload.rating,
        comment=payload.comment,
    )
    return {"id": review.id, "message": "Отзыв добавлен"}
