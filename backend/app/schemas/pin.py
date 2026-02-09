from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class PinBase(BaseModel):
    title: str
    image_url: str
    description: Optional[str] = None


class PinResponse(PinBase):
    id: int
    tags: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True


class TagAdminBase(BaseModel):
    name: str
    sort_order: int = 0
    is_active: bool = True
    show_on_home: bool = True


class TagAdminCreate(TagAdminBase):
    pass


class TagAdminUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    show_on_home: Optional[bool] = None


class TagAdminResponse(TagAdminBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PinAdminCreate(BaseModel):
    title: str
    image_url: str
    description: Optional[str] = None
    tag_ids: List[int] = []
    status: str = "published"
    sort_order: int = 0


class PinAdminUpdate(BaseModel):
    title: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    tag_ids: Optional[List[int]] = None
    status: Optional[str] = None
    sort_order: Optional[int] = None


class PinAdminResponse(PinBase):
    id: int
    status: str
    sort_order: int
    is_deleted: bool
    tag_ids: List[int] = []
    tags: List[str] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HomeFeedThemeUpdate(BaseModel):
    enabled: bool
    tag_id: Optional[int] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None


class HomeFeedThemeResponse(BaseModel):
    enabled: bool
    active: bool
    tag_id: Optional[int] = None
    tag_name: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
