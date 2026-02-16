"""add appointment settlement events table

Revision ID: 20260214_140000
Revises: 20260214_130000
Create Date: 2026-02-14 14:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260214_140000"
down_revision = "20260214_130000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    if "appointment_settlement_events" not in table_names:
        op.create_table(
            "appointment_settlement_events",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("appointment_id", sa.Integer(), nullable=False),
            sa.Column("event_type", sa.String(length=20), nullable=False),
            sa.Column("idempotency_key", sa.String(length=80), nullable=False),
            sa.Column("payload_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("appointment_id", "event_type", "idempotency_key", name="uq_appointment_settlement_idem"),
        )

    inspector = sa.inspect(bind)
    indexes = {idx["name"] for idx in inspector.get_indexes("appointment_settlement_events")}
    if "ix_appointment_settlement_events_id" not in indexes:
        op.create_index("ix_appointment_settlement_events_id", "appointment_settlement_events", ["id"], unique=False)
    if "ix_appointment_settlement_events_appointment_id" not in indexes:
        op.create_index("ix_appointment_settlement_events_appointment_id", "appointment_settlement_events", ["appointment_id"], unique=False)
    if "ix_appointment_settlement_events_event_type" not in indexes:
        op.create_index("ix_appointment_settlement_events_event_type", "appointment_settlement_events", ["event_type"], unique=False)
    if "ix_appointment_settlement_events_idempotency_key" not in indexes:
        op.create_index("ix_appointment_settlement_events_idempotency_key", "appointment_settlement_events", ["idempotency_key"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "appointment_settlement_events" not in table_names:
        return

    indexes = {idx["name"] for idx in inspector.get_indexes("appointment_settlement_events")}
    for idx in [
        "ix_appointment_settlement_events_idempotency_key",
        "ix_appointment_settlement_events_event_type",
        "ix_appointment_settlement_events_appointment_id",
        "ix_appointment_settlement_events_id",
    ]:
        if idx in indexes:
            op.drop_index(idx, table_name="appointment_settlement_events")

    op.drop_table("appointment_settlement_events")

