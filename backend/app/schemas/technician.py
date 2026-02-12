"""
Technician Schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class TechnicianBase(BaseModel):
    """Technician base schema"""
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    bio: Optional[str] = None
    specialties: Optional[str] = None
    years_of_experience: Optional[int] = None
    hire_date: Optional[date] = None
    avatar_url: Optional[str] = None


class TechnicianCreate(TechnicianBase):
    """Technician create schema"""
    store_id: int


class TechnicianUpdate(BaseModel):
    """Technician update schema"""
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    bio: Optional[str] = None
    specialties: Optional[str] = None
    years_of_experience: Optional[int] = None
    hire_date: Optional[date] = None
    avatar_url: Optional[str] = None
    is_active: Optional[int] = None


class Technician(TechnicianBase):
    """Technician response schema"""
    id: int
    store_id: int
    is_active: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
