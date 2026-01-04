"""add store hours table

Revision ID: 004_store_hours
Revises: 003_add_technician_id_to_appointments
Create Date: 2026-01-04 04:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004_store_hours'
down_revision = '003_add_technician_id_to_appointments'
branch_labels = None
depends_on = None


def upgrade():
    # Create store_hours table
    op.create_table(
        'store_hours',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('store_id', sa.Integer(), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.Column('open_time', sa.Time(), nullable=True),
        sa.Column('close_time', sa.Time(), nullable=True),
        sa.Column('is_closed', sa.Boolean(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_store_hours_store_id', 'store_hours', ['store_id'])


def downgrade():
    op.drop_index('ix_store_hours_store_id', table_name='store_hours')
    op.drop_table('store_hours')
