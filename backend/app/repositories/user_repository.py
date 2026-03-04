"""User repository."""

from datetime import date, datetime

from sqlalchemy import cast, delete, func, select, update
from sqlalchemy.types import Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.models.enums import UserRole


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: int) -> User | None:
        """Get user by id."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_id_with_city(self, user_id: int) -> User | None:
        """Get user by id with city loaded."""
        from sqlalchemy.orm import selectinload

        result = await self.db.execute(
            select(User).where(User.id == user_id).options(selectinload(User.city))
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        """Get user by email."""
        result = await self.db.execute(
            select(User).where(User.email == email.strip().lower())
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        email: str,
        password_hash: str,
        role: UserRole = UserRole.client,
        city_id: int | None = None,
        first_name: str | None = None,
        last_name: str | None = None,
        phone: str | None = None,
        birth_date: date | None = None,
        car_brand: str | None = None,
        car_model: str | None = None,
        car_year: int | None = None,
    ) -> User:
        """Create new user."""
        user = User(
            email=email.strip().lower(),
            password_hash=password_hash,
            role=role,
            city_id=city_id,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            birth_date=birth_date,
            car_brand=car_brand,
            car_model=car_model,
            car_year=car_year,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def email_exists(self, email: str) -> bool:
        """Check if email is already registered."""
        user = await self.get_by_email(email.strip().lower())
        return user is not None

    async def update_role(self, user_id: int, role: UserRole) -> bool:
        """Update user role. Returns True if updated. Never demote or change super_admin."""
        from sqlalchemy import update

        user = await self.get_by_id(user_id)
        if user and user.role == UserRole.super_admin:
            from app.core.exceptions import ForbiddenError, Errors
            raise ForbiddenError(*Errors.SUPER_ADMIN_PROTECTED)
        result = await self.db.execute(
            update(User).where(User.id == user_id).values(role=role)
        )
        return result.rowcount > 0

    async def update_password(self, user_id: int, password_hash: str) -> bool:
        """Update user password. Returns True if updated."""
        from sqlalchemy import update

        result = await self.db.execute(
            update(User).where(User.id == user_id).values(password_hash=password_hash)
        )
        return result.rowcount > 0

    async def update_is_active(self, user_id: int, is_active: bool) -> bool:
        """Update user is_active. Returns True if updated."""
        from sqlalchemy import update

        result = await self.db.execute(
            update(User).where(User.id == user_id).values(is_active=is_active)
        )
        return result.rowcount > 0

    async def update_city(self, user_id: int, city_id: int | None) -> bool:
        """Update user city_id. Returns True if updated."""
        result = await self.db.execute(
            update(User).where(User.id == user_id).values(city_id=city_id)
        )
        return result.rowcount > 0

    async def update_avatar(self, user_id: int, avatar_url: str | None) -> bool:
        """Update user avatar_url. Returns True if updated."""
        result = await self.db.execute(
            update(User).where(User.id == user_id).values(avatar_url=avatar_url)
        )
        return result.rowcount > 0

    _PROFILE_FIELDS = frozenset(
        {"first_name", "last_name", "phone", "birth_date", "car_brand", "car_model", "car_year", "city_id"}
    )

    async def update_profile(self, user_id: int, **kwargs) -> bool:
        """Update user profile. Pass only fields to update. city_id=None clears city."""
        vals = {k: v for k, v in kwargs.items() if k in self._PROFILE_FIELDS}
        if "phone" in vals and vals["phone"] is not None:
            vals["phone"] = str(vals["phone"]).strip() or None
        if not vals:
            return False
        result = await self.db.execute(update(User).where(User.id == user_id).values(**vals))
        return result.rowcount > 0

    async def delete_by_id(self, user_id: int) -> bool:
        """Delete user by id. Returns True if deleted."""
        result = await self.db.execute(delete(User).where(User.id == user_id))
        return result.rowcount > 0

    async def count(self) -> int:
        """Total users count."""
        result = await self.db.execute(select(func.count()).select_from(User))
        return result.scalar() or 0

    async def count_created_between(
        self, start_date: date | datetime, end_date: date | datetime
    ) -> int:
        """Count users created between start_date and end_date (inclusive)."""
        result = await self.db.execute(
            select(func.count(User.id)).where(
                cast(User.created_at, Date) >= start_date,
                cast(User.created_at, Date) <= end_date,
            )
        )
        return result.scalar() or 0

    async def list_paginated(
        self,
        page: int = 1,
        per_page: int = 20,
        search: str | None = None,
        role: UserRole | None = None,
    ) -> tuple[list[User], int]:
        """List users with pagination. Returns (items, total)."""
        base = select(User)
        count_base = select(func.count()).select_from(User)
        if search and search.strip():
            pattern = f"%{search.strip().lower()}%"
            from sqlalchemy import or_
            base = base.where(
                or_(
                    User.email.ilike(pattern),
                    User.first_name.ilike(pattern),
                    User.last_name.ilike(pattern),
                    User.phone.ilike(pattern),
                )
            )
            count_base = count_base.where(
                or_(
                    User.email.ilike(pattern),
                    User.first_name.ilike(pattern),
                    User.last_name.ilike(pattern),
                    User.phone.ilike(pattern),
                )
            )
        if role is not None:
            base = base.where(User.role == role)
            count_base = count_base.where(User.role == role)
        total_result = await self.db.execute(count_base)
        total = total_result.scalar() or 0
        base = base.order_by(User.created_at.desc())
        base = base.offset((page - 1) * per_page).limit(per_page)
        result = await self.db.execute(base)
        items = list(result.scalars().unique().all())
        return items, total

    async def count_by_date_range(
        self, start_date: date | datetime, end_date: date | datetime
    ) -> list[tuple[str, int]]:
        """Count new users grouped by date. Uses date_trunc. Returns [(date_str, count), ...]."""
        day_trunc = func.date_trunc("day", User.created_at)
        day_date = cast(day_trunc, Date)
        stmt = (
            select(day_date.label("d"), func.count(User.id).label("c"))
            .where(day_date >= start_date, day_date <= end_date)
            .group_by(day_trunc)
            .order_by(day_trunc)
        )
        result = await self.db.execute(stmt)
        return [(str(row.d), row.c) for row in result.all()]

    async def get_client_by_telegram_id(self, telegram_id: int) -> User | None:
        """Get client user by telegram_id (legacy)."""
        result = await self.db.execute(
            select(User).where(
                User.telegram_id == telegram_id,
                User.role == UserRole.client,
            )
        )
        return result.scalar_one_or_none()