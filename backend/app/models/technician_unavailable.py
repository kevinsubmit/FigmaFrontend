"""
Technician Unavailable Model
"""
from sqlalchemy import Column, Integer, Date, Time, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class TechnicianUnavailable(Base):
    """Technician unavailable time periods (vacation, sick leave, etc.)"""
    __tablename__ = "technician_unavailable"
    
    id = Column(Integer, primary_key=True, index=True)
    technician_id = Column(Integer, ForeignKey("technicians.id", ondelete="CASCADE"), nullable=False, index=True)
    start_date = Column(Date, nullable=False, comment="Start date of unavailable period")
    end_date = Column(Date, nullable=False, comment="End date of unavailable period (inclusive)")
    start_time = Column(Time, nullable=True, comment="Start time (optional, for partial day unavailability)")
    end_time = Column(Time, nullable=True, comment="End time (optional, for partial day unavailability)")
    reason = Column(String(200), nullable=True, comment="Reason for unavailability (vacation, sick leave, etc.)")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    technician = relationship("Technician", back_populates="unavailable_periods")
