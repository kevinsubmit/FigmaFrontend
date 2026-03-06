"""add time_zone to stores

Revision ID: 20260306_010000
Revises: 20260306_000100
Create Date: 2026-03-06 01:00:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260306_010000"
down_revision = "20260306_000100"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("stores")}
    if "time_zone" not in columns:
        op.add_column(
            "stores",
            sa.Column(
                "time_zone",
                sa.String(length=64),
                nullable=False,
                server_default=sa.text("'America/New_York'"),
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("stores")}
    if "time_zone" in columns:
        op.drop_column("stores", "time_zone")
