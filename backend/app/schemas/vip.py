"""
VIP schemas
"""
from typing import Optional
from pydantic import BaseModel


class VipLevelItem(BaseModel):
    level: int
    min_spend: float
    min_visits: int
    benefit: str
    is_active: bool = True


class VipLevelUpsertItem(BaseModel):
    level: int
    min_spend: float
    min_visits: int
    benefit: str
    is_active: bool = True


class VipLevelsUpdateRequest(BaseModel):
    levels: list[VipLevelUpsertItem]


class VipProgress(BaseModel):
    current: float
    required: float
    percent: float


class VipStatusResponse(BaseModel):
    current_level: VipLevelItem
    total_spend: float
    total_visits: int
    spend_progress: VipProgress
    visits_progress: VipProgress
    next_level: Optional[VipLevelItem] = None
