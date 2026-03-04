"""Service (услуги СТО) business logic."""

from app.core.exceptions import Errors, ForbiddenError, NotFoundError
from app.repositories.service_repository import ServiceRepository
from app.repositories.sto_repository import STORepository
from app.schemas.sto import ServiceCreate, ServiceResponse


class ServiceService:
    def __init__(
        self,
        service_repo: ServiceRepository,
        sto_repo: STORepository,
    ):
        self.service_repo = service_repo
        self.sto_repo = sto_repo

    async def list_sto_services(self, sto_id: int) -> list[ServiceResponse]:
        """Get all services for STO."""
        items = await self.service_repo.get_by_sto_id(sto_id)
        return [ServiceResponse.model_validate(s) for s in items]

    async def create_service(
        self,
        payload: ServiceCreate,
        owner_id: int,
    ) -> ServiceResponse:
        """Create service. Owner must own the STO."""
        sto = await self.sto_repo.get_by_id(payload.sto_id)
        if sto is None:
            raise NotFoundError(*Errors.STO_NOT_FOUND)
        if sto.owner_id is None or sto.owner_id != owner_id:
            raise ForbiddenError(
                "FORBIDDEN",
                "You can only add services to your own STO",
            )
        svc = await self.service_repo.create(
            sto_id=payload.sto_id,
            name=payload.name,
            price=payload.price,
            duration_minutes=payload.duration_minutes,
        )
        return ServiceResponse.model_validate(svc)
