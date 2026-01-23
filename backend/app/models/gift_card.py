"""
Gift card database model
"""
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, func
from app.db.session import Base


class GiftCard(Base):
    """Gift card model"""
    __tablename__ = "gift_cards"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("backend_users.id"), nullable=False, index=True)
    card_number = Column(String(50), unique=True, nullable=False, index=True)
    balance = Column(Float, nullable=False, default=0)
    initial_balance = Column(Float, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="active")
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
