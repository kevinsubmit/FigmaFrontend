"""
Store Portfolio Schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StorePortfolioBase(BaseModel):
    """Base schema for store portfolio"""
    image_url: str
    title: Optional[str] = None
    description: Optional[str] = None
    display_order: int = 0


class StorePortfolioCreate(StorePortfolioBase):
    """Schema for creating a portfolio item"""
    pass


class StorePortfolioUpdate(BaseModel):
    """Schema for updating a portfolio item"""
    title: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None


class StorePortfolio(StorePortfolioBase):
    """Schema for portfolio response"""
    id: int
    store_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
