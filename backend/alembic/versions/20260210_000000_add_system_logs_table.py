"""add system logs table

Revision ID: 20260210_000000
Revises: 20260209_163000
Create Date: 2026-02-10 00:00:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260210_000000"
down_revision = "20260209_163000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("log_type", sa.String(length=20), nullable=False),
        sa.Column("level", sa.String(length=10), nullable=False),
        sa.Column("module", sa.String(length=50), nullable=True),
        sa.Column("action", sa.String(length=80), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("operator_user_id", sa.Integer(), nullable=True),
        sa.Column("store_id", sa.Integer(), nullable=True),
        sa.Column("target_type", sa.String(length=40), nullable=True),
        sa.Column("target_id", sa.String(length=64), nullable=True),
        sa.Column("request_id", sa.String(length=64), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("path", sa.String(length=255), nullable=True),
        sa.Column("method", sa.String(length=16), nullable=True),
        sa.Column("status_code", sa.Integer(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("before_json", sa.Text(), nullable=True),
        sa.Column("after_json", sa.Text(), nullable=True),
        sa.Column("meta_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_system_logs_id", "system_logs", ["id"], unique=False)
    op.create_index("ix_system_logs_log_type", "system_logs", ["log_type"], unique=False)
    op.create_index("ix_system_logs_level", "system_logs", ["level"], unique=False)
    op.create_index("ix_system_logs_module", "system_logs", ["module"], unique=False)
    op.create_index("ix_system_logs_action", "system_logs", ["action"], unique=False)
    op.create_index("ix_system_logs_operator_user_id", "system_logs", ["operator_user_id"], unique=False)
    op.create_index("ix_system_logs_store_id", "system_logs", ["store_id"], unique=False)
    op.create_index("ix_system_logs_target_type", "system_logs", ["target_type"], unique=False)
    op.create_index("ix_system_logs_target_id", "system_logs", ["target_id"], unique=False)
    op.create_index("ix_system_logs_request_id", "system_logs", ["request_id"], unique=False)
    op.create_index("ix_system_logs_ip_address", "system_logs", ["ip_address"], unique=False)
    op.create_index("ix_system_logs_path", "system_logs", ["path"], unique=False)
    op.create_index("ix_system_logs_method", "system_logs", ["method"], unique=False)
    op.create_index("ix_system_logs_status_code", "system_logs", ["status_code"], unique=False)
    op.create_index("ix_system_logs_latency_ms", "system_logs", ["latency_ms"], unique=False)
    op.create_index("ix_system_logs_created_at", "system_logs", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_system_logs_created_at", table_name="system_logs")
    op.drop_index("ix_system_logs_latency_ms", table_name="system_logs")
    op.drop_index("ix_system_logs_status_code", table_name="system_logs")
    op.drop_index("ix_system_logs_method", table_name="system_logs")
    op.drop_index("ix_system_logs_path", table_name="system_logs")
    op.drop_index("ix_system_logs_ip_address", table_name="system_logs")
    op.drop_index("ix_system_logs_request_id", table_name="system_logs")
    op.drop_index("ix_system_logs_target_id", table_name="system_logs")
    op.drop_index("ix_system_logs_target_type", table_name="system_logs")
    op.drop_index("ix_system_logs_store_id", table_name="system_logs")
    op.drop_index("ix_system_logs_operator_user_id", table_name="system_logs")
    op.drop_index("ix_system_logs_action", table_name="system_logs")
    op.drop_index("ix_system_logs_module", table_name="system_logs")
    op.drop_index("ix_system_logs_level", table_name="system_logs")
    op.drop_index("ix_system_logs_log_type", table_name="system_logs")
    op.drop_index("ix_system_logs_id", table_name="system_logs")
    op.drop_table("system_logs")
