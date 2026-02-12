"""add service_id to appointment staff splits

Revision ID: 20260211_004000
Revises: 20260211_003000
Create Date: 2026-02-11 04:00:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260211_004000"
down_revision = "20260211_003000"
branch_labels = None
depends_on = None



def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "appointment_staff_splits" not in table_names:
        return

    columns = {col["name"] for col in inspector.get_columns("appointment_staff_splits")}
    if "service_id" not in columns:
        op.add_column("appointment_staff_splits", sa.Column("service_id", sa.Integer(), nullable=True))

    inspector = sa.inspect(bind)
    indexes = {idx["name"] for idx in inspector.get_indexes("appointment_staff_splits")}
    if "ix_appointment_staff_splits_service_id" not in indexes:
        op.create_index(
            "ix_appointment_staff_splits_service_id",
            "appointment_staff_splits",
            ["service_id"],
            unique=False,
        )

    fks = {fk["name"] for fk in inspector.get_foreign_keys("appointment_staff_splits") if fk.get("name")}
    if "fk_appointment_staff_splits_service_id" not in fks:
        try:
            op.create_foreign_key(
                "fk_appointment_staff_splits_service_id",
                "appointment_staff_splits",
                "services",
                ["service_id"],
                ["id"],
                ondelete="RESTRICT",
            )
        except Exception:
            # Some dialects (e.g. sqlite) may not support adding FK constraints directly.
            pass



def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "appointment_staff_splits" not in table_names:
        return

    indexes = {idx["name"] for idx in inspector.get_indexes("appointment_staff_splits")}
    if "ix_appointment_staff_splits_service_id" in indexes:
        op.drop_index("ix_appointment_staff_splits_service_id", table_name="appointment_staff_splits")

    fks = {fk["name"] for fk in inspector.get_foreign_keys("appointment_staff_splits") if fk.get("name")}
    if "fk_appointment_staff_splits_service_id" in fks:
        try:
            op.drop_constraint("fk_appointment_staff_splits_service_id", "appointment_staff_splits", type_="foreignkey")
        except Exception:
            pass

    columns = {col["name"] for col in inspector.get_columns("appointment_staff_splits")}
    if "service_id" in columns:
        op.drop_column("appointment_staff_splits", "service_id")
