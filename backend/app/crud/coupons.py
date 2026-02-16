"""
Coupons CRUD operations
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from app.models.coupon import Coupon, CouponType, CouponCategory
from app.models.user_coupon import UserCoupon, CouponStatus
from app.models.coupon_phone_grant import CouponPhoneGrant
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


def get_coupons(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    active_only: Optional[bool] = None
) -> List[Coupon]:
    """Get coupons (optionally filter by active status)"""
    query = db.query(Coupon)
    if active_only is True:
        query = query.filter(Coupon.is_active == True)

    return query\
        .order_by(Coupon.created_at.desc())\
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
    normalized_name = (coupon_data.get("name") or "").strip()
    if not normalized_name:
        raise ValueError("Coupon name is required")

    duplicate_name = (
        db.query(Coupon)
        .filter(func.lower(func.trim(Coupon.name)) == normalized_name.lower())
        .first()
    )
    if duplicate_name:
        raise ValueError("Coupon name already exists")

    discount_value = float(coupon_data.get("discount_value") or 0)
    min_amount = float(coupon_data.get("min_amount") or 0)
    valid_days = int(coupon_data.get("valid_days") or 0)
    points_required = coupon_data.get("points_required")
    max_discount = coupon_data.get("max_discount")
    coupon_type = coupon_data.get("type")
    coupon_category = coupon_data.get("category")

    duplicate_rule_query = db.query(Coupon).filter(
        Coupon.type == coupon_type,
        Coupon.category == coupon_category,
        Coupon.discount_value == discount_value,
        Coupon.min_amount == min_amount,
        Coupon.valid_days == valid_days,
        Coupon.points_required == points_required,
    )
    if max_discount is None:
        duplicate_rule_query = duplicate_rule_query.filter(Coupon.max_discount.is_(None))
    else:
        duplicate_rule_query = duplicate_rule_query.filter(Coupon.max_discount == float(max_discount))
    duplicate_rule = duplicate_rule_query.first()
    if duplicate_rule:
        raise ValueError("Coupon rule already exists")

    coupon_data["name"] = normalized_name
    coupon = Coupon(**coupon_data)
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon


def update_coupon(db: Session, coupon_id: int, update_data: dict) -> Coupon:
    coupon = get_coupon(db, coupon_id)
    if not coupon:
        raise ValueError("Coupon not found")

    next_name = (update_data.get("name", coupon.name) or "").strip()
    if not next_name:
        raise ValueError("Coupon name is required")

    duplicate_name = (
        db.query(Coupon)
        .filter(
            func.lower(func.trim(Coupon.name)) == next_name.lower(),
            Coupon.id != coupon_id,
        )
        .first()
    )
    if duplicate_name:
        raise ValueError("Coupon name already exists")

    next_type = update_data.get("type", coupon.type)
    next_category = update_data.get("category", coupon.category)
    next_discount_value = float(update_data.get("discount_value", coupon.discount_value) or 0)
    next_min_amount = float(update_data.get("min_amount", coupon.min_amount) or 0)
    next_valid_days = int(update_data.get("valid_days", coupon.valid_days) or 0)
    next_points_required = update_data.get("points_required", coupon.points_required)
    next_max_discount = update_data.get("max_discount", coupon.max_discount)

    duplicate_rule_query = db.query(Coupon).filter(
        Coupon.id != coupon_id,
        Coupon.type == next_type,
        Coupon.category == next_category,
        Coupon.discount_value == next_discount_value,
        Coupon.min_amount == next_min_amount,
        Coupon.valid_days == next_valid_days,
        Coupon.points_required == next_points_required,
    )
    if next_max_discount is None:
        duplicate_rule_query = duplicate_rule_query.filter(Coupon.max_discount.is_(None))
    else:
        duplicate_rule_query = duplicate_rule_query.filter(Coupon.max_discount == float(next_max_discount))
    duplicate_rule = duplicate_rule_query.first()
    if duplicate_rule:
        raise ValueError("Coupon rule already exists")

    for key, value in update_data.items():
        setattr(coupon, key, value)
    coupon.name = next_name
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


def create_phone_pending_grant(
    db: Session,
    phone: str,
    coupon_id: int,
    granted_by_user_id: Optional[int] = None,
    claim_days: int = 30,
) -> CouponPhoneGrant:
    """Create a pending coupon grant for a phone that is not yet registered."""
    coupon = get_coupon(db, coupon_id)
    if not coupon:
        raise ValueError("Coupon not found")
    if not coupon.is_active:
        raise ValueError("Coupon is not active")

    if coupon.total_quantity is not None and coupon.claimed_quantity >= coupon.total_quantity:
        raise ValueError("Coupon is sold out")

    now = datetime.utcnow()
    existing = (
        db.query(CouponPhoneGrant)
        .filter(
            CouponPhoneGrant.phone == phone,
            CouponPhoneGrant.coupon_id == coupon_id,
            CouponPhoneGrant.status == "pending",
            CouponPhoneGrant.claim_expires_at > now,
        )
        .first()
    )
    if existing:
        return existing

    grant = CouponPhoneGrant(
        phone=phone,
        coupon_id=coupon_id,
        status="pending",
        granted_by_user_id=granted_by_user_id,
        claim_expires_at=now + timedelta(days=claim_days),
    )
    db.add(grant)
    db.commit()
    db.refresh(grant)
    return grant


def list_phone_pending_grants(
    db: Session,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[CouponPhoneGrant]:
    query = db.query(CouponPhoneGrant)
    if status:
        query = query.filter(CouponPhoneGrant.status == status)
    return query.order_by(CouponPhoneGrant.granted_at.desc()).offset(skip).limit(limit).all()


def revoke_phone_pending_grant(db: Session, grant_id: int) -> Optional[CouponPhoneGrant]:
    grant = db.query(CouponPhoneGrant).filter(CouponPhoneGrant.id == grant_id).first()
    if not grant:
        return None
    if grant.status in {"claimed", "revoked"}:
        return grant
    grant.status = "revoked"
    grant.note = "Revoked by admin"
    db.add(grant)
    db.commit()
    db.refresh(grant)
    return grant


def expire_phone_pending_grants(db: Session) -> int:
    now = datetime.utcnow()
    rows = (
        db.query(CouponPhoneGrant)
        .filter(
            CouponPhoneGrant.status == "pending",
            CouponPhoneGrant.claim_expires_at.isnot(None),
            CouponPhoneGrant.claim_expires_at < now,
        )
        .all()
    )
    for row in rows:
        row.status = "expired"
        row.note = "Pending grant expired"
    if rows:
        db.commit()
    return len(rows)


def claim_phone_pending_grants(db: Session, user_id: int, phone: str) -> int:
    """
    Claim all valid pending phone grants for a newly registered/logged-in user.
    Returns number of successfully claimed coupons.
    """
    expire_phone_pending_grants(db)
    rows = (
        db.query(CouponPhoneGrant)
        .filter(
            CouponPhoneGrant.phone == phone,
            CouponPhoneGrant.status == "pending",
        )
        .order_by(CouponPhoneGrant.granted_at.asc())
        .all()
    )
    if not rows:
        return 0

    now = datetime.utcnow()
    claimed = 0
    for row in rows:
        coupon = get_coupon(db, row.coupon_id)
        if not coupon or not coupon.is_active:
            row.status = "revoked"
            row.note = "Coupon inactive or removed before claim"
            continue
        if coupon.total_quantity is not None and coupon.claimed_quantity >= coupon.total_quantity:
            row.status = "revoked"
            row.note = "Coupon sold out before claim"
            continue

        user_coupon = UserCoupon(
            user_id=user_id,
            coupon_id=row.coupon_id,
            status=CouponStatus.AVAILABLE,
            source="phone_pending",
            expires_at=now + timedelta(days=coupon.valid_days),
        )
        db.add(user_coupon)
        db.flush()

        coupon.claimed_quantity += 1
        row.status = "claimed"
        row.claimed_user_id = user_id
        row.claimed_at = now
        row.user_coupon_id = user_coupon.id
        row.note = "Claimed automatically after register/login"
        claimed += 1

    db.commit()
    return claimed


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
