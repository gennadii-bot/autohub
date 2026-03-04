"""Custom middleware."""

import logging
import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import settings

logger = logging.getLogger(__name__)

# In-memory rate limit: ip -> list of timestamps
_rate_limit_store: dict[str, list[float]] = defaultdict(list)
_CLEANUP_INTERVAL = 60   # seconds
_last_cleanup = time.monotonic()


def _cleanup_old_entries() -> None:
    """Remove expired entries from rate limit store."""
    global _last_cleanup
    now = time.monotonic()
    if now - _last_cleanup < _CLEANUP_INTERVAL:
        return
    _last_cleanup = now
    cutoff = now - 60  # 1 minute window
    for key in list(_rate_limit_store.keys()):
        _rate_limit_store[key] = [t for t in _rate_limit_store[key] if t > cutoff]
        if not _rate_limit_store[key]:
            del _rate_limit_store[key]


def _is_chat_path(path: str) -> bool:
    """Chat endpoints use a separate rate limit bucket."""
    return path.startswith("/chat") or path.startswith("/partner/chats")


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiting middleware."""

    def __init__(self, app, requests_per_minute: int = 60, chat_requests_per_minute: int = 120):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.chat_requests_per_minute = chat_requests_per_minute

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        is_chat = _is_chat_path(path)

        limit = self.chat_requests_per_minute if is_chat else self.requests_per_minute
        if limit <= 0:
            return await call_next(request)

        key = f"{client_ip}:chat" if is_chat else client_ip
        now = time.monotonic()
        window_start = now - 60

        _cleanup_old_entries()

        times = _rate_limit_store[key]
        times = [t for t in times if t > window_start]
        _rate_limit_store[key] = times

        if len(times) >= limit:
            logger.warning("Rate limit exceeded for client %s (key=%s)", client_ip, key)
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many requests. Please try again later.",
                    },
                },
            )

        times.append(now)
        _rate_limit_store[key] = times

        return await call_next(request)
