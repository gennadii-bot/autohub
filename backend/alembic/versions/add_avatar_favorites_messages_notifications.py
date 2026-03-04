"""add avatar_url, favorites, messages, notifications

Revision ID: add_avatar_fav_msg_notif
Revises: add_user_profile_fields
Create Date: 2026-03-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "add_avatar_fav_msg_notif"
down_revision: Union[str, None] = "add_user_profile_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    # Use raw SQL with IF NOT EXISTS for idempotency (PostgreSQL)
    conn.execute(sa.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512)"))
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS favorites (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            sto_id INTEGER NOT NULL REFERENCES stos(id) ON DELETE CASCADE,
            UNIQUE(user_id, sto_id)
        )
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_favorites_user_id ON favorites(user_id)"))
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            is_read BOOLEAN DEFAULT false NOT NULL
        )
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_messages_booking_id ON messages(booking_id)"))
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            is_read BOOLEAN DEFAULT false NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        )
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id)"))


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("messages")
    op.drop_table("favorites")
    op.drop_column("users", "avatar_url")
