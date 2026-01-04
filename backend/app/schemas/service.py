"""
Service Schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ServiceBase(BaseModel):
    """Service base schema"""
    name: str
    description: Optional[str] = None
    price: float
    duration_minutes: int
    category: Optional[str] = None


class ServiceCreate(ServiceBase):
    """Service create schema"""
    store_id: int


class ServiceUpdate(BaseModel):
    """Service update schema"""
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    duration_minutes: Optional[int] = None
    category: Optional[str] = None
    is_active: Optional[int] = None


class Service(ServiceBase):
    """Service response schema"""
    id: int
    store_id: int
    is_active: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
