"""add appointment service items

Revision ID: 20260219_010000
Revises: 20260218_230000
Create Date: 2026-02-19 01:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260219_010000"
down_revision = "20260218_230000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "appointment_service_items" not in table_names:
        op.create_table(
            "appointment_service_items",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("appointment_id", sa.Integer(), nullable=False),
            sa.Column("service_id", sa.Integer(), nullable=False),
            sa.Column("amount", sa.Float(), nullable=False),
            sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("created_by", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["appointment_id"], ["appointments.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="RESTRICT"),
            sa.PrimaryKeyConstraint("id"),
        )

    inspector = sa.inspect(bind)
    indexes = {idx["name"] for idx in inspector.get_indexes("appointment_service_items")}
    if "ix_appointment_service_items_id" not in indexes:
        op.create_index("ix_appointment_service_items_id", "appointment_service_items", ["id"], unique=False)
    if "ix_appointment_service_items_appointment_id" not in indexes:
        op.create_index("ix_appointment_service_items_appointment_id", "appointment_service_items", ["appointment_id"], unique=False)
    if "ix_appointment_service_items_service_id" not in indexes:
        op.create_index("ix_appointment_service_items_service_id", "appointment_service_items", ["service_id"], unique=False)
    if "ix_appointment_service_items_is_primary" not in indexes:
        op.create_index("ix_appointment_service_items_is_primary", "appointment_service_items", ["is_primary"], unique=False)
    if "ix_appointment_service_items_created_by" not in indexes:
        op.create_index("ix_appointment_service_items_created_by", "appointment_service_items", ["created_by"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "appointment_service_items" not in table_names:
        return

    indexes = {idx["name"] for idx in inspector.get_indexes("appointment_service_items")}
    for idx_name in [
        "ix_appointment_service_items_created_by",
        "ix_appointment_service_items_is_primary",
        "ix_appointment_service_items_service_id",
        "ix_appointment_service_items_appointment_id",
        "ix_appointment_service_items_id",
    ]:
        if idx_name in indexes:
            op.drop_index(idx_name, table_name="appointment_service_items")
    op.drop_table("appointment_service_items")
