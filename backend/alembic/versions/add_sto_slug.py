"""add sto slug

Revision ID: add_sto_slug
Revises: 61e9ad3d2e40
Create Date: 2026-03-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "add_sto_slug"
down_revision: Union[str, None] = "61e9ad3d2e40"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def slugify(name: str) -> str:
    """Generate slug from name."""
    s = name.lower().strip()
    for c in " -_":
        s = s.replace(c, "-")
    while "--" in s:
        s = s.replace("--", "-")
    return s.strip("-") or "sto"


def upgrade() -> None:
    op.add_column("stos", sa.Column("slug", sa.String(255), nullable=True))
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT id, name FROM stos"))
    rows = result.fetchall()
    for row in rows:
        sid, name = row
        base = slugify(name or "sto")
        slug = base
        n = 0
        while True:
            r = conn.execute(
                sa.text("SELECT 1 FROM stos WHERE slug = :s AND id != :id"),
                {"s": slug, "id": sid},
            )
            if r.scalar() is None:
                break
            n += 1
            slug = f"{base}-{n}"
        conn.execute(
            sa.text("UPDATE stos SET slug = :s WHERE id = :id"),
            {"s": slug, "id": sid},
        )
    op.alter_column("stos", "slug", nullable=False)
    op.create_index("ix_stos_slug", "stos", ["slug"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_stos_slug", table_name="stos")
    op.drop_column("stos", "slug")
