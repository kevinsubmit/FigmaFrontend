"""add home feed theme settings

Revision ID: 20260209_120000
Revises: 20260209_103000
Create Date: 2026-02-09 12:00:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260209_120000"
down_revision = "20260209_103000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "home_feed_theme_settings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("tag_id", sa.Integer(), nullable=True),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_home_feed_theme_settings_id", "home_feed_theme_settings", ["id"], unique=False)
    op.create_index("ix_home_feed_theme_settings_tag_id", "home_feed_theme_settings", ["tag_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_home_feed_theme_settings_tag_id", table_name="home_feed_theme_settings")
    op.drop_index("ix_home_feed_theme_settings_id", table_name="home_feed_theme_settings")
    op.drop_table("home_feed_theme_settings")
