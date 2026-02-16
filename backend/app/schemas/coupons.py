"""
Coupons Schemas
"""
from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, List
from app.schemas.phone import normalize_us_phone


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


class CouponUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    discount_value: Optional[float] = None
    min_amount: Optional[float] = None
    max_discount: Optional[float] = None
    valid_days: Optional[int] = None
    is_active: Optional[bool] = None
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


class GrantCouponRequest(BaseModel):
    """Admin grant coupon request"""
    phone: str
    coupon_id: int

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return normalize_us_phone(value, "手机号格式不正确")


class GrantCouponResult(BaseModel):
    status: str  # granted | pending_claim
    detail: str
    sms_sent: Optional[bool] = None
    user_coupon_id: Optional[int] = None
    pending_grant_id: Optional[int] = None


class GrantCouponBatchRequest(BaseModel):
    coupon_id: int
    phones: List[str]


class GrantCouponBatchItem(BaseModel):
    input_phone: str
    normalized_phone: Optional[str] = None
    status: str  # granted | pending_claim | failed
    detail: str
    sms_sent: Optional[bool] = None
    user_coupon_id: Optional[int] = None
    pending_grant_id: Optional[int] = None


class GrantCouponBatchResult(BaseModel):
    total: int
    granted_count: int
    pending_count: int
    failed_count: int
    items: List[GrantCouponBatchItem]


class CouponPhoneGrantResponse(BaseModel):
    id: int
    coupon_id: int
    coupon_name: Optional[str] = None
    phone: str
    status: str
    note: Optional[str] = None
    granted_by_user_id: Optional[int] = None
    granted_at: datetime
    claim_expires_at: Optional[datetime] = None
    claimed_user_id: Optional[int] = None
    claimed_at: Optional[datetime] = None
    user_coupon_id: Optional[int] = None

    class Config:
        from_attributes = True


class UseCouponRequest(BaseModel):
    """Use coupon request"""
    user_coupon_id: int
    appointment_id: int
