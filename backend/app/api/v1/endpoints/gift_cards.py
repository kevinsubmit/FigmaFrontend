"""
Gift cards endpoints
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, get_current_admin_user
from app.models.user import User
from app.schemas.gift_card import (
    GiftCardResponse,
    GiftCardSummary,
    GiftCardPurchaseRequest,
    GiftCardPurchaseResponse,
    GiftCardTransferRequest,
    GiftCardClaimRequest,
    GiftCardClaimResponse,
    GiftCardRevokeResponse,
    GiftCardTransferStatus
)
from app.crud import gift_card as crud_gift_cards
from app.crud import user as crud_user
from app.services.gift_card_service import send_gift_card_sms
from app.services import notification_service
from app.services import log_service
from app.core.config import settings

router = APIRouter()


@router.get("/", response_model=List[GiftCardResponse])
def get_gift_cards(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    return crud_gift_cards.get_gift_cards(
        db=db,
        skip=skip,
        limit=limit,
        status=status
    )


@router.get("/my-cards", response_model=List[GiftCardResponse])
def get_my_gift_cards(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud_gift_cards.get_user_gift_cards(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )


@router.get("/summary", response_model=GiftCardSummary)
def get_gift_card_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud_gift_cards.get_gift_card_summary(db=db, user_id=current_user.id)


@router.post("/purchase", response_model=GiftCardPurchaseResponse)
def purchase_gift_card(
    http_request: Request,
    payload: GiftCardPurchaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    gift_card, claim_code = crud_gift_cards.create_gift_card_purchase(
        db=db,
        purchaser_id=current_user.id,
        amount=payload.amount,
        recipient_phone=payload.recipient_phone,
        message=payload.message
    )
    sms_sent = False
    if payload.recipient_phone and claim_code and gift_card.claim_expires_at:
        sms_sent = send_gift_card_sms(
            phone=payload.recipient_phone,
            claim_code=claim_code,
            amount=payload.amount,
            expires_at=gift_card.claim_expires_at
        )
        notification_service.notify_gift_card_sent(
            db=db,
            purchaser_id=current_user.id,
            amount=payload.amount,
            recipient_phone=gift_card.recipient_phone,
            expires_at=gift_card.claim_expires_at
        )
        recipient_user = crud_user.get_by_phone(db, phone=gift_card.recipient_phone)
        if recipient_user:
            notification_service.notify_gift_card_received(
                db=db,
                recipient_id=recipient_user.id,
                amount=payload.amount,
                expires_at=gift_card.claim_expires_at
            )

    action_name = "gift_card.issue.phone" if payload.recipient_phone else "gift_card.purchase"
    action_message = "按手机号发放礼品卡" if payload.recipient_phone else "购买礼品卡"
    log_service.create_audit_log(
        db,
        request=http_request,
        operator_user_id=current_user.id,
        module="gift_cards",
        action=action_name,
        message=action_message,
        target_type="gift_card",
        target_id=str(gift_card.id),
        after={
            "gift_card_id": gift_card.id,
            "recipient_phone": payload.recipient_phone,
            "amount": float(payload.amount or 0),
            "sms_sent": sms_sent,
            "status": gift_card.status,
            "claim_expires_at": str(gift_card.claim_expires_at) if gift_card.claim_expires_at else None,
        },
    )

    return GiftCardPurchaseResponse(
        gift_card=gift_card,
        sms_sent=sms_sent,
        claim_expires_at=gift_card.claim_expires_at,
        claim_code=claim_code if settings.DEBUG else None
    )


@router.post("/{gift_card_id}/transfer", response_model=GiftCardPurchaseResponse)
def transfer_gift_card(
    gift_card_id: int,
    request: GiftCardTransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    gift_card = crud_gift_cards.get_gift_card_by_id(db, gift_card_id)
    if not gift_card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gift card not found")

    if gift_card.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    try:
        updated_card = crud_gift_cards.transfer_existing_gift_card(
            db=db,
            gift_card=gift_card,
            recipient_phone=request.recipient_phone,
            message=request.message
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    sms_sent = send_gift_card_sms(
        phone=request.recipient_phone,
        claim_code=updated_card.claim_code,
        amount=updated_card.balance,
        expires_at=updated_card.claim_expires_at
    )
    notification_service.notify_gift_card_sent(
        db=db,
        purchaser_id=current_user.id,
        amount=updated_card.balance,
        recipient_phone=updated_card.recipient_phone,
        expires_at=updated_card.claim_expires_at
    )
    recipient_user = crud_user.get_by_phone(db, phone=updated_card.recipient_phone)
    if recipient_user:
        notification_service.notify_gift_card_received(
            db=db,
            recipient_id=recipient_user.id,
            amount=updated_card.balance,
            expires_at=updated_card.claim_expires_at
        )

    return GiftCardPurchaseResponse(
        gift_card=updated_card,
        sms_sent=sms_sent,
        claim_expires_at=updated_card.claim_expires_at,
        claim_code=updated_card.claim_code if settings.DEBUG else None
    )


@router.post("/claim", response_model=GiftCardClaimResponse)
def claim_gift_card(
    request: GiftCardClaimRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    gift_card = crud_gift_cards.get_gift_card_by_claim_code(db, request.claim_code)
    if not gift_card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gift card not found")

    if gift_card.status != "pending_transfer":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gift card is not claimable")

    now = datetime.utcnow()
    if gift_card.claim_expires_at and gift_card.claim_expires_at < now:
        crud_gift_cards.claim_gift_card(
            db,
            gift_card,
            current_user.id,
            customer_phone=current_user.phone,
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gift card claim expired")

    if gift_card.recipient_phone and gift_card.recipient_phone != current_user.phone:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recipient phone mismatch")

    try:
        claimed = crud_gift_cards.claim_gift_card(
            db,
            gift_card,
            current_user.id,
            customer_phone=current_user.phone,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    recipient_name = current_user.full_name or current_user.username or "A user"
    notification_service.notify_gift_card_claimed(
        db=db,
        purchaser_id=claimed.purchaser_id,
        recipient_name=recipient_name,
        amount=claimed.balance
    )
    notification_service.notify_gift_card_received(
        db=db,
        recipient_id=current_user.id,
        amount=claimed.balance,
        expires_at=claimed.claim_expires_at
    )

    return GiftCardClaimResponse(gift_card=claimed)


@router.post("/{gift_card_id}/revoke", response_model=GiftCardRevokeResponse)
def revoke_gift_card(
    gift_card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    gift_card = crud_gift_cards.get_gift_card_by_id(db, gift_card_id)
    if not gift_card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gift card not found")

    if gift_card.status != "pending_transfer":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gift card cannot be revoked")

    now = datetime.utcnow()
    if gift_card.claim_expires_at and gift_card.claim_expires_at < now:
        crud_gift_cards.claim_gift_card(
            db,
            gift_card,
            current_user.id,
            customer_phone=current_user.phone,
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gift card already expired")

    try:
        revoked = crud_gift_cards.revoke_gift_card(db, gift_card, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    return GiftCardRevokeResponse(gift_card=revoked)


@router.get("/{gift_card_id}/transfer-status", response_model=GiftCardTransferStatus)
def get_transfer_status(
    gift_card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    gift_card = crud_gift_cards.get_gift_card_by_id(db, gift_card_id)
    if not gift_card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gift card not found")

    if gift_card.user_id != current_user.id and gift_card.purchaser_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    return GiftCardTransferStatus(
        gift_card_id=gift_card.id,
        status=gift_card.status,
        recipient_phone=gift_card.recipient_phone,
        claim_expires_at=gift_card.claim_expires_at
    )
