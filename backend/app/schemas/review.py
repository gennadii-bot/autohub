"""Pydantic schemas for Review."""

import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    booking_id: int = Field(..., gt=0)
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(None, max_length=2000)


class ReviewResponse(BaseModel):
    """Single review for GET /sto/{id}/reviews."""

    rating: int
    comment: str | None
    created_at: datetime.datetime
    user_display: str  # masked email or first_name


class ReviewListResponse(BaseModel):
    """Reviews with aggregate stats."""

    avg_rating: float
    total_reviews: int
    items: list[ReviewResponse]
