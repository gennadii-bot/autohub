"""add guest booking support

Revision ID: add_guest_booking
Revises: add_sto_slug
Create Date: 2026-03-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "add_guest_booking"
down_revision: Union[str, None] = "add_sto_slug"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "bookings",
        "client_id",
        existing_type=sa.Integer(),
        nullable=True,
    )
    op.add_column("bookings", sa.Column("guest_name", sa.String(255), nullable=True))
    op.add_column("bookings", sa.Column("guest_email", sa.String(255), nullable=True))
    op.add_column("bookings", sa.Column("guest_phone", sa.String(32), nullable=True))


def downgrade() -> None:
    op.drop_column("bookings", "guest_phone")
    op.drop_column("bookings", "guest_email")
    op.drop_column("bookings", "guest_name")
    op.alter_column(
        "bookings",
        "client_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
