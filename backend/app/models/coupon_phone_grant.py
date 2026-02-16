"""
Pending coupon grants by phone for users not yet registered.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from app.db.session import Base


class CouponPhoneGrant(Base):
    __tablename__ = "coupon_phone_grants"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    coupon_id = Column(Integer, ForeignKey("coupons.id", ondelete="CASCADE"), nullable=False, index=True)
    phone = Column(String(20), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="pending", index=True)  # pending/claimed/expired/revoked
    note = Column(String(255), nullable=True)
    granted_by_user_id = Column(Integer, ForeignKey("backend_users.id", ondelete="SET NULL"), nullable=True, index=True)
    granted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    claim_expires_at = Column(DateTime(timezone=True), nullable=True, index=True)
    claimed_user_id = Column(Integer, ForeignKey("backend_users.id", ondelete="SET NULL"), nullable=True, index=True)
    claimed_at = Column(DateTime(timezone=True), nullable=True)
    user_coupon_id = Column(Integer, ForeignKey("user_coupons.id", ondelete="SET NULL"), nullable=True, index=True)
