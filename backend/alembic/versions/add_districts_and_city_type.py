"""Add districts table and city district_id, type.

Revision ID: add_districts_city_type
Revises: add_sto_request_pwd
Create Date: 2026-03-05

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "add_districts_city_type"
down_revision: str | None = "add_sto_request_pwd"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "districts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("region_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["region_id"], ["regions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_districts_name"), "districts", ["name"], unique=False)
    op.create_index(op.f("ix_districts_region_id"), "districts", ["region_id"], unique=False)

    op.add_column("cities", sa.Column("district_id", sa.Integer(), nullable=True))
    op.add_column("cities", sa.Column("type", sa.String(50), nullable=True))
    op.create_foreign_key(
        "fk_cities_district_id",
        "cities",
        "districts",
        ["district_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(op.f("ix_cities_district_id"), "cities", ["district_id"], unique=False)
    op.create_index(op.f("ix_cities_type"), "cities", ["type"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_cities_type"), table_name="cities")
    op.drop_index(op.f("ix_cities_district_id"), table_name="cities")
    op.drop_constraint("fk_cities_district_id", "cities", type_="foreignkey")
    op.drop_column("cities", "type")
    op.drop_column("cities", "district_id")
    op.drop_index(op.f("ix_districts_region_id"), table_name="districts")
    op.drop_index(op.f("ix_districts_name"), table_name="districts")
    op.drop_table("districts")
