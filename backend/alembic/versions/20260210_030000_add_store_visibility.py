"""add store visibility

Revision ID: 20260210_030000
Revises: 20260210_020000
Create Date: 2026-02-10 03:00:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260210_030000"
down_revision = "20260210_020000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("stores")}
    if "is_visible" not in columns:
        op.add_column(
            "stores",
            sa.Column("is_visible", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        )
        op.execute("UPDATE stores SET is_visible = 1 WHERE is_visible IS NULL")

    index_names = {idx["name"] for idx in inspector.get_indexes("stores")}
    if "ix_stores_is_visible" not in index_names:
        op.create_index("ix_stores_is_visible", "stores", ["is_visible"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    index_names = {idx["name"] for idx in inspector.get_indexes("stores")}
    if "ix_stores_is_visible" in index_names:
        op.drop_index("ix_stores_is_visible", table_name="stores")
    columns = {col["name"] for col in inspector.get_columns("stores")}
    if "is_visible" in columns:
        op.drop_column("stores", "is_visible")
