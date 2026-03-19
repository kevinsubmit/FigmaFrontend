"""
Profile summary endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.api.v1.endpoints.vip import build_vip_status
from app.crud import coupons as crud_coupons
from app.crud import notification as crud_notification
from app.crud import pin_favorite as crud_pin_favorite
from app.crud import points as crud_points
from app.models.gift_card import GiftCard
from app.models.review import Review
from app.models.user import User
from app.models.user_coupon import CouponStatus, UserCoupon
from app.schemas.profile import ProfileSummaryResponse


router = APIRouter()


def _get_available_coupon_count(db: Session, user_id: int) -> int:
    crud_coupons.expire_coupons(db)
    return int(
        db.query(func.count(UserCoupon.id))
        .filter(
            UserCoupon.user_id == user_id,
            UserCoupon.status == CouponStatus.AVAILABLE,
        )
        .scalar()
        or 0
    )


def _get_non_expired_gift_balance(db: Session, user_id: int) -> float:
    total_balance = (
        db.query(func.coalesce(func.sum(GiftCard.balance), 0.0))
        .filter(
            GiftCard.user_id == user_id,
            GiftCard.status != "expired",
        )
        .scalar()
        or 0.0
    )
    return float(max(total_balance, 0.0))


@router.get("/summary", response_model=ProfileSummaryResponse)
def get_profile_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the lightweight summary used by mobile profile center cards.
    """
    unread_count = crud_notification.get_unread_count(db, user_id=current_user.id)
    points_balance = crud_points.get_or_create_user_points(db, current_user.id)
    favorite_count = crud_pin_favorite.get_favorite_count(db, user_id=current_user.id)
    vip_status = build_vip_status(db=db, user_id=current_user.id)
    coupon_count = _get_available_coupon_count(db, user_id=current_user.id)
    gift_balance = _get_non_expired_gift_balance(db, user_id=current_user.id)
    review_count = int(
        db.query(func.count(Review.id))
        .filter(Review.user_id == current_user.id)
        .scalar()
        or 0
    )

    return ProfileSummaryResponse(
        unread_count=unread_count,
        points=int(points_balance.available_points or 0),
        favorite_count=int(favorite_count or 0),
        completed_orders=int(vip_status.total_visits or 0),
        vip_status=vip_status,
        coupon_count=coupon_count,
        gift_balance=gift_balance,
        review_count=review_count,
    )
