"""
Coupon Model (Template)
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import enum


class CouponType(str, enum.Enum):
    """Coupon types"""
    FIXED_AMOUNT = "fixed_amount"  # Fixed amount discount (e.g., $5 off)
    PERCENTAGE = "percentage"  # Percentage discount (e.g., 10% off)


class CouponCategory(str, enum.Enum):
    """Coupon categories"""
    NORMAL = "normal"  # Normal coupon
    NEWCOMER = "newcomer"  # Newcomer coupon
    BIRTHDAY = "birthday"  # Birthday coupon
    REFERRAL = "referral"  # Referral reward
    ACTIVITY = "activity"  # Activity reward


class Coupon(Base):
    """Coupon template"""
    __tablename__ = "coupons"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, comment="Coupon name")
    description = Column(Text, comment="Coupon description")
    type = Column(SQLEnum(CouponType), nullable=False, default=CouponType.FIXED_AMOUNT)
    category = Column(SQLEnum(CouponCategory), nullable=False, default=CouponCategory.NORMAL)
    
    # Discount value
    discount_value = Column(Float, nullable=False, comment="Discount value ($5 or 10%)")
    min_amount = Column(Float, default=0, comment="Minimum purchase amount to use")
    max_discount = Column(Float, comment="Maximum discount amount (for percentage coupons)")
    
    # Validity
    valid_days = Column(Integer, nullable=False, comment="Valid days after obtained")
    
    # Availability
    is_active = Column(Boolean, default=True, nullable=False, comment="Is coupon active")
    total_quantity = Column(Integer, comment="Total quantity (null = unlimited)")
    claimed_quantity = Column(Integer, default=0, nullable=False, comment="Number of times claimed")
    
    # Points exchange
    points_required = Column(Integer, comment="Points required to exchange (null = not exchangeable)")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user_coupons = relationship("UserCoupon", back_populates="coupon", cascade="all, delete-orphan")
