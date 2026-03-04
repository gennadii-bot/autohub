"""Add description to service_catalog.

Revision ID: add_catalog_desc
Revises: add_rejection_reason
Create Date: 2026-02-28

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "add_catalog_desc"
down_revision: Union[str, None] = "add_rejection_reason"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Idempotent: skip if column already exists (e.g. added manually)
    conn = op.get_bind()
    r = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_schema = 'public' AND table_name = 'service_catalog' AND column_name = 'description'"
    ))
    if r.scalar() is None:
        op.add_column(
            "service_catalog",
            sa.Column("description", sa.Text(), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("service_catalog", "description")
