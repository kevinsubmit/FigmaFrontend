"""
System log model for access/audit/security/business/error events.
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, func

from app.db.session import Base


class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True)
    log_type = Column(String(20), nullable=False, index=True)  # access | audit | security | business | error
    level = Column(String(10), nullable=False, index=True)  # info | warn | error | critical
    module = Column(String(50), nullable=True, index=True)
    action = Column(String(80), nullable=True, index=True)
    message = Column(Text, nullable=True)

    operator_user_id = Column(Integer, nullable=True, index=True)
    store_id = Column(Integer, nullable=True, index=True)
    target_type = Column(String(40), nullable=True, index=True)
    target_id = Column(String(64), nullable=True, index=True)

    request_id = Column(String(64), nullable=True, index=True)
    ip_address = Column(String(64), nullable=True, index=True)
    user_agent = Column(Text, nullable=True)
    path = Column(String(255), nullable=True, index=True)
    method = Column(String(16), nullable=True, index=True)
    status_code = Column(Integer, nullable=True, index=True)
    latency_ms = Column(Integer, nullable=True, index=True)

    before_json = Column(Text, nullable=True)
    after_json = Column(Text, nullable=True)
    meta_json = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
