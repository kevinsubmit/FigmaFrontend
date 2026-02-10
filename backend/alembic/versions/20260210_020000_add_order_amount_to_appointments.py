"""add order_amount to appointments

Revision ID: 20260210_020000
Revises: 20260210_000000
Create Date: 2026-02-10 02:00:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260210_020000"
down_revision = "20260210_000000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("appointments", sa.Column("order_amount", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("appointments", "order_amount")

