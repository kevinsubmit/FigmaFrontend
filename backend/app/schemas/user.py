"""
User Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from typing import Literal, Optional
from datetime import datetime, date
from app.schemas.phone import normalize_us_phone


class UserBase(BaseModel):
    """Base user schema"""
    phone: str = Field(..., min_length=10, max_length=20, description="手机号，必填")
    username: str = Field(..., min_length=3, max_length=100)
    full_name: Optional[str] = Field(None, max_length=200)
    email: Optional[EmailStr] = Field(None, description="邮箱，可选")
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """验证手机号格式（支持美国手机号）"""
        return normalize_us_phone(v, '手机号必须是10位数字（美国本土）或11位数字（含+1）')


class UserCreate(UserBase):
    """Schema for user registration"""
    password: str = Field(..., min_length=8, max_length=100)
    verification_code: str = Field(..., min_length=6, max_length=6, description="手机验证码")
    referral_code: Optional[str] = Field(None, max_length=10, description="推荐码(可选)")


class UserUpdate(BaseModel):
    """Schema for user update"""
    full_name: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    avatar_url: Optional[str] = Field(None, max_length=500)
    gender: Optional[str] = Field(None, description="Gender: male, female, other")
    date_of_birth: Optional[date] = Field(None, description="Date of birth (cannot be changed once set)")


class UserInDB(UserBase):
    """Schema for user in database"""
    id: int
    avatar_url: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    phone_verified: bool
    is_active: bool
    is_admin: bool
    store_id: Optional[int] = None
    store_admin_status: Optional[str] = None
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class UserResponse(UserInDB):
    """Schema for user response (excludes sensitive data)"""
    pass


class UserLogin(BaseModel):
    """Schema for user login"""
    phone: str = Field(..., description="手机号")
    password: str
    login_portal: Literal["frontend", "admin"] = Field(
        "frontend",
        description="登录入口：frontend(H5前台) / admin(后台管理)",
    )
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """验证手机号格式"""
        return normalize_us_phone(v, '手机号格式不正确')


class Token(BaseModel):
    """Schema for JWT token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for token payload data"""
    user_id: Optional[int] = None
    phone: Optional[str] = None
