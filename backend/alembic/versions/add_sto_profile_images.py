"""add_sto_profile_images

Revision ID: add_sto_profile_images
Revises: add_districts_city_type
Create Date: 2026-03-03

Add region, city_name, owner_initials to stos and sto_images table.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_sto_profile_images"
down_revision: Union[str, None] = "add_districts_city_type"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("stos", sa.Column("region", sa.String(255), nullable=True))
    op.add_column("stos", sa.Column("city_name", sa.String(255), nullable=True))
    op.add_column("stos", sa.Column("owner_initials", sa.String(64), nullable=True))

    op.create_table(
        "sto_images",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("sto_id", sa.Integer(), nullable=False),
        sa.Column("image_url", sa.String(512), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["sto_id"], ["stos.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sto_images_sto_id"), "sto_images", ["sto_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_sto_images_sto_id"), table_name="sto_images")
    op.drop_table("sto_images")
    op.drop_column("stos", "owner_initials")
    op.drop_column("stos", "city_name")
    op.drop_column("stos", "region")
