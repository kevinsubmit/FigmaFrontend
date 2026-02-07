"""relax store admin application fields

Revision ID: 20260125_190500
Revises: 20260125_184500
Create Date: 2026-01-25 19:05:00
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260125_190500'
down_revision = '20260125_184500'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index('ix_store_admin_applications_reviewed_by', table_name='store_admin_applications')
    op.drop_index('ix_store_admin_applications_status', table_name='store_admin_applications')
    op.drop_index('ix_store_admin_applications_phone', table_name='store_admin_applications')
    op.drop_table('store_admin_applications')

    op.create_table(
        'store_admin_applications',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('full_name', sa.String(length=200), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=True),
        sa.Column('store_name', sa.String(length=200), nullable=False),
        sa.Column('store_address', sa.String(length=500), nullable=True),
        sa.Column('store_phone', sa.String(length=20), nullable=True),
        sa.Column('opening_hours', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('review_reason', sa.Text(), nullable=True),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_store_admin_applications_phone', 'store_admin_applications', ['phone'])
    op.create_index('ix_store_admin_applications_status', 'store_admin_applications', ['status'])
    op.create_index('ix_store_admin_applications_reviewed_by', 'store_admin_applications', ['reviewed_by'])


def downgrade() -> None:
    op.drop_index('ix_store_admin_applications_reviewed_by', table_name='store_admin_applications')
    op.drop_index('ix_store_admin_applications_status', table_name='store_admin_applications')
    op.drop_index('ix_store_admin_applications_phone', table_name='store_admin_applications')
    op.drop_table('store_admin_applications')

    op.create_table(
        'store_admin_applications',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('full_name', sa.String(length=200), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('store_name', sa.String(length=200), nullable=False),
        sa.Column('store_address', sa.String(length=500), nullable=False),
        sa.Column('store_phone', sa.String(length=20), nullable=False),
        sa.Column('opening_hours', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('review_reason', sa.Text(), nullable=True),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_store_admin_applications_phone', 'store_admin_applications', ['phone'])
    op.create_index('ix_store_admin_applications_status', 'store_admin_applications', ['status'])
    op.create_index('ix_store_admin_applications_reviewed_by', 'store_admin_applications', ['reviewed_by'])
