"""
App version update policy model.
"""
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, func

from app.db.session import Base


class AppVersionPolicy(Base):
    __tablename__ = "app_version_policies"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    platform = Column(String(32), nullable=False, unique=True, index=True)  # ios | android | h5
    latest_version = Column(String(64), nullable=False, default="")
    latest_build = Column(Integer, nullable=True)
    min_supported_version = Column(String(64), nullable=False, default="")
    min_supported_build = Column(Integer, nullable=True)
    app_store_url = Column(String(500), nullable=True)
    update_title = Column(String(120), nullable=True)
    update_message = Column(Text, nullable=True)
    release_notes = Column(Text, nullable=True)
    is_enabled = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
