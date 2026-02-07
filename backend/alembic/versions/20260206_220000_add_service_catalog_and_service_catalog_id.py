"""add service catalog and service catalog id to services

Revision ID: 20260206_220000
Revises: 20260125_195500
Create Date: 2026-02-06 22:00:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260206_220000"
down_revision = "20260125_195500"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "service_catalog",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("default_duration_minutes", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_service_catalog_id", "service_catalog", ["id"], unique=False)
    op.create_index("ix_service_catalog_name", "service_catalog", ["name"], unique=False)
    op.create_index("ix_service_catalog_category", "service_catalog", ["category"], unique=False)
    op.create_index("ix_service_catalog_is_active", "service_catalog", ["is_active"], unique=False)

    with op.batch_alter_table("services") as batch_op:
        batch_op.add_column(sa.Column("catalog_id", sa.Integer(), nullable=True))
        batch_op.create_index("ix_services_catalog_id", ["catalog_id"], unique=False)
        batch_op.create_unique_constraint(
            "uq_services_store_catalog",
            ["store_id", "catalog_id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("services") as batch_op:
        batch_op.drop_constraint("uq_services_store_catalog", type_="unique")
        batch_op.drop_index("ix_services_catalog_id")
        batch_op.drop_column("catalog_id")

    op.drop_index("ix_service_catalog_is_active", table_name="service_catalog")
    op.drop_index("ix_service_catalog_category", table_name="service_catalog")
    op.drop_index("ix_service_catalog_name", table_name="service_catalog")
    op.drop_index("ix_service_catalog_id", table_name="service_catalog")
    op.drop_table("service_catalog")
