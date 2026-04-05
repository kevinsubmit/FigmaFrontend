"""Points CRUD operations."""
from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional
from zoneinfo import ZoneInfo

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.daily_checkin import DailyCheckIn
from app.models.point_transaction import PointTransaction, TransactionType
from app.models.user_points import UserPoints


DAILY_CHECKIN_REASON = "Daily check-in"
DAILY_CHECKIN_DESCRIPTION = "Daily check-in reward"
DAILY_CHECKIN_REFERENCE_TYPE = "daily_checkin"


def current_daily_checkin_date() -> date:
    """Return today's check-in date in the configured business timezone."""
    return datetime.now(ZoneInfo(settings.daily_checkin_timezone)).date()


def get_or_create_user_points(db: Session, user_id: int, *, autocommit: bool = True) -> UserPoints:
    """Get or create user points record."""
    user_points = db.query(UserPoints).filter(UserPoints.user_id == user_id).first()
    if not user_points:
        user_points = UserPoints(user_id=user_id, total_points=0, available_points=0)
        db.add(user_points)
        if autocommit:
            db.commit()
            db.refresh(user_points)
        else:
            db.flush()
    return user_points


def get_user_points(db: Session, user_id: int) -> Optional[UserPoints]:
    """Get user points balance."""
    return db.query(UserPoints).filter(UserPoints.user_id == user_id).first()


def add_points(
    db: Session,
    user_id: int,
    amount: int,
    reason: str,
    description: Optional[str] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[int] = None,
    *,
    autocommit: bool = True,
) -> PointTransaction:
    """Add points to user account."""
    user_points = get_or_create_user_points(db, user_id, autocommit=autocommit)

    user_points.total_points += amount
    user_points.available_points += amount
    user_points.updated_at = datetime.utcnow()

    transaction = PointTransaction(
        user_points_id=user_points.id,
        amount=amount,
        type=TransactionType.EARN,
        reason=reason,
        description=description,
        reference_type=reference_type,
        reference_id=reference_id,
    )

    db.add(transaction)
    if autocommit:
        db.commit()
        db.refresh(transaction)
        db.refresh(user_points)
    else:
        db.flush()

    return transaction


def spend_points(
    db: Session,
    user_id: int,
    amount: int,
    reason: str,
    description: Optional[str] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[int] = None,
    *,
    autocommit: bool = True,
) -> PointTransaction:
    """Spend points from user account."""
    user_points = get_or_create_user_points(db, user_id, autocommit=autocommit)

    if user_points.available_points < amount:
        raise ValueError(f"Insufficient points. Available: {user_points.available_points}, Required: {amount}")

    user_points.available_points -= amount
    user_points.updated_at = datetime.utcnow()

    transaction = PointTransaction(
        user_points_id=user_points.id,
        amount=-amount,
        type=TransactionType.SPEND,
        reason=reason,
        description=description,
        reference_type=reference_type,
        reference_id=reference_id,
    )

    db.add(transaction)
    if autocommit:
        db.commit()
        db.refresh(transaction)
        db.refresh(user_points)
    else:
        db.flush()

    return transaction


def get_point_transactions(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 50,
) -> List[PointTransaction]:
    """Get user's point transaction history."""
    user_points = get_user_points(db, user_id)
    if not user_points:
        return []

    return (
        db.query(PointTransaction)
        .filter(PointTransaction.user_points_id == user_points.id)
        .order_by(PointTransaction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_daily_checkin_for_date(db: Session, user_id: int, checkin_date: date) -> Optional[DailyCheckIn]:
    return (
        db.query(DailyCheckIn)
        .filter(DailyCheckIn.user_id == user_id, DailyCheckIn.checkin_date == checkin_date)
        .first()
    )


def get_daily_checkin_status(db: Session, user_id: int) -> dict:
    reward_points = settings.daily_checkin_reward_points
    today = current_daily_checkin_date()
    checkin = get_daily_checkin_for_date(db, user_id, today)
    return {
        "checked_in_today": checkin is not None,
        "reward_points": reward_points,
        "checkin_date": today,
        "checked_in_at": checkin.created_at if checkin else None,
    }


def claim_daily_checkin(db: Session, user_id: int) -> dict:
    reward_points = settings.daily_checkin_reward_points
    today = current_daily_checkin_date()
    existing = get_daily_checkin_for_date(db, user_id, today)
    if existing is not None:
        user_points = get_or_create_user_points(db, user_id)
        return {
            "checked_in_today": True,
            "reward_points": reward_points,
            "awarded_points": 0,
            "checkin_date": today,
            "checked_in_at": existing.created_at,
            "available_points": user_points.available_points,
            "total_points": user_points.total_points,
        }

    try:
        user_points = get_or_create_user_points(db, user_id, autocommit=False)
        daily_checkin = DailyCheckIn(
            user_id=user_id,
            checkin_date=today,
            points_awarded=reward_points,
        )
        db.add(daily_checkin)
        db.flush()

        add_points(
            db=db,
            user_id=user_id,
            amount=reward_points,
            reason=DAILY_CHECKIN_REASON,
            description=DAILY_CHECKIN_DESCRIPTION,
            reference_type=DAILY_CHECKIN_REFERENCE_TYPE,
            reference_id=daily_checkin.id,
            autocommit=False,
        )
        db.commit()
        db.refresh(daily_checkin)
        db.refresh(user_points)
        return {
            "checked_in_today": True,
            "reward_points": reward_points,
            "awarded_points": reward_points,
            "checkin_date": today,
            "checked_in_at": daily_checkin.created_at,
            "available_points": user_points.available_points,
            "total_points": user_points.total_points,
        }
    except IntegrityError:
        db.rollback()
        existing = get_daily_checkin_for_date(db, user_id, today)
        user_points = get_or_create_user_points(db, user_id)
        return {
            "checked_in_today": True,
            "reward_points": reward_points,
            "awarded_points": 0,
            "checkin_date": today,
            "checked_in_at": existing.created_at if existing else None,
            "available_points": user_points.available_points,
            "total_points": user_points.total_points,
        }


def award_points_for_appointment(db: Session, user_id: int, appointment_id: int, amount_spent: float) -> Optional[PointTransaction]:
    """Award points for completed appointment (1 point per $1 spent)."""
    existing = (
        db.query(PointTransaction)
        .join(UserPoints)
        .filter(
            UserPoints.user_id == user_id,
            PointTransaction.reference_type == "appointment",
            PointTransaction.reference_id == appointment_id,
            PointTransaction.type == TransactionType.EARN,
        )
        .first()
    )
    if existing:
        return None

    points_to_award = int(amount_spent)
    if points_to_award <= 0:
        return None

    return add_points(
        db=db,
        user_id=user_id,
        amount=points_to_award,
        reason="Appointment completed",
        description=f"Earned {points_to_award} points from appointment",
        reference_type="appointment",
        reference_id=appointment_id,
    )
