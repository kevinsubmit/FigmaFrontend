"""add vip level configs

Revision ID: 20260218_210000
Revises: 20260216_220000_add_coupon_phone_grants
Create Date: 2026-02-18 21:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260218_210000"
down_revision = "20260216_220000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vip_level_configs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("min_spend", sa.Float(), nullable=False, server_default="0"),
        sa.Column("min_visits", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("benefit", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_vip_level_configs_id", "vip_level_configs", ["id"], unique=False)
    op.create_index("ix_vip_level_configs_level", "vip_level_configs", ["level"], unique=True)
    op.create_index("ix_vip_level_configs_is_active", "vip_level_configs", ["is_active"], unique=False)

    vip_levels = sa.table(
        "vip_level_configs",
        sa.column("level", sa.Integer),
        sa.column("min_spend", sa.Float),
        sa.column("min_visits", sa.Integer),
        sa.column("benefit", sa.String),
        sa.column("is_active", sa.Boolean),
    )
    op.bulk_insert(
        vip_levels,
        [
            {"level": 0, "min_spend": 0, "min_visits": 0, "benefit": "Member Access", "is_active": True},
            {"level": 1, "min_spend": 35, "min_visits": 1, "benefit": "Priority Service (No Waiting)", "is_active": True},
            {"level": 2, "min_spend": 2000, "min_visits": 5, "benefit": "Free Nail Care Kit", "is_active": True},
            {"level": 3, "min_spend": 5000, "min_visits": 15, "benefit": "5% Discount on Services", "is_active": True},
            {"level": 4, "min_spend": 10000, "min_visits": 30, "benefit": "10% Discount on Services", "is_active": True},
            {"level": 5, "min_spend": 20000, "min_visits": 50, "benefit": "15% Discount + Personal Assistant", "is_active": True},
            {"level": 6, "min_spend": 35000, "min_visits": 80, "benefit": "18% Discount + Birthday Gift", "is_active": True},
            {"level": 7, "min_spend": 50000, "min_visits": 120, "benefit": "20% Discount + Exclusive Events", "is_active": True},
            {"level": 8, "min_spend": 80000, "min_visits": 180, "benefit": "25% Discount + Home Service", "is_active": True},
            {"level": 9, "min_spend": 120000, "min_visits": 250, "benefit": "30% Discount + Quarterly Luxury Gift", "is_active": True},
            {"level": 10, "min_spend": 200000, "min_visits": 350, "benefit": "40% Discount + Black Card Status", "is_active": True},
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_vip_level_configs_is_active", table_name="vip_level_configs")
    op.drop_index("ix_vip_level_configs_level", table_name="vip_level_configs")
    op.drop_index("ix_vip_level_configs_id", table_name="vip_level_configs")
    op.drop_table("vip_level_configs")
