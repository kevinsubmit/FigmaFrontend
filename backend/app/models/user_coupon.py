"""
User Coupon Model
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import enum


class CouponStatus(str, enum.Enum):
    """User coupon status"""
    AVAILABLE = "available"  # Available to use
    USED = "used"  # Already used
    EXPIRED = "expired"  # Expired


class UserCoupon(Base):
    """User's coupon"""
    __tablename__ = "user_coupons"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("backend_users.id", ondelete="CASCADE"), nullable=False, index=True)
    coupon_id = Column(Integer, ForeignKey("coupons.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(SQLEnum(CouponStatus), default=CouponStatus.AVAILABLE, nullable=False, index=True)
    
    # Source tracking
    source = Column(String(50), comment="How coupon was obtained (system/points/referral/activity)")
    
    # Dates
    obtained_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True, comment="Expiration date")
    used_at = Column(DateTime(timezone=True), comment="When coupon was used")
    
    # Usage tracking
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), comment="Appointment where coupon was used")
    
    # Relationships
    user = relationship("User", back_populates="coupons")
    coupon = relationship("Coupon", back_populates="user_coupons")
    appointment = relationship("Appointment", foreign_keys=[appointment_id])
