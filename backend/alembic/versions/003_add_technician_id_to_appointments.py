"""add technician_id to appointments (placeholder)

Revision ID: 003_add_technician_id_to_appointments
Revises: e2286eeaf919
Create Date: 2026-01-04 02:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003_add_technician_id_to_appointments'
down_revision = 'e2286eeaf919'
branch_labels = None
depends_on = None


def upgrade():
    # Column already exists in current DB; keep as no-op to repair revision chain.
    pass


def downgrade():
    pass
