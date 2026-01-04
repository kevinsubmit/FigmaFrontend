"""
ReviewReply Pydantic schemas
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ReviewReplyBase(BaseModel):
    """Base schema for review reply"""
    content: str = Field(..., min_length=1, max_length=1000, description="回复内容")


class ReviewReplyCreate(ReviewReplyBase):
    """Schema for creating a review reply"""
    review_id: int = Field(..., description="评价ID")


class ReviewReplyUpdate(BaseModel):
    """Schema for updating a review reply"""
    content: str = Field(..., min_length=1, max_length=1000, description="回复内容")


class ReviewReplyResponse(ReviewReplyBase):
    """Schema for review reply response"""
    id: int
    review_id: int
    admin_id: int
    created_at: datetime
    updated_at: datetime
    admin_name: Optional[str] = None  # 管理员用户名
    
    class Config:
        from_attributes = True
