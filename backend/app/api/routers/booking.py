"""Booking API."""

from fastapi import APIRouter, Depends, Path

from app.api.deps import (
    get_booking_service,
    get_current_user,
    get_current_user_optional,
    get_current_user_sto_or_admin,
    get_message_repository,
    require_client,
)
from app.repositories.message_repository import MessageRepository
from app.schemas import BookingCreate, BookingResponse
from app.schemas.booking import BookingDetailResponse, BookingReschedule, CreateBookingResponse
from app.services import BookingService

router = APIRouter(prefix="/booking", tags=["booking"])


@router.post("", response_model=CreateBookingResponse, status_code=201)
async def create_booking(
    payload: BookingCreate,
    user: dict | None = Depends(get_current_user_optional),
    service: BookingService = Depends(get_booking_service),
):
    """Создать запись. С авторизацией — привязка к user. Без — guest (guest_name, guest_phone обязательны)."""
    from fastapi import HTTPException

    if user and user.get("role") in ("client", "admin"):
        booking = await service.create_booking(
            client_id=user["id"],
            sto_id=payload.sto_id,
            service_id=payload.service_id,
            date_val=payload.date,
            time_val=payload.time,
            role=user["role"],
        )
    else:
        if not payload.guest_name or not payload.guest_phone:
            raise HTTPException(
                status_code=400,
                detail="Укажите имя и телефон для записи без входа",
            )
        booking = await service.create_booking_guest(
            sto_id=payload.sto_id,
            service_id=payload.service_id,
            date_val=payload.date,
            time_val=payload.time,
            guest_name=payload.guest_name,
            guest_email=payload.guest_email,
            guest_phone=payload.guest_phone,
        )
    return CreateBookingResponse(
        id=booking.id,
        status=booking.status,
        message="Заявка отправлена СТО",
    )


@router.get("/my", response_model=list[BookingDetailResponse])
async def get_my_bookings(
    user: dict = Depends(require_client),
    service: BookingService = Depends(get_booking_service),
    msg_repo: MessageRepository = Depends(get_message_repository),
):
    """Мои записи. Только role=client. Возвращает [] если записей нет."""
    bookings = await service.get_my_bookings(
        client_id=user["id"],
        role=user["role"],
    )
    booking_ids = [b.id for b in bookings]
    unread = await msg_repo.get_unread_counts_by_booking(booking_ids, user["id"])
    return [
        BookingDetailResponse.from_booking(b, unread.get(b.id, 0))
        for b in bookings
    ]


@router.patch("/{booking_id}/accept", response_model=BookingResponse)
async def accept_booking(
    booking_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user_sto_or_admin),
    service: BookingService = Depends(get_booking_service),
):
    """Принять запись (pending -> accepted). sto_owner или admin."""
    booking = await service.accept_booking(
        booking_id, user_id=user["id"], role=user["role"]
    )
    return BookingResponse.model_validate(booking)


@router.patch("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user),
    service: BookingService = Depends(get_booking_service),
):
    """Отменить запись (pending/accepted -> cancelled). Клиент, sto_owner или admin."""
    booking = await service.cancel_booking(
        booking_id, user_id=user["id"], role=user["role"]
    )
    return BookingResponse.model_validate(booking)


@router.patch("/{booking_id}/complete", response_model=BookingResponse)
async def complete_booking(
    booking_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user_sto_or_admin),
    service: BookingService = Depends(get_booking_service),
):
    """Завершить запись (accepted -> completed). sto_owner или admin."""
    booking = await service.complete_booking(
        booking_id, user_id=user["id"], role=user["role"]
    )
    return BookingResponse.model_validate(booking)


@router.patch("/{booking_id}/reschedule", response_model=BookingResponse)
async def reschedule_booking(
    payload: BookingReschedule,
    booking_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user_sto_or_admin),
    service: BookingService = Depends(get_booking_service),
):
    """Перенести запись (pending/accepted -> rescheduled). sto_owner или admin."""
    booking = await service.reschedule_booking(
        booking_id=booking_id,
        new_date=payload.new_date,
        new_time=payload.new_time,
        user_id=user["id"],
        role=user["role"],
    )
    return BookingResponse.model_validate(booking)
