"""Add sto_requests table.

Revision ID: add_sto_requests
Revises: add_activation
Create Date: 2026-02-27

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "add_sto_requests"
down_revision: str | None = "add_activation"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "sto_requests",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("middle_name", sa.String(100), nullable=True),
        sa.Column("iin", sa.String(12), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("ip_name", sa.String(255), nullable=True),
        sa.Column("bin", sa.String(12), nullable=True),
        sa.Column("sto_name", sa.String(255), nullable=False),
        sa.Column("sto_description", sa.Text(), nullable=True),
        sa.Column("region_id", sa.Integer(), nullable=False),
        sa.Column("city_id", sa.Integer(), nullable=False),
        sa.Column("address", sa.String(512), nullable=False),
        sa.Column("photo_url", sa.String(512), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["region_id"], ["regions.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["city_id"], ["cities.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sto_requests_email", "sto_requests", ["email"])
    op.create_index("ix_sto_requests_iin", "sto_requests", ["iin"])
    op.create_index("ix_sto_requests_status", "sto_requests", ["status"])


def downgrade() -> None:
    op.drop_index("ix_sto_requests_status", table_name="sto_requests")
    op.drop_index("ix_sto_requests_iin", table_name="sto_requests")
    op.drop_index("ix_sto_requests_email", table_name="sto_requests")
    op.drop_table("sto_requests")
