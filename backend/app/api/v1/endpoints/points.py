"""
Points API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.points import PointsBalance, PointTransactionResponse
from app.crud import points as crud_points


router = APIRouter()


@router.get("/balance", response_model=PointsBalance)
def get_points_balance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's points balance
    """
    user_points = crud_points.get_or_create_user_points(db, current_user.id)
    return user_points


@router.get("/transactions", response_model=List[PointTransactionResponse])
def get_point_transactions(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's point transaction history
    """
    transactions = crud_points.get_point_transactions(db, current_user.id, skip, limit)
    return transactions


@router.post("/test-award")
def test_award_points(
    amount: float,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Test endpoint: Award points for testing (will be removed in production)
    """
    transaction = crud_points.add_points(
        db=db,
        user_id=current_user.id,
        amount=int(amount),
        reason="Test award",
        description=f"Test: Awarded {int(amount)} points"
    )
    
    user_points = crud_points.get_user_points(db, current_user.id)
    
    return {
        "message": "Points awarded successfully",
        "transaction_id": transaction.id,
        "points_awarded": int(amount),
        "new_balance": user_points.available_points
    }
