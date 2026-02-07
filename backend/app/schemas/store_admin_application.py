"""
Store admin application schemas
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
from datetime import datetime
import re


class StoreAdminApplicationBase(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)
    store_name: str = Field(..., max_length=200)

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        phone_digits = re.sub(r'\D', '', v)
        if len(phone_digits) == 10:
            phone_digits = '1' + phone_digits
        elif len(phone_digits) != 11:
            raise ValueError('手机号必须是10位数字（美国本土）或11位数字（含+1）')
        return phone_digits

class StoreAdminApplicationCreate(StoreAdminApplicationBase):
    password: str = Field(..., min_length=8, max_length=100)


class StoreAdminApplicationResponse(StoreAdminApplicationBase):
    id: int
    full_name: Optional[str] = None
    store_address: Optional[str] = None
    store_phone: Optional[str] = None
    opening_hours: Optional[str] = None
    user_id: Optional[int] = None
    store_id: Optional[int] = None
    status: str
    review_reason: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime


class StoreAdminApplicationDecision(BaseModel):
    review_reason: Optional[str] = None


class StoreAdminApplicationUpdate(BaseModel):
    store_name: Optional[str] = Field(None, max_length=200)
    store_address: Optional[str] = Field(None, max_length=500)
    store_phone: Optional[str] = Field(None, min_length=10, max_length=20)
    opening_hours: Optional[str] = Field(None, max_length=255)

    @field_validator('store_phone')
    @classmethod
    def validate_store_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        phone_digits = re.sub(r'\D', '', v)
        if len(phone_digits) == 10:
            phone_digits = '1' + phone_digits
        elif len(phone_digits) != 11:
            raise ValueError('店铺电话必须是10位数字（美国本土）或11位数字（含+1）')
        return phone_digits

    model_config = ConfigDict(from_attributes=True)
