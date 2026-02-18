"""add store blocked slots

Revision ID: 20260218_230000
Revises: 20260218_210000
Create Date: 2026-02-18 23:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260218_230000"
down_revision = "20260218_210000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "store_blocked_slots",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=False),
        sa.Column("blocked_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["backend_users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_store_blocked_slots_id", "store_blocked_slots", ["id"], unique=False)
    op.create_index("ix_store_blocked_slots_store_id", "store_blocked_slots", ["store_id"], unique=False)
    op.create_index("ix_store_blocked_slots_blocked_date", "store_blocked_slots", ["blocked_date"], unique=False)
    op.create_index("ix_store_blocked_slots_status", "store_blocked_slots", ["status"], unique=False)
    op.create_index("ix_store_blocked_slots_created_by", "store_blocked_slots", ["created_by"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_store_blocked_slots_created_by", table_name="store_blocked_slots")
    op.drop_index("ix_store_blocked_slots_status", table_name="store_blocked_slots")
    op.drop_index("ix_store_blocked_slots_blocked_date", table_name="store_blocked_slots")
    op.drop_index("ix_store_blocked_slots_store_id", table_name="store_blocked_slots")
    op.drop_index("ix_store_blocked_slots_id", table_name="store_blocked_slots")
    op.drop_table("store_blocked_slots")
