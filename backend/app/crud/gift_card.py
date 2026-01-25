"""
Gift card CRUD operations
"""
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import secrets
import string
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.gift_card import GiftCard, GiftCardTransaction


def _generate_unique_code(db: Session, column, length: int, prefix: str) -> str:
    alphabet = string.ascii_uppercase + string.digits
    for _ in range(20):
        code = prefix + "".join(secrets.choice(alphabet) for _ in range(length))
        exists = db.query(GiftCard).filter(column == code).first()
        if not exists:
            return code
    raise RuntimeError("Failed to generate unique gift card code")


def _create_transaction(
    db: Session,
    gift_card: GiftCard,
    user_id: Optional[int],
    transaction_type: str,
    amount: float,
    note: Optional[str] = None,
    balance_before: Optional[float] = None,
    balance_after: Optional[float] = None
) -> None:
    before = gift_card.balance if balance_before is None else balance_before
    after = gift_card.balance if balance_after is None else balance_after
    db.add(GiftCardTransaction(
        gift_card_id=gift_card.id,
        user_id=user_id,
        transaction_type=transaction_type,
        amount=amount,
        balance_before=before,
        balance_after=after,
        note=note
    ))


def get_user_gift_cards(db: Session, user_id: int, skip: int = 0, limit: int = 50) -> List[GiftCard]:
    return (
        db.query(GiftCard)
        .filter(GiftCard.user_id == user_id)
        .order_by(GiftCard.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_gift_card_summary(db: Session, user_id: int) -> Dict[str, float]:
    total_count = (
        db.query(func.count(GiftCard.id))
        .filter(GiftCard.user_id == user_id)
        .scalar()
    ) or 0

    active_count = (
        db.query(func.count(GiftCard.id))
        .filter(GiftCard.user_id == user_id, GiftCard.status == "active")
        .scalar()
    ) or 0

    total_balance = (
        db.query(func.sum(GiftCard.balance))
        .filter(GiftCard.user_id == user_id, GiftCard.status == "active")
        .scalar()
    ) or 0.0

    return {
        "total_balance": float(total_balance),
        "active_count": int(active_count),
        "total_count": int(total_count),
    }


def create_gift_card_purchase(
    db: Session,
    purchaser_id: int,
    amount: float,
    recipient_phone: Optional[str],
    message: Optional[str],
    claim_days: int = 30
) -> Tuple[GiftCard, Optional[str]]:
    now = datetime.utcnow()
    card_number = _generate_unique_code(db, GiftCard.card_number, length=12, prefix="GFT")
    claim_code = None
    claim_expires_at = None
    status = "active"

    if recipient_phone:
        claim_code = _generate_unique_code(db, GiftCard.claim_code, length=8, prefix="GC")
        claim_expires_at = now + timedelta(days=claim_days)
        status = "pending_transfer"

    gift_card = GiftCard(
        user_id=purchaser_id,
        purchaser_id=purchaser_id,
        card_number=card_number,
        claim_code=claim_code,
        recipient_phone=recipient_phone,
        recipient_message=message,
        balance=amount,
        initial_balance=amount,
        status=status,
        claim_expires_at=claim_expires_at
    )

    db.add(gift_card)
    db.flush()
    _create_transaction(
        db=db,
        gift_card=gift_card,
        user_id=purchaser_id,
        transaction_type="purchase",
        amount=amount,
        note="Gift card purchase",
        balance_before=0,
        balance_after=amount
    )

    if recipient_phone:
        _create_transaction(
            db=db,
            gift_card=gift_card,
            user_id=purchaser_id,
            transaction_type="transfer_sent",
            amount=0,
            note=f"Sent to {recipient_phone}"
        )

    db.commit()
    db.refresh(gift_card)
    return gift_card, claim_code


def transfer_existing_gift_card(
    db: Session,
    gift_card: GiftCard,
    recipient_phone: str,
    message: Optional[str],
    claim_days: int = 30
) -> GiftCard:
    if gift_card.status != "active":
        raise ValueError("Gift card cannot be transferred")

    now = datetime.utcnow()
    gift_card.recipient_phone = recipient_phone
    gift_card.recipient_message = message
    gift_card.status = "pending_transfer"
    gift_card.claim_expires_at = now + timedelta(days=claim_days)
    gift_card.claimed_by_user_id = None
    gift_card.claimed_at = None
    gift_card.transfer_expiry_notified = False

    if not gift_card.claim_code:
        gift_card.claim_code = _generate_unique_code(db, GiftCard.claim_code, length=8, prefix="GC")

    _create_transaction(
        db=db,
        gift_card=gift_card,
        user_id=gift_card.user_id,
        transaction_type="transfer_sent",
        amount=0,
        note=f"Sent to {recipient_phone}"
    )

    db.commit()
    db.refresh(gift_card)
    return gift_card


def get_gift_card_by_claim_code(db: Session, claim_code: str) -> Optional[GiftCard]:
    return db.query(GiftCard).filter(GiftCard.claim_code == claim_code).first()


def get_gift_card_by_id(db: Session, gift_card_id: int) -> Optional[GiftCard]:
    return db.query(GiftCard).filter(GiftCard.id == gift_card_id).first()


def claim_gift_card(
    db: Session,
    gift_card: GiftCard,
    user_id: int,
    user_phone: Optional[str]
) -> GiftCard:
    now = datetime.utcnow()
    if gift_card.claim_expires_at and gift_card.claim_expires_at < now:
        gift_card.status = "expired"
        _create_transaction(
            db=db,
            gift_card=gift_card,
            user_id=gift_card.purchaser_id,
            transaction_type="expired",
            amount=0,
            note="Claim expired"
        )
        db.commit()
        db.refresh(gift_card)
        return gift_card

    if gift_card.recipient_phone and user_phone and gift_card.recipient_phone != user_phone:
        raise ValueError("Recipient phone mismatch")

    gift_card.user_id = user_id
    gift_card.status = "active"
    gift_card.claimed_by_user_id = user_id
    gift_card.claimed_at = now

    _create_transaction(
        db=db,
        gift_card=gift_card,
        user_id=user_id,
        transaction_type="transfer_claimed",
        amount=0,
        note="Gift card claimed"
    )

    db.commit()
    db.refresh(gift_card)
    return gift_card


def revoke_gift_card(db: Session, gift_card: GiftCard, user_id: int) -> GiftCard:
    if gift_card.purchaser_id != user_id:
        raise ValueError("Not authorized to revoke this gift card")

    gift_card.status = "revoked"
    _create_transaction(
        db=db,
        gift_card=gift_card,
        user_id=user_id,
        transaction_type="revoked",
        amount=0,
        note="Gift card revoked"
    )
    db.commit()
    db.refresh(gift_card)
    return gift_card


def expire_pending_transfers(db: Session) -> int:
    now = datetime.utcnow()
    pending_cards = (
        db.query(GiftCard)
        .filter(
            GiftCard.status == "pending_transfer",
            GiftCard.claim_expires_at.isnot(None),
            GiftCard.claim_expires_at < now
        )
        .all()
    )
    if not pending_cards:
        return 0

    for card in pending_cards:
        card.status = "expired"
        _create_transaction(
            db=db,
            gift_card=card,
            user_id=card.purchaser_id,
            transaction_type="expired",
            amount=0,
            note="Claim expired"
        )

    db.commit()
    return len(pending_cards)


def get_pending_transfers_expiring_soon(db: Session, within_hours: int = 72) -> List[GiftCard]:
    now = datetime.utcnow()
    soon = now + timedelta(hours=within_hours)
    return (
        db.query(GiftCard)
        .filter(
            GiftCard.status == "pending_transfer",
            GiftCard.claim_expires_at.isnot(None),
            GiftCard.claim_expires_at > now,
            GiftCard.claim_expires_at <= soon,
            GiftCard.transfer_expiry_notified == False
        )
        .all()
    )


def mark_transfer_expiry_notified(db: Session, gift_card: GiftCard) -> None:
    gift_card.transfer_expiry_notified = True
    db.add(gift_card)
