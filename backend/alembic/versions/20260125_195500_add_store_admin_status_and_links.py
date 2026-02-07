"""add store admin status and application links

Revision ID: 20260125_195500
Revises: 20260125_190500
Create Date: 2026-01-25 19:55:00
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260125_195500'
down_revision = '20260125_190500'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'backend_users',
        sa.Column('store_admin_status', sa.String(length=20), nullable=False, server_default='approved')
    )
    op.create_index('ix_backend_users_store_admin_status', 'backend_users', ['store_admin_status'])

    op.add_column('store_admin_applications', sa.Column('user_id', sa.Integer(), nullable=True))
    op.add_column('store_admin_applications', sa.Column('store_id', sa.Integer(), nullable=True))
    op.create_index('ix_store_admin_applications_user_id', 'store_admin_applications', ['user_id'])
    op.create_index('ix_store_admin_applications_store_id', 'store_admin_applications', ['store_id'])


def downgrade() -> None:
    op.drop_index('ix_store_admin_applications_store_id', table_name='store_admin_applications')
    op.drop_index('ix_store_admin_applications_user_id', table_name='store_admin_applications')
    op.drop_column('store_admin_applications', 'store_id')
    op.drop_column('store_admin_applications', 'user_id')

    op.drop_index('ix_backend_users_store_admin_status', table_name='backend_users')
    op.drop_column('backend_users', 'store_admin_status')
