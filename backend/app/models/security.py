"""
Security models for IP/CIDR access control
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, func

from app.db.session import Base


class SecurityIPRule(Base):
    __tablename__ = "security_ip_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_type = Column(String(10), nullable=False, index=True)  # allow | deny
    target_type = Column(String(10), nullable=False, index=True)  # ip | cidr
    target_value = Column(String(64), nullable=False, index=True)
    scope = Column(String(20), nullable=False, default="admin_api", index=True)  # admin_api | admin_login | all
    status = Column(String(10), nullable=False, default="active", index=True)  # active | inactive
    priority = Column(Integer, nullable=False, default=100, index=True)
    reason = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)
    created_by = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class SecurityBlockLog(Base):
    __tablename__ = "security_block_logs"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(64), nullable=False, index=True)
    path = Column(String(255), nullable=False, index=True)
    method = Column(String(16), nullable=False, index=True)
    scope = Column(String(20), nullable=False, index=True)
    matched_rule_id = Column(Integer, nullable=True, index=True)
    block_reason = Column(String(32), nullable=False, index=True)  # ip_deny | rate_limit | auth_fail_limit
    user_id = Column(Integer, nullable=True, index=True)
    user_agent = Column(Text, nullable=True)
    meta_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
