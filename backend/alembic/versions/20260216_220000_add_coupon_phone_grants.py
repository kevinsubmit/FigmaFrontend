"""add coupon phone grants table

Revision ID: 20260216_220000
Revises: 20260214_140000
Create Date: 2026-02-16 22:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260216_220000"
down_revision = "20260214_140000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    if "coupon_phone_grants" not in table_names:
        op.create_table(
            "coupon_phone_grants",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("coupon_id", sa.Integer(), nullable=False),
            sa.Column("phone", sa.String(length=20), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
            sa.Column("note", sa.String(length=255), nullable=True),
            sa.Column("granted_by_user_id", sa.Integer(), nullable=True),
            sa.Column("granted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("claim_expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("claimed_user_id", sa.Integer(), nullable=True),
            sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("user_coupon_id", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(["claimed_user_id"], ["backend_users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["coupon_id"], ["coupons.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["granted_by_user_id"], ["backend_users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["user_coupon_id"], ["user_coupons.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )

    inspector = sa.inspect(bind)
    indexes = {idx["name"] for idx in inspector.get_indexes("coupon_phone_grants")}
    if "ix_coupon_phone_grants_id" not in indexes:
        op.create_index("ix_coupon_phone_grants_id", "coupon_phone_grants", ["id"], unique=False)
    if "ix_coupon_phone_grants_coupon_id" not in indexes:
        op.create_index("ix_coupon_phone_grants_coupon_id", "coupon_phone_grants", ["coupon_id"], unique=False)
    if "ix_coupon_phone_grants_phone" not in indexes:
        op.create_index("ix_coupon_phone_grants_phone", "coupon_phone_grants", ["phone"], unique=False)
    if "ix_coupon_phone_grants_status" not in indexes:
        op.create_index("ix_coupon_phone_grants_status", "coupon_phone_grants", ["status"], unique=False)
    if "ix_coupon_phone_grants_granted_by_user_id" not in indexes:
        op.create_index("ix_coupon_phone_grants_granted_by_user_id", "coupon_phone_grants", ["granted_by_user_id"], unique=False)
    if "ix_coupon_phone_grants_claim_expires_at" not in indexes:
        op.create_index("ix_coupon_phone_grants_claim_expires_at", "coupon_phone_grants", ["claim_expires_at"], unique=False)
    if "ix_coupon_phone_grants_claimed_user_id" not in indexes:
        op.create_index("ix_coupon_phone_grants_claimed_user_id", "coupon_phone_grants", ["claimed_user_id"], unique=False)
    if "ix_coupon_phone_grants_user_coupon_id" not in indexes:
        op.create_index("ix_coupon_phone_grants_user_coupon_id", "coupon_phone_grants", ["user_coupon_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "coupon_phone_grants" not in table_names:
        return

    indexes = {idx["name"] for idx in inspector.get_indexes("coupon_phone_grants")}
    for idx in [
        "ix_coupon_phone_grants_user_coupon_id",
        "ix_coupon_phone_grants_claimed_user_id",
        "ix_coupon_phone_grants_claim_expires_at",
        "ix_coupon_phone_grants_granted_by_user_id",
        "ix_coupon_phone_grants_status",
        "ix_coupon_phone_grants_phone",
        "ix_coupon_phone_grants_coupon_id",
        "ix_coupon_phone_grants_id",
    ]:
        if idx in indexes:
            op.drop_index(idx, table_name="coupon_phone_grants")

    op.drop_table("coupon_phone_grants")
