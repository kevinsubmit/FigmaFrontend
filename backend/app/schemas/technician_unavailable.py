"""
Technician Unavailable Schemas
"""
from pydantic import BaseModel, Field
from datetime import date, time
from typing import Optional
from datetime import datetime


class TechnicianUnavailableBase(BaseModel):
    """Base schema for technician unavailable"""
    start_date: date = Field(..., description="Start date of unavailable period")
    end_date: date = Field(..., description="End date of unavailable period (inclusive)")
    start_time: Optional[time] = Field(None, description="Start time (optional, for partial day unavailability)")
    end_time: Optional[time] = Field(None, description="End time (optional, for partial day unavailability)")
    reason: Optional[str] = Field(None, max_length=200, description="Reason for unavailability")


class TechnicianUnavailableCreate(TechnicianUnavailableBase):
    """Schema for creating technician unavailable period"""
    pass


class TechnicianUnavailableUpdate(BaseModel):
    """Schema for updating technician unavailable period"""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    reason: Optional[str] = Field(None, max_length=200)


class TechnicianUnavailable(TechnicianUnavailableBase):
    """Schema for technician unavailable response"""
    id: int
    technician_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
