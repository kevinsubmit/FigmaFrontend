"""
Notification Schemas
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from app.models.notification import NotificationType


class NotificationBase(BaseModel):
    """Base notification schema"""
    title: str
    message: str
    type: NotificationType
    appointment_id: Optional[int] = None


class NotificationCreate(NotificationBase):
    """Schema for creating a notification"""
    user_id: int


class NotificationUpdate(BaseModel):
    """Schema for updating a notification"""
    is_read: Optional[bool] = None


class Notification(NotificationBase):
    """Schema for notification response"""
    id: int
    user_id: int
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class DeviceTokenRegisterRequest(BaseModel):
    """Register or refresh a mobile push device token."""

    device_token: str = Field(..., min_length=32, max_length=255)
    platform: str = Field(default="ios", max_length=20)
    apns_environment: Optional[str] = Field(default=None, max_length=20)
    app_version: Optional[str] = Field(default=None, max_length=50)
    device_name: Optional[str] = Field(default=None, max_length=120)
    locale: Optional[str] = Field(default=None, max_length=32)
    timezone: Optional[str] = Field(default=None, max_length=64)

    @field_validator("platform")
    @classmethod
    def normalize_platform(cls, value: str) -> str:
        normalized = (value or "").strip().lower()
        if normalized != "ios":
            raise ValueError("Only iOS platform is supported for APNs")
        return normalized

    @field_validator("apns_environment")
    @classmethod
    def normalize_environment(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized not in {"sandbox", "production"}:
            raise ValueError("apns_environment must be sandbox or production")
        return normalized


class DeviceTokenUnregisterRequest(BaseModel):
    """Deactivate a previously registered device token."""

    device_token: str = Field(..., min_length=32, max_length=255)


class NotificationPreferencesResponse(BaseModel):
    """Current user's notification preferences."""

    push_enabled: bool


class NotificationPreferencesUpdateRequest(BaseModel):
    """Update current user's notification preferences."""

    push_enabled: bool


class AdminTestPushRequest(BaseModel):
    """Super admin test push payload."""

    title: str = Field(default="Test Push", min_length=1, max_length=120)
    message: str = Field(default="This is a test push from admin dashboard.", min_length=1, max_length=500)
    user_id: Optional[int] = Field(default=None, ge=1)
