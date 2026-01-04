"""
Store Schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class StoreImageBase(BaseModel):
    """Store Image base schema"""
    image_url: str
    is_primary: int = 0
    display_order: int = 0


class StoreImageCreate(StoreImageBase):
    """Store Image create schema"""
    store_id: int


class StoreImage(StoreImageBase):
    """Store Image response schema"""
    id: int
    store_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class StoreBase(BaseModel):
    """Store base schema"""
    name: str
    address: str
    city: str
    state: str
    zip_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    opening_hours: Optional[str] = None


class StoreCreate(StoreBase):
    """Store create schema"""
    pass


class StoreUpdate(BaseModel):
    """Store update schema"""
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    opening_hours: Optional[str] = None


class Store(StoreBase):
    """Store response schema"""
    id: int
    rating: float
    review_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StoreWithImages(Store):
    """Store with images response schema"""
    images: List[StoreImage] = []

    class Config:
        from_attributes = True
