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
    purchaser_id = Column(Integer, ForeignKey("backend_users.id"), nullable=False, index=True)
    card_number = Column(String(50), unique=True, nullable=False, index=True)
    claim_code = Column(String(16), unique=True, nullable=True, index=True)
    recipient_phone = Column(String(20), nullable=True, index=True)
    recipient_message = Column(String(255), nullable=True)
    balance = Column(Float, nullable=False, default=0)
    initial_balance = Column(Float, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="active")
    expires_at = Column(DateTime(timezone=True), nullable=True)
    claim_expires_at = Column(DateTime(timezone=True), nullable=True)
    claimed_by_user_id = Column(Integer, ForeignKey("backend_users.id"), nullable=True, index=True)
    claimed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class GiftCardTransaction(Base):
    """Gift card transaction model"""
    __tablename__ = "gift_card_transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    gift_card_id = Column(Integer, ForeignKey("gift_cards.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("backend_users.id"), nullable=True, index=True)
    transaction_type = Column(String(30), nullable=False, index=True)
    amount = Column(Float, nullable=False, default=0)
    balance_before = Column(Float, nullable=False, default=0)
    balance_after = Column(Float, nullable=False, default=0)
    note = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
