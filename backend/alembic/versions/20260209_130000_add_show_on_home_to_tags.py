"""add show_on_home to tags

Revision ID: 20260209_130000
Revises: 20260209_120000
Create Date: 2026-02-09 13:00:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260209_130000"
down_revision = "20260209_120000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c["name"] for c in inspector.get_columns("tags")}
    if "show_on_home" not in cols:
        op.add_column("tags", sa.Column("show_on_home", sa.Boolean(), nullable=False, server_default=sa.true()))

    idx = {i["name"] for i in inspector.get_indexes("tags")}
    if "ix_tags_show_on_home" not in idx:
        op.create_index("ix_tags_show_on_home", "tags", ["show_on_home"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    idx = {i["name"] for i in inspector.get_indexes("tags")}
    if "ix_tags_show_on_home" in idx:
        op.drop_index("ix_tags_show_on_home", table_name="tags")

    cols = {c["name"] for c in inspector.get_columns("tags")}
    if "show_on_home" in cols:
        op.drop_column("tags", "show_on_home")
