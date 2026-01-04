"""
Notification Schemas
"""
from pydantic import BaseModel
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
