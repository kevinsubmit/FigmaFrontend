"""
Store Holiday Schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class StoreHolidayBase(BaseModel):
    """Base schema for store holiday"""
    holiday_date: date
    name: str
    description: Optional[str] = None


class StoreHolidayCreate(StoreHolidayBase):
    """Schema for creating a holiday"""
    pass


class StoreHolidayUpdate(BaseModel):
    """Schema for updating a holiday"""
    name: Optional[str] = None
    description: Optional[str] = None


class StoreHoliday(StoreHolidayBase):
    """Schema for holiday response"""
    id: int
    store_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
