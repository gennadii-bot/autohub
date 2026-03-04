"""Activation token repository."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activation_token import ActivationToken


class ActivationTokenRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: int,
        token: str,
        expires_at: datetime,
    ) -> ActivationToken:
        """Create activation token."""
        at = ActivationToken(
            user_id=user_id,
            token=token,
            expires_at=expires_at,
        )
        self.db.add(at)
        await self.db.flush()
        await self.db.refresh(at)
        return at

    async def get_by_token(self, token: str) -> ActivationToken | None:
        """Find token by value."""
        result = await self.db.execute(
            select(ActivationToken).where(ActivationToken.token == token)
        )
        return result.scalar_one_or_none()

    async def delete_by_user_id(self, user_id: int) -> int:
        """Delete all tokens for user. Returns count deleted."""
        result = await self.db.execute(
            delete(ActivationToken).where(ActivationToken.user_id == user_id)
        )
        return result.rowcount

    async def delete(self, token: ActivationToken) -> None:
        """Delete token."""
        await self.db.delete(token)
        await self.db.flush()
