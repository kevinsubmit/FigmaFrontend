"""
Profile summary schemas
"""
from pydantic import BaseModel

from app.schemas.vip import VipStatusResponse


class ProfileSummaryResponse(BaseModel):
    unread_count: int
    points: int
    favorite_count: int
    completed_orders: int
    vip_status: VipStatusResponse
    coupon_count: int
    gift_balance: float
    review_count: int
