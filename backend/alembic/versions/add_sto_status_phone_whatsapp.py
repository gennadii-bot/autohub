"""Add STO status, phone, whatsapp and unique constraint.

Revision ID: add_sto_status
Revises: 050b17e3cb89
Create Date: 2026-02-28

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "add_sto_status"
down_revision: Union[str, None] = "050b17e3cb89"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("stos", sa.Column("phone", sa.String(32), nullable=True))
    op.add_column("stos", sa.Column("whatsapp", sa.String(32), nullable=True))
    op.add_column(
        "stos",
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
    )
    op.create_unique_constraint(
        "uq_stos_name_city_id",
        "stos",
        ["name", "city_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_stos_name_city_id", "stos", type_="unique")
    op.drop_column("stos", "status")
    op.drop_column("stos", "whatsapp")
    op.drop_column("stos", "phone")
