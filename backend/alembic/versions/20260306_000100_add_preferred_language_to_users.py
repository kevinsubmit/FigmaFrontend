"""add preferred_language to backend_users

Revision ID: 20260306_000100
Revises: 20260303_000100
Create Date: 2026-03-06 00:01:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260306_000100"
down_revision = "20260303_000100"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("backend_users")}
    if "preferred_language" not in columns:
        op.add_column(
            "backend_users",
            sa.Column(
                "preferred_language",
                sa.String(length=8),
                nullable=False,
                server_default=sa.text("'en'"),
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("backend_users")}
    if "preferred_language" in columns:
        op.drop_column("backend_users", "preferred_language")
