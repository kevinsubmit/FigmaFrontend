"""add hire_date to technicians

Revision ID: 20260210_230000
Revises: 20260210_040000
Create Date: 2026-02-10 23:00:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260210_230000"
down_revision = "20260210_040000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("technicians")}

    if "hire_date" not in columns:
        op.add_column("technicians", sa.Column("hire_date", sa.Date(), nullable=True))

    index_names = {idx["name"] for idx in inspector.get_indexes("technicians")}
    if "uq_technicians_store_name" not in index_names:
        duplicate_count = bind.execute(
            sa.text(
                """
                SELECT COUNT(1)
                FROM (
                    SELECT store_id, lower(trim(name)) AS normalized_name, COUNT(1) AS cnt
                    FROM technicians
                    GROUP BY store_id, lower(trim(name))
                    HAVING COUNT(1) > 1
                ) t
                """
            )
        ).scalar()
        if int(duplicate_count or 0) == 0:
            op.create_index("uq_technicians_store_name", "technicians", ["store_id", "name"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    index_names = {idx["name"] for idx in inspector.get_indexes("technicians")}
    if "uq_technicians_store_name" in index_names:
        op.drop_index("uq_technicians_store_name", table_name="technicians")

    columns = {col["name"] for col in inspector.get_columns("technicians")}

    if "hire_date" in columns:
        op.drop_column("technicians", "hire_date")
