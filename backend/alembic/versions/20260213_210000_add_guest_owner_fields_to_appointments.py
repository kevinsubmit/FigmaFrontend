"""add guest owner fields to appointments

Revision ID: 20260213_210000
Revises: 20260212_010000
Create Date: 2026-02-13 21:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "20260213_210000"
down_revision = "20260212_010000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("appointments")}

    with op.batch_alter_table("appointments") as batch_op:
        if "booked_by_user_id" not in columns:
            batch_op.add_column(sa.Column("booked_by_user_id", sa.Integer(), nullable=True))
        if "guest_name" not in columns:
            batch_op.add_column(sa.Column("guest_name", sa.String(length=120), nullable=True))
        if "guest_phone" not in columns:
            batch_op.add_column(sa.Column("guest_phone", sa.String(length=20), nullable=True))

    indexes = {idx["name"] for idx in inspector.get_indexes("appointments")}
    if "ix_appointments_booked_by_user_id" not in indexes:
        op.create_index("ix_appointments_booked_by_user_id", "appointments", ["booked_by_user_id"], unique=False)
    if "ix_appointments_guest_phone" not in indexes:
        op.create_index("ix_appointments_guest_phone", "appointments", ["guest_phone"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    indexes = {idx["name"] for idx in inspector.get_indexes("appointments")}
    if "ix_appointments_guest_phone" in indexes:
        op.drop_index("ix_appointments_guest_phone", table_name="appointments")
    if "ix_appointments_booked_by_user_id" in indexes:
        op.drop_index("ix_appointments_booked_by_user_id", table_name="appointments")

    columns = {col["name"] for col in inspector.get_columns("appointments")}
    with op.batch_alter_table("appointments") as batch_op:
        if "guest_phone" in columns:
            batch_op.drop_column("guest_phone")
        if "guest_name" in columns:
            batch_op.drop_column("guest_name")
        if "booked_by_user_id" in columns:
            batch_op.drop_column("booked_by_user_id")

