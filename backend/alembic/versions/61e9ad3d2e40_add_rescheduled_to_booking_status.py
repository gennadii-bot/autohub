"""add_rescheduled_to_booking_status

Revision ID: 61e9ad3d2e40
Revises: add_catalog_desc
Create Date: 2026-03-03 20:54:26.472276

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '61e9ad3d2e40'
down_revision: Union[str, None] = 'add_catalog_desc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
