"""
Gift card schemas
"""
from datetime import datetime
from typing import Optional
import re
from pydantic import BaseModel, Field, field_validator


def normalize_us_phone(value: str) -> str:
    phone_digits = re.sub(r'\D', '', value or "")
    if len(phone_digits) == 10:
        phone_digits = "1" + phone_digits
    elif len(phone_digits) != 11:
        raise ValueError("手机号格式不正确")
    return phone_digits


class GiftCardResponse(BaseModel):
    id: int
    user_id: int
    purchaser_id: int
    card_number: str
    recipient_phone: Optional[str]
    recipient_message: Optional[str]
    balance: float
    initial_balance: float
    status: str
    expires_at: Optional[datetime]
    claim_expires_at: Optional[datetime]
    claimed_by_user_id: Optional[int]
    claimed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GiftCardSummary(BaseModel):
    total_balance: float
    active_count: int
    total_count: int


class GiftCardPurchaseRequest(BaseModel):
    amount: float = Field(..., gt=0)
    recipient_phone: Optional[str] = None
    message: Optional[str] = Field(default=None, max_length=255)

    @field_validator("recipient_phone")
    @classmethod
    def validate_recipient_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        return normalize_us_phone(v)


class GiftCardPurchaseResponse(BaseModel):
    gift_card: GiftCardResponse
    sms_sent: bool
    claim_expires_at: Optional[datetime] = None
    claim_code: Optional[str] = None


class GiftCardTransferRequest(BaseModel):
    recipient_phone: str
    message: Optional[str] = Field(default=None, max_length=255)

    @field_validator("recipient_phone")
    @classmethod
    def validate_recipient_phone(cls, v: str) -> str:
        return normalize_us_phone(v)


class GiftCardClaimRequest(BaseModel):
    claim_code: str = Field(..., min_length=6, max_length=16)


class GiftCardClaimResponse(BaseModel):
    gift_card: GiftCardResponse


class GiftCardRevokeResponse(BaseModel):
    gift_card: GiftCardResponse


class GiftCardTransferStatus(BaseModel):
    gift_card_id: int
    status: str
    recipient_phone: Optional[str] = None
    claim_expires_at: Optional[datetime] = None
