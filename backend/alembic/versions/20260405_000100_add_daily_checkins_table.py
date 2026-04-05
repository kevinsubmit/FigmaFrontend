"""add daily checkins table

Revision ID: 20260405_000100
Revises: 20260322_000100
Create Date: 2026-04-05 10:00:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = '20260405_000100'
down_revision = '20260322_000100'
branch_labels = None
depends_on = None


TABLE_NAME = 'daily_checkins'
UNIQUE_NAME = 'uq_daily_checkins_user_date'
INDEX_NAMES = (
    'ix_daily_checkins_user_id',
    'ix_daily_checkins_checkin_date',
)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if TABLE_NAME in inspector.get_table_names():
        return

    op.create_table(
        TABLE_NAME,
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('backend_users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('checkin_date', sa.Date(), nullable=False),
        sa.Column('points_awarded', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.UniqueConstraint('user_id', 'checkin_date', name=UNIQUE_NAME),
    )
    op.create_index(INDEX_NAMES[0], TABLE_NAME, ['user_id'])
    op.create_index(INDEX_NAMES[1], TABLE_NAME, ['checkin_date'])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if TABLE_NAME not in inspector.get_table_names():
        return

    existing_indexes = {idx['name'] for idx in inspector.get_indexes(TABLE_NAME)}
    for index_name in INDEX_NAMES:
        if index_name in existing_indexes:
            op.drop_index(index_name, table_name=TABLE_NAME)

    existing_uniques = {item['name'] for item in inspector.get_unique_constraints(TABLE_NAME)}
    if UNIQUE_NAME in existing_uniques:
        op.drop_constraint(UNIQUE_NAME, TABLE_NAME, type_='unique')

    op.drop_table(TABLE_NAME)
