"""
Promotion schemas
"""
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class PromotionServiceRuleBase(BaseModel):
    """Promotion service rule base schema"""
    service_id: int
    min_price: Optional[float] = None
    max_price: Optional[float] = None


class PromotionServiceRuleCreate(PromotionServiceRuleBase):
    """Create promotion service rule"""
    pass


class PromotionServiceRuleResponse(PromotionServiceRuleBase):
    """Promotion service rule response"""
    id: int

    class Config:
        from_attributes = True


class PromotionBase(BaseModel):
    """Promotion base schema"""
    scope: str  # "platform" or "store"
    store_id: Optional[int] = None
    title: str
    type: str  # activity type label
    image_url: Optional[str] = None
    discount_type: str  # "fixed_amount" or "percentage"
    discount_value: float
    rules: Optional[str] = None
    start_at: datetime
    end_at: datetime
    is_active: bool = True


class PromotionCreate(PromotionBase):
    """Create promotion"""
    service_rules: List[PromotionServiceRuleCreate] = []


class PromotionUpdate(BaseModel):
    """Update promotion"""
    scope: Optional[str] = None
    store_id: Optional[int] = None
    title: Optional[str] = None
    type: Optional[str] = None
    image_url: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    rules: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    is_active: Optional[bool] = None
    service_rules: Optional[List[PromotionServiceRuleCreate]] = None


class PromotionResponse(PromotionBase):
    """Promotion response"""
    id: int
    created_at: datetime
    updated_at: datetime
    service_rules: List[PromotionServiceRuleResponse] = []

    class Config:
        from_attributes = True
