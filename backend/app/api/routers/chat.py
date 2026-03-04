"""Chat API — messages between client and STO."""

import logging
import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, Path as PathParam, UploadFile
from pydantic import BaseModel, Field

from app.api.deps import (
    get_booking_repository,
    get_message_repository,
    get_notification_repository,
    get_current_user,
)
from app.core.config import settings
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError, Errors
from app.repositories.booking_repository import BookingRepository
from app.repositories.message_repository import MessageRepository
from app.repositories.notification_repository import NotificationRepository

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)


class MessageCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


def _check_booking_participant(booking, user_id: int, role: str) -> None:
    """Client or STO owner can access chat."""
    if role == "admin":
        return
    is_client = booking.client_id == user_id
    is_owner = booking.sto and booking.sto.owner_id == user_id
    if not (is_client or is_owner):
        raise ForbiddenError(*Errors.FORBIDDEN)


def _get_receiver_id(booking, user_id: int) -> int:
    if user_id == booking.client_id:
        return booking.sto.owner_id if booking.sto and booking.sto.owner_id else 0
    return booking.client_id or 0


def _is_sender_client(booking, user_id: int) -> bool:
    return booking.client_id == user_id


@router.get("/unread/count")
async def get_chat_unread_count(
    user: dict = Depends(get_current_user),
    msg_repo: MessageRepository = Depends(get_message_repository),
):
    """Get total unread message count for current user (for badge)."""
    count = await msg_repo.count_total_unread_for_receiver(user["id"])
    return {"count": count}


async def _create_chat_notification(
    notif_repo: NotificationRepository,
    receiver_id: int,
    is_from_client: bool,
) -> None:
    """Create in-app notification for new chat message."""
    title = "Новое сообщение от клиента" if is_from_client else "Новое сообщение от СТО"
    await notif_repo.create(
        user_id=receiver_id,
        title=title,
        message="Новое сообщение в чате",
        notif_type="chat",
    )


@router.get("/{booking_id}")
async def get_chat(
    booking_id: int = PathParam(..., gt=0),
    user: dict = Depends(get_current_user),
    booking_repo: BookingRepository = Depends(get_booking_repository),
    msg_repo: MessageRepository = Depends(get_message_repository),
):
    """Get messages for a booking. Client or STO owner only."""
    booking = await booking_repo.get_by_id_with_relations(booking_id)
    if not booking:
        raise NotFoundError(*Errors.BOOKING_NOT_FOUND)
    _check_booking_participant(booking, user["id"], user["role"])

    messages = await msg_repo.get_by_booking_id(booking_id)
    return [
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "receiver_id": m.receiver_id,
            "message": m.message,
            "message_type": getattr(m, "message_type", "text"),
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "is_read": m.is_read,
            "is_mine": m.sender_id == user["id"],
        }
        for m in messages
    ]


@router.patch("/{booking_id}/read")
async def mark_chat_read(
    booking_id: int = PathParam(..., gt=0),
    user: dict = Depends(get_current_user),
    booking_repo: BookingRepository = Depends(get_booking_repository),
    msg_repo: MessageRepository = Depends(get_message_repository),
    notif_repo: NotificationRepository = Depends(get_notification_repository),
):
    """Mark all messages in chat as read (for current user as receiver). Also marks chat notifications as read."""
    booking = await booking_repo.get_by_id_with_relations(booking_id)
    if not booking:
        raise NotFoundError(*Errors.BOOKING_NOT_FOUND)
    _check_booking_participant(booking, user["id"], user["role"])

    count = await msg_repo.mark_as_read_by_receiver(booking_id, user["id"])
    await notif_repo.mark_chat_notifications_read(user["id"])
    return {"marked": count}


@router.post("/{booking_id}")
async def send_message(
    payload: MessageCreate,
    booking_id: int = PathParam(..., gt=0),
    user: dict = Depends(get_current_user),
    booking_repo: BookingRepository = Depends(get_booking_repository),
    msg_repo: MessageRepository = Depends(get_message_repository),
    notif_repo: NotificationRepository = Depends(get_notification_repository),
):
    """Send text message. Client -> STO owner, STO owner -> client."""
    message = payload.message.strip()

    booking = await booking_repo.get_by_id_with_relations(booking_id)
    if not booking:
        raise NotFoundError(*Errors.BOOKING_NOT_FOUND)
    _check_booking_participant(booking, user["id"], user["role"])

    receiver_id = _get_receiver_id(booking, user["id"])
    if not receiver_id:
        raise ForbiddenError(*Errors.FORBIDDEN)

    msg = await msg_repo.create(
        booking_id=booking_id,
        sender_id=user["id"],
        receiver_id=receiver_id,
        message=message,
        message_type="text",
    )

    try:
        await _create_chat_notification(
            notif_repo, receiver_id, _is_sender_client(booking, user["id"])
        )
    except Exception as e:
        logger.warning("Chat notification failed: %s", e)

    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "receiver_id": msg.receiver_id,
        "message": msg.message,
        "message_type": getattr(msg, "message_type", "text"),
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
        "is_read": msg.is_read,
        "is_mine": True,
    }


