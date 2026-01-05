"""
User Points Model
"""
from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class UserPoints(Base):
    """User points balance"""
    __tablename__ = "user_points"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("backend_users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    total_points = Column(Integer, default=0, nullable=False, comment="Total points earned (lifetime)")
    available_points = Column(Integer, default=0, nullable=False, comment="Current available points")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="points")
    transactions = relationship("PointTransaction", back_populates="user_points", cascade="all, delete-orphan")
