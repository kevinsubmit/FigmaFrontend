"""
Homepage feed theme settings (super-admin managed).
"""
from sqlalchemy import Boolean, Column, DateTime, Integer, func

from app.db.session import Base


class HomeFeedThemeSetting(Base):
    __tablename__ = "home_feed_theme_settings"

    id = Column(Integer, primary_key=True, index=True)
    enabled = Column(Boolean, nullable=False, default=False)
    tag_id = Column(Integer, nullable=True, index=True)
    start_at = Column(DateTime(timezone=True), nullable=True)
    end_at = Column(DateTime(timezone=True), nullable=True)
    updated_by = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
