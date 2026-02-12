"""
Service Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ServiceBase(BaseModel):
    """Service base schema"""
    name: str
    description: Optional[str] = None
    price: float = Field(gt=0)
    commission_amount: float = Field(default=0, ge=0)
    duration_minutes: int = Field(gt=0)
    category: Optional[str] = None


class ServiceCreate(ServiceBase):
    """Service create schema"""
    store_id: int
    catalog_id: Optional[int] = None


class ServiceUpdate(BaseModel):
    """Service update schema"""
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    commission_amount: Optional[float] = Field(default=None, ge=0)
    duration_minutes: Optional[int] = None
    category: Optional[str] = None
    catalog_id: Optional[int] = None
    is_active: Optional[int] = None


class Service(ServiceBase):
    """Service response schema"""
    id: int
    store_id: int
    catalog_id: Optional[int] = None
    name_snapshot: Optional[str] = None
    is_active: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ServiceCatalogBase(BaseModel):
    """Service catalog base schema"""
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    default_duration_minutes: Optional[int] = None
    is_active: int = 1
    sort_order: int = 0


class ServiceCatalogCreate(ServiceCatalogBase):
    """Create service catalog item"""
    pass


class ServiceCatalogUpdate(BaseModel):
    """Update service catalog item"""
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    default_duration_minutes: Optional[int] = None
    is_active: Optional[int] = None
    sort_order: Optional[int] = None


class ServiceCatalog(ServiceCatalogBase):
    """Service catalog response"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StoreServiceAssign(BaseModel):
    """Assign a catalog service to a store with store-specific pricing"""
    catalog_id: int
    price: float = Field(gt=0)
    commission_amount: float = Field(default=0, ge=0)
    duration_minutes: int = Field(gt=0)
    description: Optional[str] = None


class StoreServiceUpdate(BaseModel):
    """Update store-specific service config"""
    price: Optional[float] = Field(default=None, gt=0)
    commission_amount: Optional[float] = Field(default=None, ge=0)
    duration_minutes: Optional[int] = Field(default=None, gt=0)
    description: Optional[str] = None
    is_active: Optional[int] = None
