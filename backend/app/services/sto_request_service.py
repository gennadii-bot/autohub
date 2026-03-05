"""STO partner application service."""

import logging
import re
import secrets
import unicodedata
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import BadRequestError, ConflictError, NotFoundError, ValidationError, Errors
from app.core.security import hash_password
from app.repositories.sto_request_repository import STORequestRepository
from app.repositories.region_repository import RegionRepository
from app.repositories.city_repository import CityRepository

logger = logging.getLogger(__name__)

MAX_PHOTO_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
IIN_BIN_PATTERN = re.compile(r"^\d{12}$")


def _sanitize(s: str | None, max_len: int = 512) -> str | None:
    """Sanitize string: normalize unicode, strip, limit length."""
    if s is None:
        return None
    s = unicodedata.normalize("NFKC", str(s).strip())
    if not s:
        return None
    return s[:max_len] if len(s) > max_len else s


def _validate_iin(iin: str) -> None:
    if not iin or not IIN_BIN_PATTERN.match(str(iin).strip()):
        raise BadRequestError(*Errors.INVALID_IIN)


def _validate_bin(bin_val: str | None) -> None:
    if bin_val is None or bin_val == "":
        return
    if not IIN_BIN_PATTERN.match(str(bin_val).strip()):
        raise BadRequestError(*Errors.INVALID_BIN)


def _validate_photo(file: UploadFile | None) -> None:
    if not file or not file.filename:
        return
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_PHOTO_EXTENSIONS:
        raise BadRequestError(*Errors.PHOTO_FORMAT_INVALID)
    # Size checked when reading


class STORequestService:
    def __init__(
        self,
        sto_request_repo: STORequestRepository,
        region_repo: RegionRepository,
        city_repo: CityRepository,
    ):
        self.sto_request_repo = sto_request_repo
        self.region_repo = region_repo
        self.city_repo = city_repo

    async def create(
        self,
        first_name: str,
        last_name: str,
        middle_name: str | None,
        iin: str,
        phone: str,
        email: str,
        ip_name: str | None,
        bin_val: str | None,
        sto_name: str,
        sto_description: str | None,
        region_id: int,
        city_id: int,
        address: str,
        password: str | None = None,
        photo: UploadFile | None = None,
    ) -> dict:
        """Create STO request with validation and photo upload."""
        # Sanitize
        first_name = _sanitize(first_name, 100) or ""
        last_name = _sanitize(last_name, 100) or ""
        middle_name = _sanitize(middle_name, 100)
        iin = _sanitize(iin, 12) or ""
        phone = _sanitize(phone, 20) or ""
        email = (email or "").strip().lower()
        ip_name = _sanitize(ip_name, 255)
        bin_val = _sanitize(bin_val, 12) if bin_val else None
        sto_name = _sanitize(sto_name, 255) or ""
        sto_description = _sanitize(sto_description, 2000)
        address = _sanitize(address, 512) or ""

        # Validate required
        if not first_name or not last_name:
            raise ValidationError("VALIDATION_ERROR", "Имя и фамилия обязательны")
        if not email:
            raise ValidationError("VALIDATION_ERROR", "Email обязателен")
        if not phone:
            raise ValidationError("VALIDATION_ERROR", "Телефон обязателен")
        if not sto_name:
            raise ValidationError("VALIDATION_ERROR", "Название СТО обязательно")
        if not address:
            raise ValidationError("VALIDATION_ERROR", "Адрес обязателен")

        _validate_iin(iin)
        _validate_bin(bin_val)
        _validate_photo(photo)

        password_hash: str | None = None
        if password and len(password) >= 8:
            password_hash = hash_password(password)

        # Uniqueness among pending
        if await self.sto_request_repo.email_exists_pending(email):
            raise ConflictError(*Errors.EMAIL_PENDING_EXISTS)
        if await self.sto_request_repo.iin_exists_pending(iin):
            raise ConflictError(*Errors.IIN_PENDING_EXISTS)

        # Region and city exist
        region = await self.region_repo.get_by_id(region_id)
        if not region:
            raise NotFoundError(*Errors.REGION_NOT_FOUND)
        city = await self.city_repo.get_by_id(city_id)
        if not city:
            raise BadRequestError(*Errors.INVALID_CITY)
        if city.region_id != region_id:
            raise BadRequestError(*Errors.INVALID_CITY)

        # Photo upload
        photo_url: str | None = None
        if photo and photo.filename:
            photo_url = await self._save_photo(photo)

        req = await self.sto_request_repo.create(
            first_name=first_name,
            last_name=last_name,
            middle_name=middle_name,
            iin=iin,
            phone=phone,
            email=email,
            ip_name=ip_name,
            bin=bin_val,
            sto_name=sto_name,
            sto_description=sto_description,
            region_id=region_id,
            city_id=city_id,
            address=address,
            photo_url=photo_url,
            password_hash=password_hash,
            status="pending",
        )

        logger.info(
            "STO request created: id=%s, email=%s, sto_name=%s",
            req.id,
            email,
            sto_name,
        )
        return {"id": str(req.id), "message": "Заявка успешно отправлена"}

    async def _save_photo(self, file: UploadFile) -> str:
        """Save photo to media/stos/, return relative URL."""
        ext = Path(file.filename).suffix.lower()
        content = await file.read()
        if len(content) > MAX_PHOTO_SIZE:
            raise BadRequestError(*Errors.PHOTO_TOO_LARGE)

        media_root = Path(settings.media_root)
        sto_dir = media_root / "stos"
        sto_dir.mkdir(parents=True, exist_ok=True)

        filename = f"{secrets.token_hex(8)}{ext}"
        filepath = sto_dir / filename
        filepath.write_bytes(content)

        return f"/{settings.media_root}/stos/{filename}"
