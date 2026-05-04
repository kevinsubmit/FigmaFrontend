"""add appointment booking source

Revision ID: 20260503_000100
Revises: 20260415_000100
Create Date: 2026-05-03 00:01:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260503_000100"
down_revision = "20260415_000100"
branch_labels = None
depends_on = None


DEFAULT_BOOKING_SOURCE = "customer_app"


def upgrade() -> None:
    op.add_column(
        "appointments",
        sa.Column(
            "booking_source",
            sa.String(length=32),
            nullable=False,
            server_default=DEFAULT_BOOKING_SOURCE,
        ),
    )
    op.create_index(
        "ix_appointments_booking_source",
        "appointments",
        ["booking_source"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_appointments_booking_source", table_name="appointments")
    op.drop_column("appointments", "booking_source")
