"""add_sto_image_url

Revision ID: 050b17e3cb89
Revises: 6474a7f8eebb
Create Date: 2026-02-28 23:35:37.593012

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '050b17e3cb89'
down_revision: Union[str, None] = '6474a7f8eebb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Idempotent: skip if column already exists (e.g. from manual fix or previous run)
    conn = op.get_bind()
    r = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_schema = 'public' AND table_name = 'stos' AND column_name = 'image_url'"
    ))
    if r.scalar() is None:
        op.add_column("stos", sa.Column("image_url", sa.String(512), nullable=True))


def downgrade() -> None:
    op.drop_column("stos", "image_url")
