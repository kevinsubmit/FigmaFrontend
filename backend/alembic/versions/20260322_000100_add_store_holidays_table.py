"""add store holidays table

Revision ID: 20260322_000100
Revises: 20260319_000200
Create Date: 2026-03-22 00:05:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '20260322_000100'
down_revision = '20260319_000200'
branch_labels = None
depends_on = None


TABLE_NAME = 'store_holidays'


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if TABLE_NAME in inspector.get_table_names():
        return

    op.create_table(
        TABLE_NAME,
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('store_id', sa.Integer(), sa.ForeignKey('stores.id', ondelete='CASCADE'), nullable=False),
        sa.Column('holiday_date', sa.Date(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
    )
    op.create_index('ix_store_holidays_store_id', TABLE_NAME, ['store_id'])
    op.create_index('ix_store_holidays_holiday_date', TABLE_NAME, ['holiday_date'])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if TABLE_NAME not in inspector.get_table_names():
        return

    for index_name in ('ix_store_holidays_holiday_date', 'ix_store_holidays_store_id'):
        if index_name in {idx['name'] for idx in inspector.get_indexes(TABLE_NAME)}:
            op.drop_index(index_name, table_name=TABLE_NAME)
    op.drop_table(TABLE_NAME)
