"""
Service Model
"""
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, func
from app.db.session import Base


class Service(Base):
    """Service model"""
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, nullable=False, index=True)
    catalog_id = Column(Integer, nullable=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    price = Column(Float, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    category = Column(String(100), index=True)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
