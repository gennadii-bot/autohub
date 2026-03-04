"""Services (услуги СТО) API."""

from fastapi import APIRouter, Depends

from app.api.deps import (
    get_current_user,
    get_current_user_sto_owner,
    get_service_service,
    get_sto_services_service,
)
from app.schemas import ServiceCreate, ServiceResponse
from app.schemas.service_catalog import CatalogItemResponse
from app.services import ServiceService
from app.services.sto_services_service import StoServicesService

router = APIRouter(prefix="/services", tags=["services"])


@router.get("/catalog", response_model=list[CatalogItemResponse])
async def get_catalog(
    _user: dict = Depends(get_current_user),
    svc: StoServicesService = Depends(get_sto_services_service),
):
    """Каталог услуг. Авторизованный пользователь."""
    return await svc.get_catalog()


@router.post("", response_model=ServiceResponse, status_code=201)
async def create_service(
    payload: ServiceCreate,
    user: dict = Depends(get_current_user_sto_owner),
    service_svc: ServiceService = Depends(get_service_service),
):
    """Создать услугу (только владелец СТО, для своего STO)."""
    return await service_svc.create_service(payload, owner_id=user["id"])
