"""
Service catalog model
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, func
from app.db.session import Base


class ServiceCatalog(Base):
    """Platform-level service template maintained by super admin"""

    __tablename__ = "service_catalog"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=True, index=True)
    description = Column(Text, nullable=True)
    default_duration_minutes = Column(Integer, nullable=True)
    is_active = Column(Integer, default=1, nullable=False, index=True)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
