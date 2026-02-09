"""add security ip control tables

Revision ID: 20260209_163000
Revises: 20260209_150000
Create Date: 2026-02-09 16:30:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260209_163000"
down_revision = "20260209_150000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "security_ip_rules",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("rule_type", sa.String(length=10), nullable=False),
        sa.Column("target_type", sa.String(length=10), nullable=False),
        sa.Column("target_value", sa.String(length=64), nullable=False),
        sa.Column("scope", sa.String(length=20), nullable=False, server_default="admin_api"),
        sa.Column("status", sa.String(length=10), nullable=False, server_default="active"),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_security_ip_rules_id", "security_ip_rules", ["id"], unique=False)
    op.create_index("ix_security_ip_rules_rule_type", "security_ip_rules", ["rule_type"], unique=False)
    op.create_index("ix_security_ip_rules_target_type", "security_ip_rules", ["target_type"], unique=False)
    op.create_index("ix_security_ip_rules_target_value", "security_ip_rules", ["target_value"], unique=False)
    op.create_index("ix_security_ip_rules_scope", "security_ip_rules", ["scope"], unique=False)
    op.create_index("ix_security_ip_rules_status", "security_ip_rules", ["status"], unique=False)
    op.create_index("ix_security_ip_rules_priority", "security_ip_rules", ["priority"], unique=False)
    op.create_index("ix_security_ip_rules_expires_at", "security_ip_rules", ["expires_at"], unique=False)
    op.create_index("ix_security_ip_rules_created_by", "security_ip_rules", ["created_by"], unique=False)

    op.create_table(
        "security_block_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("ip_address", sa.String(length=64), nullable=False),
        sa.Column("path", sa.String(length=255), nullable=False),
        sa.Column("method", sa.String(length=16), nullable=False),
        sa.Column("scope", sa.String(length=20), nullable=False),
        sa.Column("matched_rule_id", sa.Integer(), nullable=True),
        sa.Column("block_reason", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("meta_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_security_block_logs_id", "security_block_logs", ["id"], unique=False)
    op.create_index("ix_security_block_logs_ip_address", "security_block_logs", ["ip_address"], unique=False)
    op.create_index("ix_security_block_logs_path", "security_block_logs", ["path"], unique=False)
    op.create_index("ix_security_block_logs_method", "security_block_logs", ["method"], unique=False)
    op.create_index("ix_security_block_logs_scope", "security_block_logs", ["scope"], unique=False)
    op.create_index("ix_security_block_logs_matched_rule_id", "security_block_logs", ["matched_rule_id"], unique=False)
    op.create_index("ix_security_block_logs_block_reason", "security_block_logs", ["block_reason"], unique=False)
    op.create_index("ix_security_block_logs_user_id", "security_block_logs", ["user_id"], unique=False)
    op.create_index("ix_security_block_logs_created_at", "security_block_logs", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_security_block_logs_created_at", table_name="security_block_logs")
    op.drop_index("ix_security_block_logs_user_id", table_name="security_block_logs")
    op.drop_index("ix_security_block_logs_block_reason", table_name="security_block_logs")
    op.drop_index("ix_security_block_logs_matched_rule_id", table_name="security_block_logs")
    op.drop_index("ix_security_block_logs_scope", table_name="security_block_logs")
    op.drop_index("ix_security_block_logs_method", table_name="security_block_logs")
    op.drop_index("ix_security_block_logs_path", table_name="security_block_logs")
    op.drop_index("ix_security_block_logs_ip_address", table_name="security_block_logs")
    op.drop_index("ix_security_block_logs_id", table_name="security_block_logs")
    op.drop_table("security_block_logs")

    op.drop_index("ix_security_ip_rules_created_by", table_name="security_ip_rules")
    op.drop_index("ix_security_ip_rules_expires_at", table_name="security_ip_rules")
    op.drop_index("ix_security_ip_rules_priority", table_name="security_ip_rules")
    op.drop_index("ix_security_ip_rules_status", table_name="security_ip_rules")
    op.drop_index("ix_security_ip_rules_scope", table_name="security_ip_rules")
    op.drop_index("ix_security_ip_rules_target_value", table_name="security_ip_rules")
    op.drop_index("ix_security_ip_rules_target_type", table_name="security_ip_rules")
    op.drop_index("ix_security_ip_rules_rule_type", table_name="security_ip_rules")
    op.drop_index("ix_security_ip_rules_id", table_name="security_ip_rules")
    op.drop_table("security_ip_rules")
