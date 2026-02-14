"""add completed_at to appointments

Revision ID: 20260214_110000
Revises: 20260213_210000
Create Date: 2026-02-14 11:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260214_110000"
down_revision = "20260213_210000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "appointments" not in table_names:
        return

    columns = {col["name"] for col in inspector.get_columns("appointments")}
    if "completed_at" not in columns:
        op.add_column("appointments", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))

    inspector = sa.inspect(bind)
    indexes = {idx["name"] for idx in inspector.get_indexes("appointments")}
    if "ix_appointments_completed_at" not in indexes:
        op.create_index("ix_appointments_completed_at", "appointments", ["completed_at"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "appointments" not in table_names:
        return

    indexes = {idx["name"] for idx in inspector.get_indexes("appointments")}
    if "ix_appointments_completed_at" in indexes:
        op.drop_index("ix_appointments_completed_at", table_name="appointments")

    columns = {col["name"] for col in inspector.get_columns("appointments")}
    if "completed_at" in columns:
        op.drop_column("appointments", "completed_at")

