"""Add reviews, sto_schedules, max_parallel_bookings.

Revision ID: add_reviews_schedule
Revises: add_duration_booking_catalog
Create Date: 2026-02-28

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "add_reviews_schedule"
down_revision: Union[str, None] = "add_duration_booking_catalog"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # max_parallel_bookings on STO
    op.add_column(
        "stos",
        sa.Column(
            "max_parallel_bookings",
            sa.Integer(),
            nullable=False,
            server_default="3",
        ),
    )

    # sto_schedules
    op.create_table(
        "sto_schedules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("sto_id", sa.Integer(), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("is_working", sa.Boolean(), nullable=False, server_default="true"),
        sa.ForeignKeyConstraint(["sto_id"], ["stos.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sto_id", "day_of_week", name="uq_sto_schedules_sto_day"),
    )
    op.create_index("ix_sto_schedules_sto_id", "sto_schedules", ["sto_id"])

    # reviews
    op.create_table(
        "reviews",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("sto_id", sa.Integer(), nullable=False),
        sa.Column("booking_id", sa.Integer(), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sto_id"], ["stos.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("booking_id", name="uq_reviews_booking_id"),
    )
    op.create_index("ix_reviews_user_id", "reviews", ["user_id"])
    op.create_index("ix_reviews_sto_id", "reviews", ["sto_id"])


def downgrade() -> None:
    op.drop_index("ix_reviews_sto_id", "reviews")
    op.drop_index("ix_reviews_user_id", "reviews")
    op.drop_table("reviews")
    op.drop_index("ix_sto_schedules_sto_id", "sto_schedules")
    op.drop_table("sto_schedules")
    op.drop_column("stos", "max_parallel_bookings")
