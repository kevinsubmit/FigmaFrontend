"""
Appointment settlement idempotency/audit event model
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, func, UniqueConstraint
from app.db.session import Base


class AppointmentSettlementEvent(Base):
    """Settlement and refund events for idempotency and audit trail."""
    __tablename__ = "appointment_settlement_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    appointment_id = Column(Integer, nullable=False, index=True)
    event_type = Column(String(20), nullable=False, index=True)  # settle / refund
    idempotency_key = Column(String(80), nullable=False, index=True)
    payload_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("appointment_id", "event_type", "idempotency_key", name="uq_appointment_settlement_idem"),
    )

