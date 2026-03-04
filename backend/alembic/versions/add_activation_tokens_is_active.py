"""Add activation_tokens table and user.is_active.

Revision ID: add_activation
Revises: 050b17e3cb89
Create Date: 2025-02-27

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_activation"
down_revision: str | None = "add_reviews_schedule"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
    )
    op.create_table(
        "activation_tokens",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_activation_tokens_token", "activation_tokens", ["token"], unique=True)
    op.create_index("ix_activation_tokens_user_id", "activation_tokens", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_activation_tokens_user_id", table_name="activation_tokens")
    op.drop_index("ix_activation_tokens_token", table_name="activation_tokens")
    op.drop_table("activation_tokens")
    op.drop_column("users", "is_active")
