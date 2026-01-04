from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ReviewCreate(BaseModel):
    """创建评价的请求模型"""
    appointment_id: int = Field(..., description="预约ID")
    rating: float = Field(..., ge=1, le=5, description="评分（1-5星）")
    comment: Optional[str] = Field(None, description="评价内容")


class ReviewResponse(BaseModel):
    """评价响应模型"""
    id: int
    user_id: int
    store_id: int
    appointment_id: int
    rating: float
    comment: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    # 关联信息
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None

    class Config:
        from_attributes = True


class StoreRatingResponse(BaseModel):
    """店铺评分统计响应模型"""
    store_id: int
    average_rating: float
    total_reviews: int
    rating_distribution: dict  # {1: count, 2: count, 3: count, 4: count, 5: count}
