"""add appointment staff splits

Revision ID: 20260211_000000
Revises: 20260210_230000
Create Date: 2026-02-11 00:00:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260211_000000"
down_revision = "20260210_230000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    if "appointment_staff_splits" not in table_names:
        op.create_table(
            "appointment_staff_splits",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("appointment_id", sa.Integer(), nullable=False),
            sa.Column("technician_id", sa.Integer(), nullable=False),
            sa.Column("work_type", sa.String(length=100), nullable=True),
            sa.Column("amount", sa.Float(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["appointment_id"], ["appointments.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["technician_id"], ["technicians.id"], ondelete="RESTRICT"),
            sa.PrimaryKeyConstraint("id"),
        )

    inspector = sa.inspect(bind)
    indexes = {idx["name"] for idx in inspector.get_indexes("appointment_staff_splits")}
    if "ix_appointment_staff_splits_id" not in indexes:
        op.create_index("ix_appointment_staff_splits_id", "appointment_staff_splits", ["id"], unique=False)
    if "ix_appointment_staff_splits_appointment_id" not in indexes:
        op.create_index(
            "ix_appointment_staff_splits_appointment_id",
            "appointment_staff_splits",
            ["appointment_id"],
            unique=False,
        )
    if "ix_appointment_staff_splits_technician_id" not in indexes:
        op.create_index(
            "ix_appointment_staff_splits_technician_id",
            "appointment_staff_splits",
            ["technician_id"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "appointment_staff_splits" not in table_names:
        return

    indexes = {idx["name"] for idx in inspector.get_indexes("appointment_staff_splits")}
    if "ix_appointment_staff_splits_technician_id" in indexes:
        op.drop_index("ix_appointment_staff_splits_technician_id", table_name="appointment_staff_splits")
    if "ix_appointment_staff_splits_appointment_id" in indexes:
        op.drop_index("ix_appointment_staff_splits_appointment_id", table_name="appointment_staff_splits")
    if "ix_appointment_staff_splits_id" in indexes:
        op.drop_index("ix_appointment_staff_splits_id", table_name="appointment_staff_splits")
    op.drop_table("appointment_staff_splits")
