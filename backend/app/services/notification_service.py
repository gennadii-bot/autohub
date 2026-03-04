"""Unified notification service: Email + Telegram."""

import logging

import aiosmtplib
from email.message import EmailMessage

from app.core.config import settings
from app.services.telegram_service import send_message as send_telegram

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, body: str) -> bool:
    """Send email. Returns True on success. Does not raise."""
    if not settings.smtp_user or not settings.smtp_password:
        logger.debug("SMTP not configured, email skipped")
        return False
    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = settings.smtp_from
        msg["To"] = to
        msg.set_content(body)
        smtp = aiosmtplib.SMTP(
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            use_tls=settings.smtp_port == 465,
        )
        async with smtp:
            if settings.smtp_user and settings.smtp_password:
                await smtp.login(settings.smtp_user, settings.smtp_password)
            await smtp.send_message(msg)
        return True
    except Exception as e:
        logger.warning("Email send failed: to=%s, error=%s", to, e)
        return False


async def notify_owner_booking_cancelled(
    *,
    owner: object | None,
    sto: object | None,
    client_email: str,
    service_name: str,
    date_str: str,
    time_str: str,
    booking_id: int,
) -> None:
    """Notify STO owner about cancelled booking via Telegram."""
    chat_id = _get_telegram_chat_id(owner, sto)
    if chat_id is not None:
        text = (
            f"Запись #{booking_id} отменена.\n"
            f"Клиент: {client_email}\n"
            f"Услуга: {service_name}\n"
            f"Дата: {date_str}, время: {time_str}"
        )
        await send_telegram(chat_id, text)


def _get_telegram_chat_id(owner: object | None, sto: object | None) -> int | None:
    """Get telegram chat id from owner or sto."""
    if owner is not None:
        chat_id = getattr(owner, "telegram_chat_id", None)
        if chat_id is not None:
            return chat_id
        chat_id = getattr(owner, "telegram_id", None)
        if chat_id is not None:
            return chat_id
    if sto is not None:
        return getattr(sto, "telegram_chat_id", None)
    return None


async def notify_booking_created(
    *,
    client_email: str,
    sto_name: str,
    service_name: str,
    date_str: str,
    time_str: str,
    owner: object | None = None,
    sto: object | None = None,
) -> None:
    """Notify client (email) and owner (telegram) about new booking."""
    body = (
        f"Запись создана.\n"
        f"СТО: {sto_name}\n"
        f"Услуга: {service_name}\n"
        f"Дата: {date_str}, время: {time_str}"
    )
    await send_email(
        client_email,
        "AvtoHub: запись создана",
        body,
    )
    chat_id = _get_telegram_chat_id(owner, sto)
    if chat_id is not None:
        text = (
            f"Новая запись на СТО «{sto_name}»\n"
            f"Услуга: {service_name}\n"
            f"Дата: {date_str}, время: {time_str}"
        )
        await send_telegram(chat_id, text)


async def notify_booking_accepted(
    *,
    client_email: str,
    sto_name: str,
    service_name: str,
    date_str: str,
    time_str: str,
) -> None:
    """Notify client about accepted booking."""
    body = (
        f"Запись принята.\n"
        f"СТО: {sto_name}\n"
        f"Услуга: {service_name}\n"
        f"Дата: {date_str}, время: {time_str}"
    )
    await send_email(
        client_email,
        "AvtoHub: запись принята",
        body,
    )


async def notify_booking_completed(
    *,
    client_email: str,
    sto_name: str,
    service_name: str,
    date_str: str,
    time_str: str,
) -> None:
    """Notify client about completed booking."""
    body = (
        f"Запись завершена.\n"
        f"СТО: {sto_name}\n"
        f"Услуга: {service_name}\n"
        f"Дата: {date_str}, время: {time_str}"
    )
    await send_email(
        client_email,
        "AvtoHub: запись завершена",
        body,
    )


async def notify_booking_cancelled(
    *,
    client_email: str,
    sto_name: str,
    service_name: str,
    date_str: str,
    time_str: str,
) -> None:
    """Notify client about cancelled booking."""
    body = (
        f"Запись отменена.\n"
        f"СТО: {sto_name}\n"
        f"Услуга: {service_name}\n"
        f"Дата: {date_str}, время: {time_str}"
    )
    await send_email(
        client_email,
        "AvtoHub: запись отменена",
        body,
    )


async def notify_booking_rescheduled(
    *,
    client_email: str,
    sto_name: str,
    service_name: str,
    date_str: str,
    time_str: str,
) -> None:
    """Notify client about rescheduled booking (СТО предложило новую дату)."""
    body = (
        f"СТО предложило новую дату.\n"
        f"СТО: {sto_name}\n"
        f"Услуга: {service_name}\n"
        f"Новая дата: {date_str}, время: {time_str}"
    )
    await send_email(
        client_email,
        "AvtoHub: запись перенесена",
        body,
    )
