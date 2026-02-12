"""add service commission amount

Revision ID: 20260211_003000
Revises: 20260211_000000
Create Date: 2026-02-11 00:30:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260211_003000"
down_revision = "20260211_000000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("services")}

    if "commission_amount" not in columns:
        op.add_column(
            "services",
            sa.Column("commission_amount", sa.Float(), nullable=False, server_default=sa.text("0")),
        )
        op.execute("UPDATE services SET commission_amount = 0 WHERE commission_amount IS NULL")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("services")}

    if "commission_amount" in columns:
        op.drop_column("services", "commission_amount")
