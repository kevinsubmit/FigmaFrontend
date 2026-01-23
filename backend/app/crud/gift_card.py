"""
Gift card CRUD operations
"""
from typing import List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.gift_card import GiftCard


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
