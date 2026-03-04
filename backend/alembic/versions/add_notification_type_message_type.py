"""add notification type, message message_type

Revision ID: add_notif_type_msg_type
Revises: add_sto_service_duration_booking_catalog
Create Date: 2026-03-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "add_notif_type_msg_type"
down_revision: Union[str, None] = "add_avatar_fav_msg_notif"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # notifications.type - add only if not exists (PostgreSQL)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='notifications' AND column_name='type'
            ) THEN
                ALTER TABLE notifications ADD COLUMN type VARCHAR(32) NOT NULL DEFAULT 'general';
            END IF;
        END $$;
    """)
    # messages.message_type
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='messages' AND column_name='message_type'
            ) THEN
                ALTER TABLE messages ADD COLUMN message_type VARCHAR(16) NOT NULL DEFAULT 'text';
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.drop_column("notifications", "type")
    op.drop_column("messages", "message_type")
