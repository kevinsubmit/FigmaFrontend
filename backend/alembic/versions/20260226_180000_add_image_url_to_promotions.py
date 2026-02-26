"""add image_url to promotions

Revision ID: 20260226_180000
Revises: 20260220_120000
Create Date: 2026-02-26 18:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260226_180000"
down_revision = "20260220_120000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("promotions", sa.Column("image_url", sa.String(length=512), nullable=True))


def downgrade() -> None:
    op.drop_column("promotions", "image_url")

