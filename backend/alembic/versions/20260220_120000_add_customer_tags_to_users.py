"""add customer tags to users

Revision ID: 20260220_120000
Revises: 20260219_010000
Create Date: 2026-02-20 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260220_120000"
down_revision = "20260219_010000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("backend_users", sa.Column("customer_tags", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("backend_users", "customer_tags")
