"""API dependencies."""

from collections.abc import AsyncGenerator
from typing import Callable

from fastapi import Depends, HTTPException, Path
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, Errors
from app.core.security import decode_access_token
from app.database.session import async_session_maker
from app.repositories.booking_repository import BookingRepository
from app.repositories.city_repository import CityRepository
from app.repositories.service_catalog_repository import ServiceCatalogRepository
from app.repositories.service_repository import ServiceRepository
from app.repositories.region_repository import RegionRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.sto_repository import STORepository
from app.repositories.sto_schedule_repository import StoScheduleRepository
from app.repositories.sto_service_repository import StoServiceRepository
from app.repositories.activation_token_repository import ActivationTokenRepository
from app.repositories.sto_request_repository import STORequestRepository
from app.repositories.favorite_repository import FavoriteRepository
from app.repositories.message_repository import MessageRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.user_repository import UserRepository
from app.services import AuthService, BookingService, CityService, GeoService, RegionService, STOService
from app.services.service_service import ServiceService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency: yields async session, commits on success, rolls back on error."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_user_repository(db: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


async def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme),
    user_repo: UserRepository = Depends(get_user_repository),
) -> dict | None:
    """Return user if valid token, else None. Does not raise."""
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id_str = payload.get("sub")
    if not user_id_str:
        return None
    try:
        user_id = int(user_id_str)
    except ValueError:
        return None
    user = await user_repo.get_by_id(user_id)
    if not user or not getattr(user, "is_active", True):
        return None
    return {"id": user.id, "email": user.email, "role": user.role.value}


def get_booking_repository(db: AsyncSession = Depends(get_db)) -> BookingRepository:
    return BookingRepository(db)


def get_sto_repository(db: AsyncSession = Depends(get_db)) -> STORepository:
    return STORepository(db)


def get_sto_service_repository(
    db: AsyncSession = Depends(get_db),
) -> StoServiceRepository:
    return StoServiceRepository(db)


def get_sto_schedule_repository(
    db: AsyncSession = Depends(get_db),
) -> StoScheduleRepository:
    return StoScheduleRepository(db)


def get_review_repository(db: AsyncSession = Depends(get_db)) -> ReviewRepository:
    return ReviewRepository(db)


def get_message_repository(
    db: AsyncSession = Depends(get_db),
) -> MessageRepository:
    return MessageRepository(db)


def get_notification_repository(
    db: AsyncSession = Depends(get_db),
) -> NotificationRepository:
    return NotificationRepository(db)


def get_booking_service(
    booking_repo: BookingRepository = Depends(get_booking_repository),
    sto_repo: STORepository = Depends(get_sto_repository),
    sto_svc_repo: StoServiceRepository = Depends(get_sto_service_repository),
    schedule_repo: StoScheduleRepository = Depends(get_sto_schedule_repository),
    notif_repo: NotificationRepository = Depends(get_notification_repository),
) -> BookingService:
    return BookingService(booking_repo, sto_repo, sto_svc_repo, schedule_repo, notif_repo)


def get_city_service(db: AsyncSession = Depends(get_db)) -> CityService:
    return CityService(db)


def get_region_service(db: AsyncSession = Depends(get_db)) -> RegionService:
    return RegionService(db)


def get_geo_service(db: AsyncSession = Depends(get_db)) -> GeoService:
    return GeoService(db)


def get_sto_service(
    repo: STORepository = Depends(get_sto_repository),
    booking_repo: BookingRepository = Depends(get_booking_repository),
    sto_svc_repo: StoServiceRepository = Depends(get_sto_service_repository),
    schedule_repo: StoScheduleRepository = Depends(get_sto_schedule_repository),
) -> STOService:
    return STOService(repo, booking_repo, sto_svc_repo, schedule_repo)


def get_review_service(
    review_repo: ReviewRepository = Depends(get_review_repository),
    booking_repo: BookingRepository = Depends(get_booking_repository),
    sto_repo: STORepository = Depends(get_sto_repository),
):
    from app.services.review_service import ReviewService

    return ReviewService(review_repo, booking_repo, sto_repo)


def get_schedule_service(
    schedule_repo: StoScheduleRepository = Depends(get_sto_schedule_repository),
    sto_repo: STORepository = Depends(get_sto_repository),
):
    from app.services.schedule_service import ScheduleService

    return ScheduleService(schedule_repo, sto_repo)


def get_service_repository(db: AsyncSession = Depends(get_db)) -> ServiceRepository:
    return ServiceRepository(db)


def get_service_service(
    service_repo: ServiceRepository = Depends(get_service_repository),
    sto_repo: STORepository = Depends(get_sto_repository),
) -> ServiceService:
    return ServiceService(service_repo, sto_repo)


