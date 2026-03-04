"""add user profile fields (first_name, last_name, phone, birth_date, car_*)

Revision ID: add_user_profile_fields
Revises: add_guest_booking
Create Date: 2026-03-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "add_user_profile_fields"
down_revision: Union[str, None] = "add_guest_booking"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("first_name", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("phone", sa.String(32), nullable=True))
    op.add_column("users", sa.Column("birth_date", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("car_brand", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("car_model", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("car_year", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "car_year")
    op.drop_column("users", "car_model")
    op.drop_column("users", "car_brand")
    op.drop_column("users", "birth_date")
    op.drop_column("users", "phone")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
