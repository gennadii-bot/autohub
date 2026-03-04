"""Enums for model fields.

Python Enum для типизации и валидации.
Хранение в БД как VARCHAR — без PostgreSQL ENUM.
"""

from enum import Enum
from typing import Type, TypeVar

from sqlalchemy import String
from sqlalchemy.types import TypeDecorator

E = TypeVar("E", bound=Enum)


class EnumStr(TypeDecorator):
    """Хранит Python Enum в БД как VARCHAR. Без CREATE TYPE."""

    impl = String(20)
    cache_ok = True

    def __init__(self, enum_class: Type[E], *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.enum_class = enum_class

    def process_bind_param(self, value: E | str | None, dialect) -> str | None:
        if value is None:
            return None
        if isinstance(value, self.enum_class):
            return value.value
        return str(value)

    def process_result_value(self, value: str | None, dialect) -> E | None:
        if value is None:
            return None
        return self.enum_class(value)


class UserRole(str, Enum):
    client = "client"
    sto = "sto"  # alias for sto_owner
    sto_owner = "sto_owner"
    admin = "admin"
    super_admin = "super_admin"


class STOStatus(str, Enum):
    pending = "pending"
    active = "active"
    rejected = "rejected"
    blocked = "blocked"


class BookingStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    rescheduled = "rescheduled"
    cancelled = "cancelled"
    completed = "completed"
