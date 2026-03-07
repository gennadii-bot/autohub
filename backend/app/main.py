"""AvtoHub KZ — FastAPI application entry point."""

import logging
import re
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.exception_handlers import (
    app_error_handler,
    database_error_handler,
    http_exception_handler,
    integrity_error_handler,
    unexpected_error_handler,
    validation_error_handler,
)
from app.api.routers import admin, auth, booking, chat, cities, districts, favorites, geo, notifications, partner, partner_chat, regions, reviews, services, sto, sto_requests
from app.core.logging_config import setup_logging
from app.core.config import settings
from app.database.session import engine
from app.api.deps import get_db

# Setup logging first
setup_logging()
logger = logging.getLogger(__name__)


def _mask_database_url(url: str) -> str:
    """Mask password in DATABASE_URL for logging."""
    if not url:
        return ""
    return re.sub(r"://([^:]+):([^@]+)@", r"://\1:***@", url)


app = FastAPI(
    title="AvtoHub KZ",
    description="SaaS платформа онлайн-записи в СТО",
    version="0.1.0",
    debug=settings.debug,
)

# Exception handlers (specific first, generic last)
from app.core.exceptions import AppError
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import DatabaseError, IntegrityError

app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(DatabaseError, database_error_handler)
app.add_exception_handler(Exception, unexpected_error_handler)


@app.on_event("startup")
async def startup_log_database():
    """Log DATABASE_URL (masked) and confirm DB name at startup."""
    u = _mask_database_url(settings.database_url)
    logger.info("DATABASE_URL (masked): %s", u)
    # Extract db name for confirmation (e.g. autohub vs avtohub)
    if "/" in settings.database_url:
        db_part = settings.database_url.rstrip("/").split("/")[-1]
        if "?" in db_part:
            db_part = db_part.split("?")[0]
        logger.info("Database name from URL: %s", db_part)


# Rate limiting (added first = runs inner)
from app.api.middleware import RateLimitMiddleware

app.add_middleware(
    RateLimitMiddleware,
    requests_per_minute=settings.rate_limit_per_minute,
    chat_requests_per_minute=settings.rate_limit_chat_per_minute,
)

# CORS — added after RateLimit = runs outermost; one place only
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:5178",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:5177",
        "http://127.0.0.1:5178",
        "https://admin.altyncod.xyz",
        "http://admin.altyncod.xyz",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(cities.router)
app.include_router(districts.router)
app.include_router(regions.router)
app.include_router(geo.router)
app.include_router(sto.router)
app.include_router(services.router)
app.include_router(booking.router)
app.include_router(chat.router)
app.include_router(favorites.router)
app.include_router(notifications.router)
app.include_router(reviews.router)
app.include_router(sto_requests.router)
app.include_router(partner.router)
app.include_router(partner_chat.router)

# Media files (STO photos, etc.)
_media_path = Path(settings.media_root)
_media_path.mkdir(parents=True, exist_ok=True)
app.mount(f"/{settings.media_root}", StaticFiles(directory=str(_media_path)), name="media")


@app.get("/health")
async def health() -> dict[str, str]:
    """Basic liveness check."""
    return {"status": "ok", "environment": settings.environment}


@app.get("/health/db")
async def health_db() -> dict[str, str]:
    """Database connectivity check."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        logger.error("Health check DB failed: %s", e)
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {"status": "ok", "database": "connected"}


@app.get("/debug-users")
async def debug_users(db: AsyncSession = Depends(get_db)) -> dict:
    """
    Debug: real read from DB — current_database(), search_path, raw counts.
    Uses the same get_db() session as admin endpoints. No auth for diagnostics.
    """
    try:
        r_db = await db.execute(text("SELECT current_database()"))
        db_name = r_db.scalar() or ""
        r_path = await db.execute(text("SHOW search_path"))
        search_path = r_path.scalar() or ""
        r_users = await db.execute(text("SELECT COUNT(*) FROM users"))
        users_count = r_users.scalar() or 0
        r_stos = await db.execute(text("SELECT COUNT(*) FROM stos"))
        stos_count = r_stos.scalar() or 0
        return {
            "current_database": db_name,
            "search_path": search_path,
            "users_count_raw": users_count,
            "stos_count_raw": stos_count,
            "session_identity": id(db),
        }
    except Exception as e:
        logger.exception("debug_users failed")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
