"""Support and partnership contact settings (singleton)."""
from sqlalchemy import Column, DateTime, Integer, String, func

from app.db.session import Base


class SupportContactSettings(Base):
    __tablename__ = "support_contact_settings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    singleton_key = Column(String(32), nullable=False, unique=True, index=True, default="default")
    feedback_whatsapp_url = Column(String(500), nullable=False)
    feedback_imessage_url = Column(String(500), nullable=False)
    feedback_instagram_url = Column(String(500), nullable=False)
    partnership_whatsapp_url = Column(String(500), nullable=False)
    partnership_imessage_url = Column(String(500), nullable=False)
    updated_by = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
