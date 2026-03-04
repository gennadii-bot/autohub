"""Add rejection_reason to sto_requests.

Revision ID: add_rejection_reason
Revises: add_sto_requests
Create Date: 2026-02-27

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "add_rejection_reason"
down_revision: str | None = "add_sto_requests"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "sto_requests",
        sa.Column("rejection_reason", sa.String(512), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("sto_requests", "rejection_reason")
