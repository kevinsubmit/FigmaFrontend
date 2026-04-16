"""
Gift card schemas
"""
from datetime import datetime
from typing import Any, Optional
import re
from pydantic import BaseModel, Field, field_validator, model_validator

from app.services.gift_card_templates import (
    attach_gift_card_template,
    list_gift_card_templates,
    normalize_gift_card_template_key,
)


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
    template_key: str
    template: "GiftCardTemplateResponse"
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

    @model_validator(mode="before")
    @classmethod
    def populate_template(cls, value: Any) -> Any:
        if isinstance(value, dict):
            return attach_gift_card_template(value)

        payload = {
            "id": getattr(value, "id"),
            "user_id": getattr(value, "user_id"),
            "purchaser_id": getattr(value, "purchaser_id"),
            "card_number": getattr(value, "card_number"),
            "recipient_phone": getattr(value, "recipient_phone", None),
            "recipient_message": getattr(value, "recipient_message", None),
            "template_key": getattr(value, "template_key", None),
            "balance": getattr(value, "balance"),
            "initial_balance": getattr(value, "initial_balance"),
            "status": getattr(value, "status"),
            "expires_at": getattr(value, "expires_at", None),
            "claim_expires_at": getattr(value, "claim_expires_at", None),
            "claimed_by_user_id": getattr(value, "claimed_by_user_id", None),
            "claimed_at": getattr(value, "claimed_at", None),
            "created_at": getattr(value, "created_at"),
            "updated_at": getattr(value, "updated_at"),
        }
        return attach_gift_card_template(payload)


class GiftCardTemplateResponse(BaseModel):
    key: str
    name: str
    description: str
    icon_key: str
    accent_start_hex: str
    accent_end_hex: str
    background_start_hex: str
    background_end_hex: str
    text_hex: str


class GiftCardSummary(BaseModel):
    total_balance: float
    active_count: int
    total_count: int


class GiftCardPurchaseRequest(BaseModel):
    amount: float = Field(..., gt=0)
    recipient_phone: Optional[str] = None
    message: Optional[str] = Field(default=None, max_length=255)
    template_key: Optional[str] = None

    @field_validator("recipient_phone")
    @classmethod
    def validate_recipient_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        return normalize_us_phone(v)

    @field_validator("template_key")
    @classmethod
    def validate_template_key(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not v.strip():
            return None
        return normalize_gift_card_template_key(v)


class GiftCardPurchaseResponse(BaseModel):
    gift_card: GiftCardResponse
    sms_sent: bool
    claim_expires_at: Optional[datetime] = None
    claim_code: Optional[str] = None


class GiftCardTransferRequest(BaseModel):
    recipient_phone: str
    message: Optional[str] = Field(default=None, max_length=255)
    template_key: Optional[str] = None

    @field_validator("recipient_phone")
    @classmethod
    def validate_recipient_phone(cls, v: str) -> str:
        return normalize_us_phone(v)

    @field_validator("template_key")
    @classmethod
    def validate_template_key(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not v.strip():
            return None
        return normalize_gift_card_template_key(v)


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


class GiftCardClaimPreviewResponse(BaseModel):
    gift_card_id: int
    amount: float
    recipient_phone: Optional[str] = None
    recipient_message: Optional[str] = None
    claim_expires_at: Optional[datetime] = None
    template_key: str
    template: GiftCardTemplateResponse

    @model_validator(mode="before")
    @classmethod
    def populate_template(cls, value: Any) -> Any:
        if isinstance(value, dict):
            return attach_gift_card_template(value)
        return value


class GiftCardTemplateListResponse(BaseModel):
    templates: list[GiftCardTemplateResponse]

    @classmethod
    def from_templates(cls) -> "GiftCardTemplateListResponse":
        return cls(templates=[GiftCardTemplateResponse.model_validate(item) for item in list_gift_card_templates()])


GiftCardResponse.model_rebuild()
