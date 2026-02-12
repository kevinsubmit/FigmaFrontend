"""Appointment staff split model."""
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, func

from app.db.session import Base


class AppointmentStaffSplit(Base):
    __tablename__ = "appointment_staff_splits"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, index=True)
    technician_id = Column(Integer, ForeignKey("technicians.id", ondelete="RESTRICT"), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="RESTRICT"), nullable=True, index=True)
    work_type = Column(String(100), nullable=True)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
