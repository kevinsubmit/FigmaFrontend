"""
Push device token model
Stores mobile push tokens (APNs) per user/device.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.db.session import Base


class PushDeviceToken(Base):
    """Mobile push token registry."""

    __tablename__ = "push_device_tokens"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("backend_users.id", ondelete="CASCADE"), nullable=False, index=True)
    platform = Column(String(20), nullable=False, default="ios", index=True)
    device_token = Column(String(255), nullable=False, unique=True, index=True)
    apns_environment = Column(String(20), nullable=False, default="sandbox", index=True)
    app_version = Column(String(50), nullable=True)
    device_name = Column(String(120), nullable=True)
    locale = Column(String(32), nullable=True)
    timezone = Column(String(64), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<PushDeviceToken(id={self.id}, user_id={self.user_id}, platform={self.platform}, active={self.is_active})>"