def get_service_catalog_repository(
    db: AsyncSession = Depends(get_db),
) -> ServiceCatalogRepository:
    return ServiceCatalogRepository(db)


def get_sto_services_service(
    catalog_repo: ServiceCatalogRepository = Depends(get_service_catalog_repository),
    sto_repo: STORepository = Depends(get_sto_repository),
    sto_svc_repo: StoServiceRepository = Depends(get_sto_service_repository),
):
    from app.services.sto_services_service import StoServicesService

    return StoServicesService(catalog_repo, sto_repo, sto_svc_repo)


def get_activation_token_repository(
    db: AsyncSession = Depends(get_db),
) -> ActivationTokenRepository:
    return ActivationTokenRepository(db)


def get_city_repository(db: AsyncSession = Depends(get_db)) -> CityRepository:
    return CityRepository(db)


def get_region_repository(db: AsyncSession = Depends(get_db)) -> RegionRepository:
    return RegionRepository(db)


def get_sto_request_repository(
    db: AsyncSession = Depends(get_db),
) -> STORequestRepository:
    return STORequestRepository(db)


def get_favorite_repository(
    db: AsyncSession = Depends(get_db),
) -> FavoriteRepository:
    return FavoriteRepository(db)


def get_sto_request_service(
    sto_request_repo: STORequestRepository = Depends(get_sto_request_repository),
    region_repo: RegionRepository = Depends(get_region_repository),
    city_repo: CityRepository = Depends(get_city_repository),
):
    from app.services.sto_request_service import STORequestService

    return STORequestService(sto_request_repo, region_repo, city_repo)


def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repository),
    city_repo: CityRepository = Depends(get_city_repository),
    activation_token_repo: ActivationTokenRepository = Depends(
        get_activation_token_repository
    ),
) -> AuthService:
    return AuthService(
        user_repo, city_repo, activation_token_repo
    )


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    user_repo: UserRepository = Depends(get_user_repository),
) -> dict:
    """Require valid JWT. Returns user dict with id, email, role."""
    if not token:
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_CREDENTIALS", "message": "Not authenticated"},
        )
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid or expired token"},
        )
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid token"},
        )
    try:
        user_id = int(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid token"},
        )
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_CREDENTIALS", "message": "User not found"},
        )
    if not getattr(user, "is_active", True):
        raise HTTPException(
            status_code=401,
            detail={"code": "ACCOUNT_INACTIVE", "message": "Account not activated"},
        )
    return {"id": user.id, "email": user.email, "role": user.role.value}


async def get_current_active_user(
    user: dict = Depends(get_current_user),
) -> dict:
    """Alias for get_current_user. For future is_active check."""
    return user


def require_role(*allowed_roles: str) -> Callable:
    """Dependency factory: require user to have one of the roles."""

    async def _require_role(
        user: dict = Depends(get_current_user),
    ) -> dict:
        if user.get("role") not in allowed_roles:
            raise ForbiddenError(*Errors.FORBIDDEN)
        return user

    return _require_role


require_client = require_role("client")
require_sto_owner = require_role("sto_owner", "sto")
require_user_only = require_role("client")  # Only regular users (not sto_owner, admin)
require_admin = require_role("admin", "super_admin")
get_current_admin = require_admin  # Alias for admin endpoints (admin + super_admin can view)
require_super_admin = require_role("super_admin")
get_current_super_admin = require_super_admin  # Catalog management only
require_sto_or_admin = require_role("sto_owner", "sto", "admin")

# Admin panel: admin + super_admin see all, sto_owner sees only their STO, client denied
get_current_admin_or_sto_owner = require_role("admin", "super_admin", "sto_owner", "sto")


async def get_current_user_sto_owner(
    user: dict = Depends(require_sto_owner),
) -> dict:
    """Require sto_owner or sto role."""
    return user


async def get_current_user_sto_or_admin(
    user: dict = Depends(require_sto_or_admin),
) -> dict:
    """Require sto_owner, sto, or admin role."""
    return user


async def require_admin_or_sto_owner_of_sto(
    sto_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user),
    sto_repo: STORepository = Depends(get_sto_repository),
) -> dict:
    """Admin sees any STO. STO owner sees only their own STO."""
    from fastapi import HTTPException

    if user.get("role") in ("admin", "super_admin"):
        return user
    if user.get("role") not in ("sto_owner", "sto"):
        raise ForbiddenError(*Errors.FORBIDDEN)
    sto = await sto_repo.get_by_id(sto_id)
    if not sto:
        raise HTTPException(status_code=404, detail="СТО не найдено")
    if sto.owner_id != user["id"]:
        raise ForbiddenError(*Errors.FORBIDDEN)
    return user
