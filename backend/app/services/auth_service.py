"""Auth service."""

import logging
import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.exceptions import BadRequestError, Errors
from app.core.security import create_access_token, hash_password, verify_password
from app.models.enums import UserRole
from app.repositories.activation_token_repository import ActivationTokenRepository
from app.repositories.city_repository import CityRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import TokenResponse, UserMeResponse

logger = logging.getLogger(__name__)

ROLE_MAP = {
    "client": UserRole.client,
    "sto": UserRole.sto_owner,
    "sto_owner": UserRole.sto_owner,
    "admin": UserRole.admin,
}


class AuthService:
    def __init__(
        self,
        user_repo: UserRepository,
        city_repo: CityRepository | None = None,
        activation_token_repo: ActivationTokenRepository | None = None,
    ):
        self.user_repo = user_repo
        self.city_repo = city_repo
        self.activation_token_repo = activation_token_repo

    async def register(
        self,
        email: str,
        password: str,
        role: str = "client",
        city_id: int | None = None,
        first_name: str | None = None,
        last_name: str | None = None,
        phone: str | None = None,
        birth_date=None,
        car_brand: str | None = None,
        car_model: str | None = None,
        car_year: int | None = None,
    ) -> TokenResponse:
        """Register new user. Returns access token."""
        email_lower = email.strip().lower()

        if await self.user_repo.email_exists(email_lower):
            logger.warning("Register: email already exists: %s", email_lower)
            raise BadRequestError(*Errors.EMAIL_EXISTS)

        if city_id is not None and self.city_repo:
            city = await self.city_repo.get_by_id(city_id)
            if not city:
                logger.warning("Register: invalid city_id=%s", city_id)
                raise BadRequestError(*Errors.INVALID_CITY)

        role_enum = ROLE_MAP.get(role, UserRole.client)
        password_hash = hash_password(password)

        try:
            user = await self.user_repo.create(
                email=email_lower,
                password_hash=password_hash,
                role=role_enum,
                city_id=city_id,
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                birth_date=birth_date,
                car_brand=car_brand,
                car_model=car_model,
                car_year=car_year,
            )
        except IntegrityError as e:
            logger.warning("Register IntegrityError: %s", e)
            err_str = str(e).lower()
            if "unique" in err_str or "duplicate" in err_str:
                raise BadRequestError(*Errors.EMAIL_EXISTS)
            if "foreign key" in err_str or "violates" in err_str:
                raise BadRequestError(*Errors.INVALID_CITY)
            raise

        token = create_access_token(user.id, user.role.value)
        logger.info("User registered: id=%s, email=%s", user.id, email_lower)
        return TokenResponse(access_token=token, token_type="bearer")

    async def login(self, email: str, password: str) -> TokenResponse:
        """Authenticate user. Returns access token."""
        user = await self.user_repo.get_by_email(email.strip().lower())
        if not user:
            raise HTTPException(
                status_code=401,
                detail={"code": "INVALID_CREDENTIALS", "message": "Неверный email или пароль"},
            )
        if not getattr(user, "password_hash", None):
            raise HTTPException(
                status_code=401,
                detail={"code": "ACCOUNT_NOT_ACTIVATED", "message": "Аккаунт не активирован. Установите пароль по ссылке из письма."},
            )
        if not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=401,
                detail={"code": "INVALID_CREDENTIALS", "message": "Неверный email или пароль"},
            )
        if not getattr(user, "is_active", True):
            raise HTTPException(
                status_code=401,
                detail={"code": "ACCOUNT_INACTIVE", "message": "Аккаунт не активирован"},
            )
        token = create_access_token(user.id, user.role.value)
        return TokenResponse(access_token=token, token_type="bearer")

    async def get_me(self, user_id: int) -> UserMeResponse:
        """Get current user profile."""
        user = await self.user_repo.get_by_id_with_city(user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        city_name = user.city.name if user.city else None
        return UserMeResponse(
            id=user.id,
            email=user.email,
            role=user.role.value,
            first_name=user.first_name,
            last_name=user.last_name,
            phone=user.phone,
            birth_date=user.birth_date,
            car_brand=user.car_brand,
            car_model=user.car_model,
            car_year=user.car_year,
            avatar_url=user.avatar_url,
            city_id=user.city_id,
            city_name=city_name,
            created_at=user.created_at,
        )

    async def set_password(self, token: str, password: str) -> None:
        """Activate account by setting password. Validates token, updates password, deletes token."""
        from datetime import datetime, timezone

        if not self.activation_token_repo:
            raise HTTPException(status_code=500, detail="Activation not configured")

        at = await self.activation_token_repo.get_by_token(token)
        if not at:
            raise HTTPException(
                status_code=400,
                detail={"code": "INVALID_TOKEN", "message": "Invalid or expired token"},
            )
        if at.expires_at < datetime.now(timezone.utc):
            await self.activation_token_repo.delete(at)
            raise HTTPException(
                status_code=400,
                detail={"code": "TOKEN_EXPIRED", "message": "Token has expired"},
            )

        user = await self.user_repo.get_by_id(at.user_id)
        if not user:
            await self.activation_token_repo.delete(at)
            raise HTTPException(status_code=400, detail="User not found")

        if getattr(user, "is_active", True):
            raise BadRequestError(*Errors.ACCOUNT_ALREADY_ACTIVATED)

        password_hash = hash_password(password)
        await self.user_repo.update_password(user.id, password_hash)
        await self.user_repo.update_is_active(user.id, True)
        await self.activation_token_repo.delete(at)

        logger.info("Account activated: user_id=%s", user.id)

    async def update_me(self, user_id: int, **kwargs) -> UserMeResponse:
        """Update current user profile. Accepts first_name, last_name, phone, birth_date, car_*, city_id."""
        city_id = kwargs.get("city_id")
        if city_id is not None and self.city_repo and city_id:
            city = await self.city_repo.get_by_id(city_id)
            if not city:
                logger.warning("update_me: invalid city_id=%s", city_id)
                from app.core.exceptions import BadRequestError, Errors
                raise BadRequestError(*Errors.INVALID_CITY)
        await self.user_repo.update_profile(user_id, **kwargs)
        return await self.get_me(user_id)

    async def upload_avatar(self, user_id: int, file: UploadFile) -> str:
        """Upload avatar, save to media/avatars/, update user, return avatar_url."""
        MAX_SIZE = 5 * 1024 * 1024  # 5 MB
        ALLOWED = {".jpg", ".jpeg", ".png", ".webp"}

        if not file or not file.filename:
            raise BadRequestError(*Errors.PHOTO_FORMAT_INVALID)
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED:
            raise BadRequestError(*Errors.PHOTO_FORMAT_INVALID)

        content = await file.read()
        if len(content) > MAX_SIZE:
            raise BadRequestError(*Errors.PHOTO_TOO_LARGE)

        media_root = Path(settings.media_root)
        avatars_dir = media_root / "avatars"
        avatars_dir.mkdir(parents=True, exist_ok=True)

        filename = f"{secrets.token_hex(8)}{ext}"
        filepath = avatars_dir / filename
        filepath.write_bytes(content)

        relative_url = f"/{settings.media_root}/avatars/{filename}"
        await self.user_repo.update_avatar(user_id, relative_url)
        logger.info("Avatar uploaded: user_id=%s", user_id)
        return relative_url
