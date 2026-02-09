"""extend pins for home feed admin

Revision ID: 20260209_103000
Revises: 20260208_183000
Create Date: 2026-02-09 10:30:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260209_103000"
down_revision = "20260208_183000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    pin_columns = {c["name"] for c in inspector.get_columns("pins")}
    if "status" not in pin_columns:
        op.add_column("pins", sa.Column("status", sa.String(length=20), nullable=False, server_default="published"))
    if "sort_order" not in pin_columns:
        op.add_column("pins", sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"))
    if "is_deleted" not in pin_columns:
        op.add_column("pins", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()))
    if "updated_at" not in pin_columns:
        op.add_column("pins", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))
        op.execute("UPDATE pins SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL")

    pin_indexes = {idx["name"] for idx in inspector.get_indexes("pins")}
    if "ix_pins_status" not in pin_indexes:
        op.create_index("ix_pins_status", "pins", ["status"], unique=False)
    if "ix_pins_sort_order" not in pin_indexes:
        op.create_index("ix_pins_sort_order", "pins", ["sort_order"], unique=False)
    if "ix_pins_is_deleted" not in pin_indexes:
        op.create_index("ix_pins_is_deleted", "pins", ["is_deleted"], unique=False)

    tag_columns = {c["name"] for c in inspector.get_columns("tags")}
    if "is_active" not in tag_columns:
        op.add_column("tags", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
    if "sort_order" not in tag_columns:
        op.add_column("tags", sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"))
    if "updated_at" not in tag_columns:
        op.add_column("tags", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))
        op.execute("UPDATE tags SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL")

    tag_indexes = {idx["name"] for idx in inspector.get_indexes("tags")}
    if "ix_tags_is_active" not in tag_indexes:
        op.create_index("ix_tags_is_active", "tags", ["is_active"], unique=False)
    if "ix_tags_sort_order" not in tag_indexes:
        op.create_index("ix_tags_sort_order", "tags", ["sort_order"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_tags_sort_order", table_name="tags")
    op.drop_index("ix_tags_is_active", table_name="tags")
    op.drop_column("tags", "updated_at")
    op.drop_column("tags", "sort_order")
    op.drop_column("tags", "is_active")

    op.drop_index("ix_pins_is_deleted", table_name="pins")
    op.drop_index("ix_pins_sort_order", table_name="pins")
    op.drop_index("ix_pins_status", table_name="pins")
    op.drop_column("pins", "updated_at")
    op.drop_column("pins", "is_deleted")
    op.drop_column("pins", "sort_order")
    op.drop_column("pins", "status")
