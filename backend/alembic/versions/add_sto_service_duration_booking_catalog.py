"""Add duration to sto_services, migrate booking.service_id to catalog.

Revision ID: add_duration_booking_catalog
Revises: add_catalog_sto_svc
Create Date: 2026-02-28

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "add_duration_booking_catalog"
down_revision: Union[str, None] = "add_catalog_sto_svc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add duration_minutes to sto_services
    op.add_column(
        "sto_services",
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="30"),
    )

    # Migrate bookings: service_id FK from services -> service_catalog
    # Truncate bookings first (service IDs are incompatible)
    op.execute(sa.text("TRUNCATE TABLE bookings CASCADE"))

    # Drop old FK
    op.drop_constraint(
        "bookings_service_id_fkey",
        "bookings",
        type_="foreignkey",
    )

    # Add new FK to service_catalog
    op.create_foreign_key(
        "bookings_service_id_fkey",
        "bookings",
        "service_catalog",
        ["service_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Add composite index (sto_id, date)
    op.create_index(
        "ix_bookings_sto_id_date",
        "bookings",
        ["sto_id", "date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_bookings_sto_id_date", "bookings")
    op.drop_constraint("bookings_service_id_fkey", "bookings", type_="foreignkey")
    op.create_foreign_key(
        "bookings_service_id_fkey",
        "bookings",
        "services",
        ["service_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.drop_column("sto_services", "duration_minutes")
