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
