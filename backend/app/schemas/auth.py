"""Auth schemas."""

from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=1, max_length=32)
    birth_date: date
    car_brand: str = Field(..., min_length=1, max_length=100)
    car_model: str = Field(..., min_length=1, max_length=100)
    car_year: int = Field(..., ge=1980)
    city_id: int | None = None

    @field_validator("car_year")
    @classmethod
    def car_year_valid(cls, v: int) -> int:
        if v > date.today().year:
            raise ValueError("Год авто не может быть больше текущего")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserMeResponse(BaseModel):
    id: int
    email: str
    role: str
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    birth_date: date | None = None
    car_brand: str | None = None
    car_model: str | None = None
    car_year: int | None = None
    avatar_url: str | None = None
    city_id: int | None = None
    city_name: str | None = None
    created_at: datetime


class UserMeUpdate(BaseModel):
    """PATCH /auth/me — update profile."""

    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    phone: str | None = Field(None, max_length=32)
    birth_date: date | None = None
    car_brand: str | None = Field(None, max_length=100)
    car_model: str | None = Field(None, max_length=100)
    car_year: int | None = Field(None, ge=1980, le=2100)
    city_id: int | None = None


class SetPasswordRequest(BaseModel):
    """Request body for POST /auth/set-password."""

    token: str = Field(..., min_length=1)
    password: str = Field(..., min_length=8, max_length=72)