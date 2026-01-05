"""
Points CRUD operations
"""
from sqlalchemy.orm import Session
from app.models.user_points import UserPoints
from app.models.point_transaction import PointTransaction, TransactionType
from typing import List, Optional
from datetime import datetime


def get_or_create_user_points(db: Session, user_id: int) -> UserPoints:
    """Get or create user points record"""
    user_points = db.query(UserPoints).filter(UserPoints.user_id == user_id).first()
    if not user_points:
        user_points = UserPoints(user_id=user_id, total_points=0, available_points=0)
        db.add(user_points)
        db.commit()
        db.refresh(user_points)
    return user_points


def get_user_points(db: Session, user_id: int) -> Optional[UserPoints]:
    """Get user points balance"""
    return db.query(UserPoints).filter(UserPoints.user_id == user_id).first()


def add_points(
    db: Session,
    user_id: int,
    amount: int,
    reason: str,
    description: Optional[str] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[int] = None
) -> PointTransaction:
    """Add points to user account"""
    # Get or create user points
    user_points = get_or_create_user_points(db, user_id)
    
    # Update points
    user_points.total_points += amount
    user_points.available_points += amount
    user_points.updated_at = datetime.utcnow()
    
    # Create transaction record
    transaction = PointTransaction(
        user_points_id=user_points.id,
        amount=amount,
        type=TransactionType.EARN,
        reason=reason,
        description=description,
        reference_type=reference_type,
        reference_id=reference_id
    )
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    db.refresh(user_points)
    
    return transaction


def spend_points(
    db: Session,
    user_id: int,
    amount: int,
    reason: str,
    description: Optional[str] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[int] = None
) -> PointTransaction:
    """Spend points from user account"""
    # Get user points
    user_points = get_or_create_user_points(db, user_id)
    
    # Check if user has enough points
    if user_points.available_points < amount:
        raise ValueError(f"Insufficient points. Available: {user_points.available_points}, Required: {amount}")
    
    # Update points
    user_points.available_points -= amount
    user_points.updated_at = datetime.utcnow()
    
    # Create transaction record (negative amount)
    transaction = PointTransaction(
        user_points_id=user_points.id,
        amount=-amount,
        type=TransactionType.SPEND,
        reason=reason,
        description=description,
        reference_type=reference_type,
        reference_id=reference_id
    )
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    db.refresh(user_points)
    
    return transaction


def get_point_transactions(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 50
) -> List[PointTransaction]:
    """Get user's point transaction history"""
    user_points = get_user_points(db, user_id)
    if not user_points:
        return []
    
    return db.query(PointTransaction)\
        .filter(PointTransaction.user_points_id == user_points.id)\
        .order_by(PointTransaction.created_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()


def award_points_for_appointment(db: Session, user_id: int, appointment_id: int, amount_spent: float) -> Optional[PointTransaction]:
    """Award points for completed appointment (1 point per $1 spent)"""
    points_to_award = int(amount_spent)  # $1 = 1 point
    
    if points_to_award <= 0:
        return None
    
    return add_points(
        db=db,
        user_id=user_id,
        amount=points_to_award,
        reason="Appointment completed",
        description=f"Earned {points_to_award} points from appointment",
        reference_type="appointment",
        reference_id=appointment_id
    )
