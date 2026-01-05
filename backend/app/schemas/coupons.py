"""
Coupons Schemas
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class CouponBase(BaseModel):
    """Coupon base schema"""
    name: str
    description: Optional[str] = None
    type: str  # "fixed_amount" or "percentage"
    category: str  # "normal", "newcomer", "birthday", "referral", "activity"
    discount_value: float
    min_amount: float = 0
    max_discount: Optional[float] = None
    valid_days: int


class CouponCreate(CouponBase):
    """Create coupon"""
    is_active: bool = True
    total_quantity: Optional[int] = None
    points_required: Optional[int] = None


class CouponResponse(CouponBase):
    """Coupon response"""
    id: int
    is_active: bool
    total_quantity: Optional[int]
    claimed_quantity: int
    points_required: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserCouponResponse(BaseModel):
    """User coupon response"""
    id: int
    coupon_id: int
    status: str  # "available", "used", "expired"
    source: Optional[str]
    obtained_at: datetime
    expires_at: datetime
    used_at: Optional[datetime]
    
    # Coupon details
    coupon: CouponResponse
    
    class Config:
        from_attributes = True


class ClaimCouponRequest(BaseModel):
    """Claim coupon request"""
    coupon_id: int
    source: str = "system"  # "system", "points", "referral", "activity"


class UseCouponRequest(BaseModel):
    """Use coupon request"""
    user_coupon_id: int
    appointment_id: int
