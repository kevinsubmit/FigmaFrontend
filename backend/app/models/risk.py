"""
Risk control models
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, func
from app.db.session import Base


class UserRiskState(Base):
    """Aggregated risk state per user."""
    __tablename__ = "user_risk_states"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, unique=True, index=True)
    risk_level = Column(String(20), nullable=False, default="normal", index=True)
    restricted_until = Column(DateTime(timezone=True), nullable=True, index=True)
    cancel_7d = Column(Integer, nullable=False, default=0)
    no_show_30d = Column(Integer, nullable=False, default=0)
    manual_note = Column(Text, nullable=True)
    updated_by = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now(), nullable=False)


class RiskEvent(Base):
    """Risk/audit events used for rate-limit and security analysis."""
    __tablename__ = "risk_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    appointment_id = Column(Integer, nullable=True, index=True)
    ip_address = Column(String(64), nullable=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    reason = Column(String(255), nullable=True)
    meta_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
