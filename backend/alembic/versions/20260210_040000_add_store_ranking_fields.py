"""add store ranking fields

Revision ID: 20260210_040000
Revises: 20260210_030000
Create Date: 2026-02-10 04:00:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260210_040000"
down_revision = "20260210_030000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("stores")}

    if "manual_rank" not in columns:
        op.add_column("stores", sa.Column("manual_rank", sa.Integer(), nullable=True))
    if "boost_score" not in columns:
        op.add_column("stores", sa.Column("boost_score", sa.Float(), nullable=False, server_default=sa.text("0")))
        op.execute("UPDATE stores SET boost_score = 0 WHERE boost_score IS NULL")
    if "featured_until" not in columns:
        op.add_column("stores", sa.Column("featured_until", sa.DateTime(timezone=True), nullable=True))

    index_names = {idx["name"] for idx in inspector.get_indexes("stores")}
    if "ix_stores_manual_rank" not in index_names:
        op.create_index("ix_stores_manual_rank", "stores", ["manual_rank"], unique=False)
    if "ix_stores_featured_until" not in index_names:
        op.create_index("ix_stores_featured_until", "stores", ["featured_until"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    index_names = {idx["name"] for idx in inspector.get_indexes("stores")}
    if "ix_stores_featured_until" in index_names:
        op.drop_index("ix_stores_featured_until", table_name="stores")
    if "ix_stores_manual_rank" in index_names:
        op.drop_index("ix_stores_manual_rank", table_name="stores")

    columns = {col["name"] for col in inspector.get_columns("stores")}
    if "featured_until" in columns:
        op.drop_column("stores", "featured_until")
    if "boost_score" in columns:
        op.drop_column("stores", "boost_score")
    if "manual_rank" in columns:
        op.drop_column("stores", "manual_rank")

