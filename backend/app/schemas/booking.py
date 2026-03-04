"""Pydantic schemas for Booking."""

import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import BookingStatus


class BookingCreate(BaseModel):
    sto_id: int = Field(..., gt=0)
    service_id: int = Field(..., gt=0)
    date: datetime.date = Field(..., description="Дата записи")
    time: datetime.time = Field(..., description="Время записи")
    guest_name: str | None = None
    guest_email: str | None = None
    guest_phone: str | None = None

    @field_validator("date")
    @classmethod
    def date_not_in_past(cls, v: datetime.date) -> datetime.date:
        if v < datetime.date.today():
            raise ValueError("Дата не может быть в прошлом")
        return v


class BookingReschedule(BaseModel):
    """Payload for PATCH /booking/{id}/reschedule."""

    new_date: datetime.date = Field(..., description="Новая дата")
    new_time: datetime.time = Field(..., description="Новое время")

    @field_validator("new_date")
    @classmethod
    def date_not_in_past(cls, v: datetime.date) -> datetime.date:
        if v < datetime.date.today():
            raise ValueError("Дата не может быть в прошлом")
        return v


class BookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int | None
    sto_id: int
    service_id: int
    date: datetime.date
    time: datetime.time
    status: BookingStatus
    created_at: datetime.datetime


class CreateBookingResponse(BaseModel):
    """Response for POST /booking."""

    id: int
    status: BookingStatus
    message: str = "Запись создана и ожидает подтверждения"


class OwnerBookingResponse(BaseModel):
    """Booking for owner panel with client and service names."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    client_email: str = ""
    sto_id: int
    service_id: int
    service_name: str = ""
    date: datetime.date
    time: datetime.time
    status: BookingStatus
    created_at: datetime.datetime

    @classmethod
    def from_booking(cls, booking) -> "OwnerBookingResponse":
        client_email = ""
        if booking.client:
            client_email = booking.client.email or ""
        elif booking.guest_email:
            client_email = booking.guest_email
        elif booking.guest_phone:
            client_email = f"Гость ({booking.guest_phone})"
        return cls(
            id=booking.id,
            client_id=booking.client_id or 0,
            client_email=client_email,
            sto_id=booking.sto_id,
            service_id=booking.service_id,
            service_name=booking.catalog_service.name if booking.catalog_service else "",
            date=booking.date,
            time=booking.time,
            status=booking.status,
            created_at=booking.created_at,
        )


class BookingDetailResponse(BookingResponse):
    """Booking with sto_name, service_name, price, has_review, sto_image_url, unread_count for dashboard."""

    sto_name: str = ""
    service_name: str = ""
    price: float | None = None
    has_review: bool = False
    review_rating: int | None = None
    sto_image_url: str | None = None
    unread_count: int = 0

    @classmethod
    def from_booking(cls, booking, unread_count: int = 0) -> "BookingDetailResponse":
        sto = booking.sto
        image_url = sto.image_url if sto and sto.image_url else None
        review = booking.review
        price_val = None
        if sto and hasattr(sto, "sto_services") and sto.sto_services:
            sto_svc = next(
                (s for s in sto.sto_services if s.service_id == booking.service_id),
                None,
            )
            if sto_svc and sto_svc.price is not None:
                price_val = float(sto_svc.price)
        return cls(
            id=booking.id,
            client_id=booking.client_id or 0,
            sto_id=booking.sto_id,
            service_id=booking.service_id,
            date=booking.date,
            time=booking.time,
            status=booking.status,
            created_at=booking.created_at,
            sto_name=sto.name if sto else "",
            service_name=booking.catalog_service.name if booking.catalog_service else "",
            price=price_val,
            has_review=review is not None,
            review_rating=review.rating if review else None,
            sto_image_url=image_url,
            unread_count=unread_count,
        )