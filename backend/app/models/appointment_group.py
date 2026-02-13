"""Appointment group model for host+guest bookings."""
from sqlalchemy import Column, Integer, String, Date, Time, DateTime, func

from app.db.session import Base


class AppointmentGroup(Base):
    __tablename__ = "appointment_groups"

    id = Column(Integer, primary_key=True, index=True)
    group_code = Column(String(32), unique=True, nullable=True, index=True)
    host_appointment_id = Column(Integer, nullable=False, index=True)
    store_id = Column(Integer, nullable=False, index=True)
    appointment_date = Column(Date, nullable=False, index=True)
    appointment_time = Column(Time, nullable=False)
    created_by_user_id = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
