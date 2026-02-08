"""add risk control tables

Revision ID: 20260208_183000
Revises: 20260206_220000
Create Date: 2026-02-08 18:30:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260208_183000"
down_revision = "20260206_220000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_risk_states",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("risk_level", sa.String(length=20), nullable=False, server_default="normal"),
        sa.Column("restricted_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancel_7d", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("no_show_30d", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("manual_note", sa.Text(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", name="uq_user_risk_states_user_id"),
    )
    op.create_index("ix_user_risk_states_id", "user_risk_states", ["id"], unique=False)
    op.create_index("ix_user_risk_states_user_id", "user_risk_states", ["user_id"], unique=False)
    op.create_index("ix_user_risk_states_risk_level", "user_risk_states", ["risk_level"], unique=False)
    op.create_index("ix_user_risk_states_restricted_until", "user_risk_states", ["restricted_until"], unique=False)

    op.create_table(
        "risk_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("appointment_id", sa.Integer(), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("meta_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_risk_events_id", "risk_events", ["id"], unique=False)
    op.create_index("ix_risk_events_user_id", "risk_events", ["user_id"], unique=False)
    op.create_index("ix_risk_events_appointment_id", "risk_events", ["appointment_id"], unique=False)
    op.create_index("ix_risk_events_ip_address", "risk_events", ["ip_address"], unique=False)
    op.create_index("ix_risk_events_event_type", "risk_events", ["event_type"], unique=False)
    op.create_index("ix_risk_events_created_at", "risk_events", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_risk_events_created_at", table_name="risk_events")
    op.drop_index("ix_risk_events_event_type", table_name="risk_events")
    op.drop_index("ix_risk_events_ip_address", table_name="risk_events")
    op.drop_index("ix_risk_events_appointment_id", table_name="risk_events")
    op.drop_index("ix_risk_events_user_id", table_name="risk_events")
    op.drop_index("ix_risk_events_id", table_name="risk_events")
    op.drop_table("risk_events")

    op.drop_index("ix_user_risk_states_restricted_until", table_name="user_risk_states")
    op.drop_index("ix_user_risk_states_risk_level", table_name="user_risk_states")
    op.drop_index("ix_user_risk_states_user_id", table_name="user_risk_states")
    op.drop_index("ix_user_risk_states_id", table_name="user_risk_states")
    op.drop_table("user_risk_states")
