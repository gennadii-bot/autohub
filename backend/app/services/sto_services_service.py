"""STO services management service (owner panel)."""

import logging

from app.core.exceptions import ForbiddenError, NotFoundError, Errors
from app.models import STO
from app.models.enums import STOStatus
from app.repositories.service_catalog_repository import ServiceCatalogRepository
from app.repositories.sto_repository import STORepository
from app.repositories.sto_service_repository import StoServiceRepository
from app.schemas.service_catalog import (
    CatalogItemResponse,
    StoServiceItemResponse,
    StoServiceItemUpdate,
)

logger = logging.getLogger(__name__)


class StoServicesService:
    def __init__(
        self,
        catalog_repo: ServiceCatalogRepository,
        sto_repo: STORepository,
        sto_svc_repo: StoServiceRepository,
    ):
        self.catalog_repo = catalog_repo
        self.sto_repo = sto_repo
        self.sto_svc_repo = sto_svc_repo

    async def get_catalog(self) -> list[CatalogItemResponse]:
        """Get active service catalog."""
        items = await self.catalog_repo.get_all_active()
        return [
            CatalogItemResponse(id=c.id, name=c.name, category=c.category)
            for c in items
        ]

    async def get_sto_services(
        self, sto_id: int, user_id: int
    ) -> list[StoServiceItemResponse]:
        """Get STO services. Only owner."""
        sto = await self.sto_repo.get_by_id(sto_id)
        if not sto:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        if sto.owner_id != user_id:
            raise ForbiddenError(*Errors.FORBIDDEN)
        items = await self.sto_svc_repo.get_by_sto_id(sto_id)
        return [
            StoServiceItemResponse(
                service_id=ss.service_id,
                price=float(ss.price),
                is_active=ss.is_active,
            )
            for ss in items
        ]

    async def update_sto_services(
        self,
        sto_id: int,
        user_id: int,
        items: list[StoServiceItemUpdate],
    ) -> list[StoServiceItemResponse]:
        """Replace STO services. Only owner."""
        sto = await self.sto_repo.get_by_id(sto_id)
        if not sto:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        if sto.owner_id != user_id:
            raise ForbiddenError(*Errors.FORBIDDEN)
        if sto.status != STOStatus.active:
            raise ForbiddenError(*Errors.FORBIDDEN)

        data = [(i.service_id, i.price, i.is_active) for i in items]
        await self.sto_svc_repo.replace_for_sto(sto_id, data)
        return await self.get_sto_services(sto_id, user_id)
