"""
Gift cards endpoints
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.gift_card import GiftCardResponse, GiftCardSummary
from app.crud import gift_card as crud_gift_cards

router = APIRouter()


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
