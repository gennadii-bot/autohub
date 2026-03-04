"""Отправка уведомлений через Telegram Bot API (httpx)."""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org"


async def send_message(chat_id: int, text: str) -> bool:
    """
    Отправить сообщение в чат через Telegram Bot API.
    Возвращает True при успехе, False если токен не задан или запрос неудачен.
    Не поднимает исключения — сбой уведомления не должен ломать основной поток.
    """
    token = settings.telegram_bot_token
    if not token or not token.strip():
        logger.debug("TELEGRAM_BOT_TOKEN не задан, уведомление пропущено")
        return False

    url = f"{TELEGRAM_API_BASE}/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            return True
    except httpx.HTTPError as e:
        logger.warning("Telegram sendMessage failed: chat_id=%s, error=%s", chat_id, e)
        return False
    except Exception as e:
        logger.error("Telegram sendMessage unexpected error: chat_id=%s, error=%s", chat_id, e)
        return False
