"""Auth API — register, login, logout, me, avatar."""

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import get_auth_service, get_current_user, oauth2_scheme
from app.core.security import invalidate_token
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    SetPasswordRequest,
    TokenResponse,
    UserMeResponse,
    UserMeUpdate,
)
from app.services import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(
    payload: RegisterRequest,
    service: AuthService = Depends(get_auth_service),
):
    """Register new user. Returns JWT."""
    return await service.register(
        email=payload.email,
        password=payload.password,
        role="client",
        city_id=payload.city_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
        birth_date=payload.birth_date,
        car_brand=payload.car_brand,
        car_model=payload.car_model,
        car_year=payload.car_year,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    service: AuthService = Depends(get_auth_service),
):
    """Login. Returns JWT."""
    return await service.login(email=payload.email, password=payload.password)


@router.post("/token", response_model=TokenResponse)
async def token(
    form: OAuth2PasswordRequestForm = Depends(),
    service: AuthService = Depends(get_auth_service),
):
    """OAuth2 compatible token (username=email). For Swagger Authorize."""
    return await service.login(email=form.username, password=form.password)


@router.post("/logout")
async def logout(token: str | None = Depends(oauth2_scheme)):
    """Invalidate current token (logout)."""
    if token:
        invalidate_token(token)
    return {"success": True, "message": "Logged out"}


@router.get("/me", response_model=UserMeResponse)
async def me(
    user: dict = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
):
    """Current user profile."""
    return await service.get_me(user["id"])


@router.patch("/me", response_model=UserMeResponse)
async def update_me(
    payload: UserMeUpdate,
    user: dict = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
):
    """Update current user profile (first_name, last_name, phone, birth_date, car, city)."""
    updates = payload.model_dump(exclude_unset=True)
    return await service.update_me(user["id"], **updates)


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
):
    """Upload profile avatar. Returns avatar_url."""
    url = await service.upload_avatar(user["id"], file)
    return {"avatar_url": url}


@router.post("/set-password")
async def set_password(
    payload: SetPasswordRequest,
    service: AuthService = Depends(get_auth_service),
):
    """Activate partner account by setting password. Token from activation email."""
    await service.set_password(payload.token, payload.password)
    return {"message": "Account activated successfully"}
