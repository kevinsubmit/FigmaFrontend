"""add appointment groups and payment fields

Revision ID: 20260212_010000
Revises: 20260211_004000
Create Date: 2026-02-12 01:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260212_010000"
down_revision = "20260211_004000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    if "appointments" in table_names:
        columns = {col["name"] for col in inspector.get_columns("appointments")}
        if "group_id" not in columns:
            op.add_column("appointments", sa.Column("group_id", sa.Integer(), nullable=True))
        if "is_group_host" not in columns:
            op.add_column("appointments", sa.Column("is_group_host", sa.Boolean(), nullable=False, server_default=sa.text("0")))
        if "payment_status" not in columns:
            op.add_column("appointments", sa.Column("payment_status", sa.String(length=20), nullable=False, server_default="unpaid"))
        if "paid_amount" not in columns:
            op.add_column("appointments", sa.Column("paid_amount", sa.Float(), nullable=False, server_default="0"))

        inspector = sa.inspect(bind)
        indexes = {idx["name"] for idx in inspector.get_indexes("appointments")}
        if "ix_appointments_group_id" not in indexes:
            op.create_index("ix_appointments_group_id", "appointments", ["group_id"], unique=False)
        if "ix_appointments_payment_status" not in indexes:
            op.create_index("ix_appointments_payment_status", "appointments", ["payment_status"], unique=False)

    if "appointment_groups" not in table_names:
        op.create_table(
            "appointment_groups",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("group_code", sa.String(length=32), nullable=True),
            sa.Column("host_appointment_id", sa.Integer(), nullable=False),
            sa.Column("store_id", sa.Integer(), nullable=False),
            sa.Column("appointment_date", sa.Date(), nullable=False),
            sa.Column("appointment_time", sa.Time(), nullable=False),
            sa.Column("created_by_user_id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )

    inspector = sa.inspect(bind)
    indexes = {idx["name"] for idx in inspector.get_indexes("appointment_groups")}
    if "ix_appointment_groups_id" not in indexes:
        op.create_index("ix_appointment_groups_id", "appointment_groups", ["id"], unique=False)
    if "ix_appointment_groups_group_code" not in indexes:
        op.create_index("ix_appointment_groups_group_code", "appointment_groups", ["group_code"], unique=False)
    if "ix_appointment_groups_host_appointment_id" not in indexes:
        op.create_index("ix_appointment_groups_host_appointment_id", "appointment_groups", ["host_appointment_id"], unique=False)
    if "ix_appointment_groups_store_id" not in indexes:
        op.create_index("ix_appointment_groups_store_id", "appointment_groups", ["store_id"], unique=False)
    if "ix_appointment_groups_appointment_date" not in indexes:
        op.create_index("ix_appointment_groups_appointment_date", "appointment_groups", ["appointment_date"], unique=False)
    if "ix_appointment_groups_created_by_user_id" not in indexes:
        op.create_index("ix_appointment_groups_created_by_user_id", "appointment_groups", ["created_by_user_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    if "appointment_groups" in table_names:
        indexes = {idx["name"] for idx in inspector.get_indexes("appointment_groups")}
        for idx_name in [
            "ix_appointment_groups_created_by_user_id",
            "ix_appointment_groups_appointment_date",
            "ix_appointment_groups_store_id",
            "ix_appointment_groups_host_appointment_id",
            "ix_appointment_groups_group_code",
            "ix_appointment_groups_id",
        ]:
            if idx_name in indexes:
                op.drop_index(idx_name, table_name="appointment_groups")
        op.drop_table("appointment_groups")

    if "appointments" in table_names:
        indexes = {idx["name"] for idx in inspector.get_indexes("appointments")}
        if "ix_appointments_payment_status" in indexes:
            op.drop_index("ix_appointments_payment_status", table_name="appointments")
        if "ix_appointments_group_id" in indexes:
            op.drop_index("ix_appointments_group_id", table_name="appointments")

        columns = {col["name"] for col in inspector.get_columns("appointments")}
        if "paid_amount" in columns:
            op.drop_column("appointments", "paid_amount")
        if "payment_status" in columns:
            op.drop_column("appointments", "payment_status")
        if "is_group_host" in columns:
            op.drop_column("appointments", "is_group_host")
        if "group_id" in columns:
            op.drop_column("appointments", "group_id")
