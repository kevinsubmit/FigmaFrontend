"""
VIP level configuration model
"""
from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean, func
from app.db.session import Base


class VIPLevelConfig(Base):
    __tablename__ = "vip_level_configs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    level = Column(Integer, nullable=False, unique=True, index=True)
    min_spend = Column(Float, nullable=False, default=0)
    min_visits = Column(Integer, nullable=False, default=0)
    benefit = Column(String(255), nullable=False, default="")
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
