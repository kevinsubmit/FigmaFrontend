"""
Coupons CRUD operations
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.coupon import Coupon, CouponType, CouponCategory
from app.models.user_coupon import UserCoupon, CouponStatus
from app.crud import points as crud_points
from typing import List, Optional
from datetime import datetime, timedelta


def get_coupon(db: Session, coupon_id: int) -> Optional[Coupon]:
    """Get coupon by ID"""
    return db.query(Coupon).filter(Coupon.id == coupon_id).first()


def get_active_coupons(db: Session, skip: int = 0, limit: int = 50) -> List[Coupon]:
    """Get all active coupons"""
    return db.query(Coupon)\
        .filter(Coupon.is_active == True)\
        .offset(skip)\
        .limit(limit)\
        .all()


def get_exchangeable_coupons(db: Session) -> List[Coupon]:
    """Get coupons that can be exchanged with points"""
    return db.query(Coupon)\
        .filter(
            and_(
                Coupon.is_active == True,
                Coupon.points_required.isnot(None)
            )
        )\
        .all()


def create_coupon(db: Session, coupon_data: dict) -> Coupon:
    """Create new coupon template"""
    coupon = Coupon(**coupon_data)
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon


def get_user_coupons(
    db: Session,
    user_id: int,
    status: Optional[CouponStatus] = None,
    skip: int = 0,
    limit: int = 50
) -> List[UserCoupon]:
    """Get user's coupons"""
    query = db.query(UserCoupon).filter(UserCoupon.user_id == user_id)
    
    if status:
        query = query.filter(UserCoupon.status == status)
    
    return query\
        .order_by(UserCoupon.obtained_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()


def get_user_coupon(db: Session, user_coupon_id: int, user_id: int) -> Optional[UserCoupon]:
    """Get specific user coupon"""
    return db.query(UserCoupon)\
        .filter(
            and_(
                UserCoupon.id == user_coupon_id,
                UserCoupon.user_id == user_id
            )
        )\
        .first()


def claim_coupon(
    db: Session,
    user_id: int,
    coupon_id: int,
    source: str = "system"
) -> UserCoupon:
    """Claim a coupon for user"""
    # Get coupon
    coupon = get_coupon(db, coupon_id)
    if not coupon:
        raise ValueError("Coupon not found")
    
    if not coupon.is_active:
        raise ValueError("Coupon is not active")
    
    # Check quantity limit
    if coupon.total_quantity is not None:
        if coupon.claimed_quantity >= coupon.total_quantity:
            raise ValueError("Coupon is sold out")
    
    # Calculate expiration date
    expires_at = datetime.utcnow() + timedelta(days=coupon.valid_days)
    
    # Create user coupon
    user_coupon = UserCoupon(
        user_id=user_id,
        coupon_id=coupon_id,
        status=CouponStatus.AVAILABLE,
        source=source,
        expires_at=expires_at
    )
    
    # Update claimed quantity
    coupon.claimed_quantity += 1
    
    db.add(user_coupon)
    db.commit()
    db.refresh(user_coupon)
    
    return user_coupon


def exchange_coupon_with_points(
    db: Session,
    user_id: int,
    coupon_id: int
) -> UserCoupon:
    """Exchange points for coupon"""
    # Get coupon
    coupon = get_coupon(db, coupon_id)
    if not coupon:
        raise ValueError("Coupon not found")
    
    if not coupon.is_active:
        raise ValueError("Coupon is not active")
    
    if coupon.points_required is None:
        raise ValueError("This coupon cannot be exchanged with points")
    
    # Check user points
    user_points = crud_points.get_user_points(db, user_id)
    if not user_points or user_points.available_points < coupon.points_required:
        raise ValueError(f"Insufficient points. Required: {coupon.points_required}")
    
    # Spend points
    crud_points.spend_points(
        db=db,
        user_id=user_id,
        amount=coupon.points_required,
        reason="Exchange for coupon",
        description=f"Exchanged {coupon.points_required} points for {coupon.name}",
        reference_type="coupon",
        reference_id=coupon_id
    )
    
    # Claim coupon
    user_coupon = claim_coupon(db, user_id, coupon_id, source="points")
    
    return user_coupon


def use_coupon(
    db: Session,
    user_coupon_id: int,
    user_id: int,
    appointment_id: int
) -> UserCoupon:
    """Mark coupon as used"""
    # Get user coupon
    user_coupon = get_user_coupon(db, user_coupon_id, user_id)
    if not user_coupon:
        raise ValueError("Coupon not found")
    
    if user_coupon.status != CouponStatus.AVAILABLE:
        raise ValueError(f"Coupon is not available (status: {user_coupon.status})")
    
    # Check expiration
    if user_coupon.expires_at < datetime.utcnow():
        user_coupon.status = CouponStatus.EXPIRED
        db.commit()
        raise ValueError("Coupon has expired")
    
    # Mark as used
    user_coupon.status = CouponStatus.USED
    user_coupon.used_at = datetime.utcnow()
    user_coupon.appointment_id = appointment_id
    
    db.commit()
    db.refresh(user_coupon)
    
    return user_coupon


def expire_coupons(db: Session) -> int:
    """Expire all coupons that have passed their expiration date"""
    now = datetime.utcnow()
    
    expired_count = db.query(UserCoupon)\
        .filter(
            and_(
                UserCoupon.status == CouponStatus.AVAILABLE,
                UserCoupon.expires_at < now
            )
        )\
        .update({"status": CouponStatus.EXPIRED})
    
    db.commit()
    
    return expired_count


def calculate_discount(coupon: Coupon, original_amount: float) -> float:
    """Calculate discount amount for a coupon"""
    if original_amount < coupon.min_amount:
        return 0
    
    if coupon.type == CouponType.FIXED_AMOUNT:
        # Fixed amount discount
        return min(coupon.discount_value, original_amount)
    
    elif coupon.type == CouponType.PERCENTAGE:
        # Percentage discount
        discount = original_amount * (coupon.discount_value / 100)
        
        # Apply max discount limit if exists
        if coupon.max_discount:
            discount = min(discount, coupon.max_discount)
        
        return discount
    
    return 0
