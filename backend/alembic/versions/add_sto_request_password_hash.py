"""Add password_hash to sto_requests.

Revision ID: add_sto_request_pwd
Revises: add_notif_type_msg_type
Create Date: 2026-03-03

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "add_sto_request_pwd"
down_revision: str | None = "add_notif_type_msg_type"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "sto_requests",
        sa.Column("password_hash", sa.String(255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("sto_requests", "password_hash")
