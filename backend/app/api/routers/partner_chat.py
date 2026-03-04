"""Partner chat API — GET /partner/chats, GET/POST /partner/chats/{booking_id}, PATCH read."""

from fastapi import APIRouter, Depends, Path
from pydantic import BaseModel, Field

from app.api.deps import (
    get_booking_repository,
    get_current_user_sto_owner,
    get_message_repository,
    get_notification_repository,
)
from app.repositories.booking_repository import BookingRepository
from app.repositories.message_repository import MessageRepository
from app.repositories.notification_repository import NotificationRepository
from app.services.partner_service import PartnerService
from app.api.routers.partner import get_partner_service

router = APIRouter(prefix="/partner", tags=["partner-chat"])


class MessageCreate(BaseModel):
    """Accepts message or message_text."""
    message: str | None = Field(None, min_length=1, max_length=2000)
    message_text: str | None = Field(None, min_length=1, max_length=2000)


@router.get("/chats")
async def list_chats(
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
):
    """List chat dialogs for partner's STOs. Each dialog = one booking."""
    return await svc.get_chats(user["id"])


@router.get("/chats/{booking_id}")
async def get_chat_messages(
    booking_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user_sto_owner),
    booking_repo: BookingRepository = Depends(get_booking_repository),
    msg_repo: MessageRepository = Depends(get_message_repository),
):
    """Get messages for a booking. Partner (STO owner) only."""
    from app.core.exceptions import ForbiddenError, NotFoundError, Errors

    booking = await booking_repo.get_by_id_with_relations(booking_id)
    if not booking:
        raise NotFoundError(*Errors.BOOKING_NOT_FOUND)
    if not booking.sto or booking.sto.owner_id != user["id"]:
        raise ForbiddenError(*Errors.FORBIDDEN)

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


@router.post("/chats/{booking_id}")
async def send_chat_message(
    payload: MessageCreate,
    booking_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user_sto_owner),
    booking_repo: BookingRepository = Depends(get_booking_repository),
    msg_repo: MessageRepository = Depends(get_message_repository),
    notif_repo: NotificationRepository = Depends(get_notification_repository),
):
    """Send message. Partner -> client."""
    import logging
    from app.core.exceptions import ForbiddenError, NotFoundError, Errors

    logger = logging.getLogger(__name__)
    booking = await booking_repo.get_by_id_with_relations(booking_id)
    if not booking:
        raise NotFoundError(*Errors.BOOKING_NOT_FOUND)
    if not booking.sto or booking.sto.owner_id != user["id"]:
        raise ForbiddenError(*Errors.FORBIDDEN)

    receiver_id = booking.client_id or 0
    if not receiver_id:
        raise ForbiddenError(*Errors.FORBIDDEN)

    msg_text = (payload.message or payload.message_text or "").strip()
    if not msg_text:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="message_text required")

    msg = await msg_repo.create(
        booking_id=booking_id,
        sender_id=user["id"],
        receiver_id=receiver_id,
        message=msg_text,
    )
    try:
        await _create_chat_notification(notif_repo, receiver_id, is_from_client=False)
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


@router.patch("/chats/{booking_id}/read")
async def mark_chat_read(
    booking_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user_sto_owner),
    svc: PartnerService = Depends(get_partner_service),
    notif_repo: NotificationRepository = Depends(get_notification_repository),
):
    """Mark messages in chat as read (partner is receiver). Also marks chat notifications as read."""
    from fastapi import HTTPException

    ok = await svc.mark_chat_read(booking_id, user["id"])
    if not ok:
        raise HTTPException(status_code=404, detail="Чат не найден")
    await notif_repo.mark_chat_notifications_read(user["id"])
    return {"success": True}
