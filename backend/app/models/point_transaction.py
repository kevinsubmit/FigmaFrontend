"""
Point Transaction Model
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import enum


class TransactionType(str, enum.Enum):
    """Point transaction types"""
    EARN = "earn"  # Earn points
    SPEND = "spend"  # Spend points


class PointTransaction(Base):
    """Point transaction history"""
    __tablename__ = "point_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_points_id = Column(Integer, ForeignKey("user_points.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Integer, nullable=False, comment="Points amount (positive for earn, negative for spend)")
    type = Column(SQLEnum(TransactionType), nullable=False)
    reason = Column(String(255), nullable=False, comment="Reason for transaction")
    description = Column(Text, comment="Additional description")
    reference_type = Column(String(50), comment="Related entity type (e.g., 'appointment', 'coupon')")
    reference_id = Column(Integer, comment="Related entity ID")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    user_points = relationship("UserPoints", back_populates="transactions")