@router.post("/{booking_id}/upload")
async def upload_chat_image(
    file: UploadFile = File(...),
    booking_id: int = PathParam(..., gt=0),
    user: dict = Depends(get_current_user),
    booking_repo: BookingRepository = Depends(get_booking_repository),
    msg_repo: MessageRepository = Depends(get_message_repository),
    notif_repo: NotificationRepository = Depends(get_notification_repository),
):
    """Upload image for chat. jpg, png, webp. Max 5MB."""
    ALLOWED = {".jpg", ".jpeg", ".png", ".webp"}
    MAX_SIZE = 5 * 1024 * 1024

    if not file or not file.filename:
        raise BadRequestError(*Errors.PHOTO_FORMAT_INVALID)
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED:
        raise BadRequestError(*Errors.PHOTO_FORMAT_INVALID)

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise BadRequestError(*Errors.PHOTO_TOO_LARGE)

    booking = await booking_repo.get_by_id_with_relations(booking_id)
    if not booking:
        raise NotFoundError(*Errors.BOOKING_NOT_FOUND)
    _check_booking_participant(booking, user["id"], user["role"])

    receiver_id = _get_receiver_id(booking, user["id"])
    if not receiver_id:
        raise ForbiddenError(*Errors.FORBIDDEN)

    media_root = Path(settings.media_root)
    chat_dir = media_root / "chat"
    chat_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{secrets.token_hex(8)}{ext}"
    filepath = chat_dir / filename
    filepath.write_bytes(content)
    relative_url = f"/{settings.media_root}/chat/{filename}"

    msg = await msg_repo.create(
        booking_id=booking_id,
        sender_id=user["id"],
        receiver_id=receiver_id,
        message=relative_url,
        message_type="image",
    )

    try:
        await _create_chat_notification(
            notif_repo, receiver_id, _is_sender_client(booking, user["id"])
        )
    except Exception as e:
        logger.warning("Chat notification failed: %s", e)

    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "receiver_id": msg.receiver_id,
        "message": msg.message,
        "message_type": "image",
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
        "is_read": msg.is_read,
        "is_mine": True,
    }


@router.post("/{booking_id}/voice")
async def upload_chat_voice(
    file: UploadFile = File(...),
    booking_id: int = PathParam(..., gt=0),
    user: dict = Depends(get_current_user),
    booking_repo: BookingRepository = Depends(get_booking_repository),
    msg_repo: MessageRepository = Depends(get_message_repository),
    notif_repo: NotificationRepository = Depends(get_notification_repository),
):
    """Upload voice message. webm or mp3. Max 5MB."""
    ALLOWED = {".webm", ".mp3", ".ogg"}
    MAX_SIZE = 5 * 1024 * 1024

    if not file or not file.filename:
        raise BadRequestError(*Errors.PHOTO_FORMAT_INVALID)
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED:
        raise BadRequestError(*Errors.PHOTO_FORMAT_INVALID)

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise BadRequestError(*Errors.PHOTO_TOO_LARGE)

    booking = await booking_repo.get_by_id_with_relations(booking_id)
    if not booking:
        raise NotFoundError(*Errors.BOOKING_NOT_FOUND)
    _check_booking_participant(booking, user["id"], user["role"])

    receiver_id = _get_receiver_id(booking, user["id"])
    if not receiver_id:
        raise ForbiddenError(*Errors.FORBIDDEN)

    media_root = Path(settings.media_root)
    voice_dir = media_root / "voice"
    voice_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{secrets.token_hex(8)}{ext}"
    filepath = voice_dir / filename
    filepath.write_bytes(content)
    relative_url = f"/{settings.media_root}/voice/{filename}"

    msg = await msg_repo.create(
        booking_id=booking_id,
        sender_id=user["id"],
        receiver_id=receiver_id,
        message=relative_url,
        message_type="voice",
    )

    try:
        await _create_chat_notification(
            notif_repo, receiver_id, _is_sender_client(booking, user["id"])
        )
    except Exception as e:
        logger.warning("Chat notification failed: %s", e)

    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "receiver_id": msg.receiver_id,
        "message": msg.message,
        "message_type": "voice",
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
        "is_read": msg.is_read,
        "is_mine": True,
    }
