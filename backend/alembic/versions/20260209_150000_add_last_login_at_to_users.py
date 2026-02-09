"""add last_login_at to backend_users

Revision ID: 20260209_150000
Revises: 20260209_130000
Create Date: 2026-02-09 15:00:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260209_150000"
down_revision = "20260209_130000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("backend_users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_backend_users_last_login_at", "backend_users", ["last_login_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_backend_users_last_login_at", table_name="backend_users")
    op.drop_column("backend_users", "last_login_at")
