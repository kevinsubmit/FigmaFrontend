"""
Store Hours Schemas
"""
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import time


class StoreHoursBase(BaseModel):
    """Base schema for store hours"""
    day_of_week: int = Field(..., ge=0, le=6, description="Day of week (0=Monday, 6=Sunday)")
    open_time: Optional[time] = Field(None, description="Opening time (HH:MM:SS)")
    close_time: Optional[time] = Field(None, description="Closing time (HH:MM:SS)")
    is_closed: bool = Field(False, description="True if store is closed on this day")
    
    @validator('open_time', 'close_time')
    def validate_times(cls, v, values):
        """Validate that times are provided if not closed"""
        if 'is_closed' in values and not values['is_closed']:
            if v is None:
                raise ValueError("open_time and close_time are required when is_closed is False")
        return v
    
    @validator('close_time')
    def validate_close_after_open(cls, v, values):
        """Validate that close_time is after open_time"""
        if v and 'open_time' in values and values['open_time']:
            if v <= values['open_time']:
                raise ValueError("close_time must be after open_time")
        return v


class StoreHoursCreate(StoreHoursBase):
    """Schema for creating store hours"""
    pass


class StoreHoursUpdate(BaseModel):
    """Schema for updating store hours"""
    open_time: Optional[time] = None
    close_time: Optional[time] = None
    is_closed: Optional[bool] = None


class StoreHours(StoreHoursBase):
    """Schema for store hours response"""
    id: int
    store_id: int
    
    class Config:
        from_attributes = True


class StoreHoursBatch(BaseModel):
    """Schema for batch setting store hours (all 7 days)"""
    hours: list[StoreHoursCreate] = Field(..., min_length=7, max_length=7, description="Hours for all 7 days")
    
    @validator('hours')
    def validate_all_days(cls, v):
        """Validate that all days of week are present"""
        days = [h.day_of_week for h in v]
        if sorted(days) != list(range(7)):
            raise ValueError("Must provide hours for all 7 days (0-6)")
        return v
