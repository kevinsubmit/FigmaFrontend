"""
Gift card schemas
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class GiftCardResponse(BaseModel):
    id: int
    user_id: int
    card_number: str
    balance: float
    initial_balance: float
    status: str
    expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GiftCardSummary(BaseModel):
    total_balance: float
    active_count: int
    total_count: int
