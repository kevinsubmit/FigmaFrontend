"""Appointment service item model."""

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, func

from app.db.session import Base


class AppointmentServiceItem(Base):
    __tablename__ = "appointment_service_items"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="RESTRICT"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    is_primary = Column(Boolean, nullable=False, default=False, index=True)
    created_by = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
