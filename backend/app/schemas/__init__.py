"""Pydantic schemas."""

from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserMeResponse
from app.schemas.booking import BookingCreate, BookingResponse
from app.schemas.city import CityResponse, GeoCityRequest
from app.schemas.region import RegionResponse
from app.schemas.sto import (
    ServiceCreate,
    STOCreate,
    STOListItemResponse,
    STOResponse,
    STORequestCreate,
    STORequestResponse,
    ServiceResponse,
)

__all__ = [
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "UserMeResponse",
    "BookingCreate",
    "BookingResponse",
    "CityResponse",
    "GeoCityRequest",
    "RegionResponse",
    "ServiceResponse",
    "ServiceCreate",
    "STOCreate",
    "STOListItemResponse",
    "STOResponse",
    "STORequestCreate",
    "STORequestResponse",
]
