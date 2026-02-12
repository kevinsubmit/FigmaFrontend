"""
Technician Model
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, func
from sqlalchemy.orm import relationship
from app.db.session import Base


class Technician(Base):
    """Technician (Nail Artist) model"""
    __tablename__ = "technicians"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    phone = Column(String(20))
    email = Column(String(255))
    bio = Column(Text)
    specialties = Column(Text)  # Comma-separated specialties
    years_of_experience = Column(Integer)
    hire_date = Column(Date, nullable=True)
    avatar_url = Column(String(500))
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    unavailable_periods = relationship("TechnicianUnavailable", back_populates="technician", cascade="all, delete-orphan")
