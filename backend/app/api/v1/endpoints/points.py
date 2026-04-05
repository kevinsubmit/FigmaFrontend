"""Points API endpoints."""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.crud import points as crud_points
from app.models.user import User
from app.schemas.points import (
    DailyCheckInClaimResponse,
    DailyCheckInStatusResponse,
    PointTransactionResponse,
    PointsBalance,
)


router = APIRouter()


@router.get("/balance", response_model=PointsBalance)
def get_points_balance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's points balance."""
    return crud_points.get_or_create_user_points(db, current_user.id)


@router.get("/transactions", response_model=List[PointTransactionResponse])
def get_point_transactions(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's point transaction history."""
    return crud_points.get_point_transactions(db, current_user.id, skip, limit)


@router.get("/daily-checkin/status", response_model=DailyCheckInStatusResponse)
def get_daily_checkin_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's daily check-in status for today."""
    return crud_points.get_daily_checkin_status(db, current_user.id)


@router.post("/daily-checkin", response_model=DailyCheckInClaimResponse)
def claim_daily_checkin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Claim today's daily check-in reward. Safe to retry; awards only once per day."""
    return crud_points.claim_daily_checkin(db, current_user.id)


@router.post("/test-award")
def test_award_points(
    amount: float,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Test endpoint: Award points for testing (will be removed in production)."""
    transaction = crud_points.add_points(
        db=db,
        user_id=current_user.id,
        amount=int(amount),
        reason="Test award",
        description=f"Test: Awarded {int(amount)} points",
    )

    user_points = crud_points.get_user_points(db, current_user.id)

    return {
        "message": "Points awarded successfully",
        "transaction_id": transaction.id,
        "points_awarded": int(amount),
        "new_balance": user_points.available_points if user_points else 0,
    }
