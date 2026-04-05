"""Schemas for support and partnership contact settings."""
from datetime import datetime

from pydantic import BaseModel


class SupportContactSettingsResponse(BaseModel):
    feedback_whatsapp_url: str
    feedback_imessage_url: str
    feedback_instagram_url: str
    partnership_whatsapp_url: str
    partnership_imessage_url: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SupportContactSettingsUpdateRequest(BaseModel):
    feedback_whatsapp_url: str
    feedback_imessage_url: str
    feedback_instagram_url: str
    partnership_whatsapp_url: str
    partnership_imessage_url: str
