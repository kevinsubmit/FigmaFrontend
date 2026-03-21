"""add hot query composite indexes

Revision ID: 20260319_000100
Revises: 20260306_010000
Create Date: 2026-03-19 00:01:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260319_000100"
down_revision = "20260306_010000"
branch_labels = None
depends_on = None


INDEX_DEFINITIONS = (
    (
        "appointments",
        "ix_appointments_user_status_schedule",
        ["user_id", "status", "appointment_date", "appointment_time"],
    ),
    (
        "appointments",
        "ix_appointments_store_status_schedule",
        ["store_id", "status", "appointment_date", "appointment_time"],
    ),
    (
        "appointments",
        "ix_appointments_technician_status_schedule",
        ["technician_id", "status", "appointment_date", "appointment_time"],
    ),
    (
        "notifications",
        "ix_notifications_user_read_created",
        ["user_id", "is_read", "created_at"],
    ),
    (
        "appointment_reminders",
        "ix_appointment_reminders_status_scheduled",
        ["status", "scheduled_time"],
    ),
    (
        "risk_events",
        "ix_risk_events_type_user_created",
        ["event_type", "user_id", "created_at"],
    ),
    (
        "risk_events",
        "ix_risk_events_type_ip_created",
        ["event_type", "ip_address", "created_at"],
    ),
    (
        "store_hours",
        "ix_store_hours_store_day",
        ["store_id", "day_of_week"],
    ),
)


def _table_names(inspector: sa.Inspector) -> set[str]:
    return set(inspector.get_table_names())


def _index_names(inspector: sa.Inspector, table_name: str) -> set[str]:
    return {index["name"] for index in inspector.get_indexes(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = _table_names(inspector)

    for table_name, index_name, columns in INDEX_DEFINITIONS:
        if table_name not in tables:
            continue
        if index_name in _index_names(inspector, table_name):
            continue
        op.create_index(index_name, table_name, columns, unique=False)
        inspector = sa.inspect(bind)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = _table_names(inspector)

    for table_name, index_name, _columns in reversed(INDEX_DEFINITIONS):
        if table_name not in tables:
            continue
        if index_name not in _index_names(inspector, table_name):
            continue
        op.drop_index(index_name, table_name=table_name)
        inspector = sa.inspect(bind)
