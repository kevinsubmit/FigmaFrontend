"""
Schemas for app version policy/update checks.
"""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


AppPlatform = Literal["ios", "android", "h5"]


class AppVersionPolicyResponse(BaseModel):
    platform: AppPlatform
    latest_version: str = ""
    latest_build: Optional[int] = None
    min_supported_version: str = ""
    min_supported_build: Optional[int] = None
    app_store_url: Optional[str] = None
    update_title: Optional[str] = None
    update_message: Optional[str] = None
    release_notes: Optional[str] = None
    is_enabled: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AppVersionPolicyUpdateRequest(BaseModel):
    platform: AppPlatform
    latest_version: str = ""
    latest_build: Optional[int] = None
    min_supported_version: str = ""
    min_supported_build: Optional[int] = None
    app_store_url: Optional[str] = None
    update_title: Optional[str] = None
    update_message: Optional[str] = None
    release_notes: Optional[str] = None
    is_enabled: bool = True


class AppVersionCheckResponse(BaseModel):
    platform: AppPlatform
    current_version: Optional[str] = None
    current_build: Optional[int] = None
    latest_version: str = ""
    latest_build: Optional[int] = None
    min_supported_version: str = ""
    min_supported_build: Optional[int] = None
    should_update: bool = False
    force_update: bool = False
    update_title: Optional[str] = None
    update_message: Optional[str] = None
    release_notes: Optional[str] = None
    app_store_url: Optional[str] = None
    checked_at: datetime
