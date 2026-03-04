"""Global exception handlers with unified response format."""

import logging
from typing import Any

from fastapi import Request, status, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.exc import DatabaseError, IntegrityError

from app.core.exceptions import AppError

logger = logging.getLogger(__name__)


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail


def _error_response(code: str, message: str, status_code: int) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {"code": code, "message": message},
        },
    )


# --- AppError (кастомные ошибки приложения) ---
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return _error_response(exc.code, exc.message, exc.status_code)


# --- HTTPException ---
async def http_exception_handler(
    request: Request, exc: HTTPException
) -> JSONResponse:
    if isinstance(exc.detail, dict) and "code" in exc.detail and "message" in exc.detail:
        return _error_response(
            exc.detail["code"],
            exc.detail["message"],
            exc.status_code,
        )

    return _error_response(
        f"HTTP_{exc.status_code}",
        str(exc.detail),
        exc.status_code,
    )


# --- Validation errors ---
async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    logger.warning("Validation error: %s", exc.errors())
    return _error_response(
        "VALIDATION_ERROR",
        "Invalid request data",
        status.HTTP_422_UNPROCESSABLE_ENTITY,
    )


# --- IntegrityError (уникальные ограничения и т.п.) ---
async def integrity_error_handler(
    request: Request, exc: IntegrityError
) -> JSONResponse:
    logger.exception("IntegrityError occurred")
    return _error_response(
        "CONFLICT",
        "Database constraint violation",
        status.HTTP_409_CONFLICT,
    )


# --- DatabaseError ---
async def database_error_handler(
    request: Request, exc: DatabaseError
) -> JSONResponse:
    logger.exception("DatabaseError occurred")
    # НЕ маскируем ошибку
    raise exc


# --- Любая другая ошибка ---
async def unexpected_error_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    logger.exception("Unexpected error occurred")
    # НЕ маскируем — пусть FastAPI покажет реальный traceback
    raise exc