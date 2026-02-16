"""add appointment settlement fields

Revision ID: 20260214_130000
Revises: 20260214_110000
Create Date: 2026-02-14 13:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260214_130000"
down_revision = "20260214_110000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "appointments" not in table_names:
        return

    columns = {col["name"] for col in inspector.get_columns("appointments")}

    if "original_amount" not in columns:
        op.add_column("appointments", sa.Column("original_amount", sa.Float(), nullable=True))
    if "coupon_discount_amount" not in columns:
        op.add_column("appointments", sa.Column("coupon_discount_amount", sa.Float(), nullable=False, server_default="0"))
    if "gift_card_used_amount" not in columns:
        op.add_column("appointments", sa.Column("gift_card_used_amount", sa.Float(), nullable=False, server_default="0"))
    if "cash_paid_amount" not in columns:
        op.add_column("appointments", sa.Column("cash_paid_amount", sa.Float(), nullable=False, server_default="0"))
    if "final_paid_amount" not in columns:
        op.add_column("appointments", sa.Column("final_paid_amount", sa.Float(), nullable=False, server_default="0"))
    if "points_earned" not in columns:
        op.add_column("appointments", sa.Column("points_earned", sa.Integer(), nullable=False, server_default="0"))
    if "points_reverted" not in columns:
        op.add_column("appointments", sa.Column("points_reverted", sa.Integer(), nullable=False, server_default="0"))
    if "settlement_status" not in columns:
        op.add_column("appointments", sa.Column("settlement_status", sa.String(length=20), nullable=False, server_default="unsettled"))
    if "settled_at" not in columns:
        op.add_column("appointments", sa.Column("settled_at", sa.DateTime(timezone=True), nullable=True))

    # Backfill original_amount from existing order_amount for old data.
    op.execute("UPDATE appointments SET original_amount = order_amount WHERE original_amount IS NULL AND order_amount IS NOT NULL")

    inspector = sa.inspect(bind)
    indexes = {idx["name"] for idx in inspector.get_indexes("appointments")}
    if "ix_appointments_settlement_status" not in indexes:
        op.create_index("ix_appointments_settlement_status", "appointments", ["settlement_status"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "appointments" not in table_names:
        return

    indexes = {idx["name"] for idx in inspector.get_indexes("appointments")}
    if "ix_appointments_settlement_status" in indexes:
        op.drop_index("ix_appointments_settlement_status", table_name="appointments")

    columns = {col["name"] for col in inspector.get_columns("appointments")}
    for name in [
        "settled_at",
        "settlement_status",
        "points_reverted",
        "points_earned",
        "final_paid_amount",
        "cash_paid_amount",
        "gift_card_used_amount",
        "coupon_discount_amount",
        "original_amount",
    ]:
        if name in columns:
            op.drop_column("appointments", name)

