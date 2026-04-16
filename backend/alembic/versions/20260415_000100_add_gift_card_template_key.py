"""add gift card template key

Revision ID: 20260415_000100
Revises: 20260405_000200
Create Date: 2026-04-15 00:01:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260415_000100"
down_revision = "20260405_000200"
branch_labels = None
depends_on = None


DEFAULT_TEMPLATE_KEY = "minimal_gold"


def upgrade() -> None:
    op.add_column(
        "gift_cards",
        sa.Column(
            "template_key",
            sa.String(length=64),
            nullable=False,
            server_default=DEFAULT_TEMPLATE_KEY,
        ),
    )


def downgrade() -> None:
    op.drop_column("gift_cards", "template_key")
