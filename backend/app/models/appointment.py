"""
Appointment Model
"""
from sqlalchemy import Column, Integer, String, Date, Time, Text, DateTime, func, Enum
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum


class AppointmentStatus(str, enum.Enum):
    """Appointment status enum"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Appointment(Base):
    """Appointment model"""
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    store_id = Column(Integer, nullable=False, index=True)
    service_id = Column(Integer, nullable=False, index=True)
    technician_id = Column(Integer, nullable=True, index=True)  # Optional: specific technician
    appointment_date = Column(Date, nullable=False, index=True)
    appointment_time = Column(Time, nullable=False)
    status = Column(
        Enum('pending', 'confirmed', 'completed', 'cancelled', name='appointment_status'),
        default='pending',
        nullable=False,
        index=True
    )
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    review = relationship("Review", back_populates="appointment", uselist=False, cascade="all, delete-orphan")
