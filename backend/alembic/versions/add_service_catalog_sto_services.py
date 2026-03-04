"""Add service_catalog and sto_services tables.

Revision ID: add_catalog_sto_svc
Revises: add_sto_status
Create Date: 2026-02-28

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "add_catalog_sto_svc"
down_revision: Union[str, None] = "add_sto_status"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "service_catalog",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "sto_services",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("sto_id", sa.Integer(), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.ForeignKeyConstraint(["service_id"], ["service_catalog.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sto_id"], ["stos.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sto_id", "service_id", name="uq_sto_services_sto_service"),
    )
    op.create_index("ix_sto_services_sto_id", "sto_services", ["sto_id"])
    op.create_index("ix_sto_services_service_id", "sto_services", ["service_id"])

    # Seed default catalog
    op.execute(
        sa.text("""
            INSERT INTO service_catalog (name, category, is_active) VALUES
            ('Замена масла', 'Двигатель', true),
            ('Замена фильтра масла', 'Двигатель', true),
            ('Замена воздушного фильтра', 'Двигатель', true),
            ('Замена свечей зажигания', 'Двигатель', true),
            ('Замена тормозных колодок', 'Тормоза', true),
            ('Замена тормозных дисков', 'Тормоза', true),
            ('Прокачка тормозной системы', 'Тормоза', true),
            ('Замена амортизаторов', 'Подвеска', true),
            ('Развал-схождение', 'Подвеска', true),
            ('Замена рулевых наконечников', 'Подвеска', true),
            ('Диагностика электрооборудования', 'Электрика', true),
            ('Замена аккумулятора', 'Электрика', true),
            ('Замена генератора', 'Электрика', true)
        """)
    )


def downgrade() -> None:
    op.drop_index("ix_sto_services_service_id", "sto_services")
    op.drop_index("ix_sto_services_sto_id", "sto_services")
    op.drop_table("sto_services")
    op.drop_table("service_catalog")
