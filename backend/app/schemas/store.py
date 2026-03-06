"""
Store Schemas
"""
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime, date, time
from zoneinfo import ZoneInfo


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
    time_zone: str = "America/New_York"
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    opening_hours: Optional[str] = None

    @field_validator("time_zone")
    @classmethod
    def validate_time_zone(cls, value: str) -> str:
        normalized = (value or "").strip()
        if not normalized:
            normalized = "America/New_York"
        try:
            ZoneInfo(normalized)
        except Exception as exc:
            raise ValueError("time_zone must be a valid IANA timezone identifier") from exc
        return normalized


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
    time_zone: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    opening_hours: Optional[str] = None

    @field_validator("time_zone")
    @classmethod
    def validate_optional_time_zone(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("time_zone cannot be empty")
        try:
            ZoneInfo(normalized)
        except Exception as exc:
            raise ValueError("time_zone must be a valid IANA timezone identifier") from exc
        return normalized


class Store(StoreBase):
    """Store response schema"""
    id: int
    rating: float
    review_count: int
    is_visible: bool = True
    manual_rank: Optional[int] = None
    boost_score: float = 0.0
    featured_until: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    distance: Optional[float] = None  # Distance in miles (calculated when user location is provided)

    class Config:
        from_attributes = True


class StoreWithImages(Store):
    """Store with images response schema"""
    images: List[StoreImage] = []

    class Config:
        from_attributes = True


class StoreVisibilityUpdate(BaseModel):
    """Store visibility update (super admin only)"""
    is_visible: bool


class StoreRankingUpdate(BaseModel):
    """Store ranking parameters update (super admin only)"""
    manual_rank: Optional[int] = None
    boost_score: Optional[float] = None
    featured_until: Optional[datetime] = None


class StoreBlockedSlotBase(BaseModel):
    blocked_date: date
    start_time: time
    end_time: time
    reason: Optional[str] = None
    status: Optional[str] = "active"


class StoreBlockedSlotCreate(StoreBlockedSlotBase):
    pass


class StoreBlockedSlotUpdate(BaseModel):
    blocked_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    reason: Optional[str] = None
    status: Optional[str] = None


class StoreBlockedSlotResponse(StoreBlockedSlotBase):
    id: int
    store_id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
