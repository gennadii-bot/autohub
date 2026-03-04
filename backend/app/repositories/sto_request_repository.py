"""STO request repository."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import STORequest


class STORequestRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, **kwargs) -> STORequest:
        """Create STO request."""
        req = STORequest(**kwargs)
        self.db.add(req)
        await self.db.flush()
        await self.db.refresh(req)
        return req

    async def get_by_id(self, request_id: UUID) -> STORequest | None:
        """Get STO request by UUID."""
        result = await self.db.execute(
            select(STORequest)
            .options(
                selectinload(STORequest.region),
                selectinload(STORequest.city),
            )
            .where(STORequest.id == request_id)
        )
        return result.scalar_one_or_none()

    async def get_all_pending(self) -> list[STORequest]:
        """Get all pending STO requests ordered by created_at desc."""
        result = await self.db.execute(
            select(STORequest)
            .options(
                selectinload(STORequest.region),
                selectinload(STORequest.city),
            )
            .where(STORequest.status == "pending")
            .order_by(STORequest.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_all_paginated(
        self,
        status: str | None = None,
        page: int = 1,
        per_page: int = 20,
    ) -> tuple[list[STORequest], int]:
        """Get STO requests with optional status filter, pagination, sort by created_at DESC."""
        base = (
            select(STORequest)
            .options(
                selectinload(STORequest.region),
                selectinload(STORequest.city),
            )
            .order_by(STORequest.created_at.desc())
        )
        count_base = select(func.count()).select_from(STORequest)

        if status:
            base = base.where(STORequest.status == status)
            count_base = count_base.where(STORequest.status == status)

        total = (await self.db.execute(count_base)).scalar() or 0

        offset = (page - 1) * per_page
        base = base.offset(offset).limit(per_page)
        result = await self.db.execute(base)
        items = list(result.scalars().all())

        return items, total

    async def update_status(self, request_id: UUID, status: str) -> None:
        """Update STO request status."""
        req = await self.get_by_id(request_id)
        if req:
            req.status = status

    async def update_rejection(
        self, request_id: UUID, status: str = "rejected", reason: str | None = None
    ) -> None:
        """Update STO request status and rejection reason."""
        req = await self.get_by_id(request_id)
        if req:
            req.status = status
            req.rejection_reason = reason

    async def email_exists_pending(self, email: str) -> bool:
        """Check if email has pending request."""
        result = await self.db.execute(
            select(STORequest.id).where(
                STORequest.email == email.strip().lower(),
                STORequest.status == "pending",
            )
        )
        return result.scalar_one_or_none() is not None

    async def iin_exists_pending(self, iin: str) -> bool:
        """Check if IIN has pending request."""
        result = await self.db.execute(
            select(STORequest.id).where(
                STORequest.iin == iin.strip(),
                STORequest.status == "pending",
            )
        )
        return result.scalar_one_or_none() is not None
