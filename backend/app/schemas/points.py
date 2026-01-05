"""
Points Schemas
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PointsBalance(BaseModel):
    """User points balance response"""
    user_id: int
    total_points: int
    available_points: int
    
    class Config:
        from_attributes = True


class PointTransactionCreate(BaseModel):
    """Create point transaction"""
    amount: int
    reason: str
    description: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None


class PointTransactionResponse(BaseModel):
    """Point transaction response"""
    id: int
    amount: int
    type: str
    reason: str
    description: Optional[str]
    reference_type: Optional[str]
    reference_id: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True


class PointsExchangeRequest(BaseModel):
    """Exchange points for coupon"""
    coupon_id: int
