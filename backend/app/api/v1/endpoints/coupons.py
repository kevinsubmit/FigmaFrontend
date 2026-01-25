"""
Coupons API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.api.deps import get_db, get_current_user, get_current_admin_user
from app.models.user import User
from app.models.user_coupon import CouponStatus
from app.schemas.coupons import (
    CouponResponse,
    CouponCreate,
    UserCouponResponse,
    ClaimCouponRequest,
    GrantCouponRequest
)
from app.crud import coupons as crud_coupons
from app.crud import user as crud_user
from app.services import notification_service


router = APIRouter()


@router.get("/available", response_model=List[CouponResponse])
def get_available_coupons(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get all available coupons (public)
    """
    coupons = crud_coupons.get_active_coupons(db, skip, limit)
    return coupons


@router.get("/exchangeable", response_model=List[CouponResponse])
def get_exchangeable_coupons(
    db: Session = Depends(get_db)
):
    """
    Get coupons that can be exchanged with points
    """
    coupons = crud_coupons.get_exchangeable_coupons(db)
    return coupons


@router.get("/my-coupons", response_model=List[UserCouponResponse])
def get_my_coupons(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's coupons
    
    Query params:
    - status: Filter by status (available, used, expired)
    """
    # Convert status string to enum
    status_enum = None
    if status:
        try:
            status_enum = CouponStatus(status.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status}. Must be one of: available, used, expired"
            )
    
    # Expire old coupons first
    crud_coupons.expire_coupons(db)
    
    user_coupons = crud_coupons.get_user_coupons(db, current_user.id, status_enum, skip, limit)
    return user_coupons


@router.post("/claim", response_model=UserCouponResponse)
def claim_coupon(
    request: ClaimCouponRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Claim a coupon
    """
    try:
        user_coupon = crud_coupons.claim_coupon(
            db=db,
            user_id=current_user.id,
            coupon_id=request.coupon_id,
            source=request.source
        )
        return user_coupon
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/exchange/{coupon_id}", response_model=UserCouponResponse)
def exchange_coupon(
    coupon_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exchange points for coupon
    """
    try:
        user_coupon = crud_coupons.exchange_coupon_with_points(
            db=db,
            user_id=current_user.id,
            coupon_id=coupon_id
        )
        return user_coupon
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/create", response_model=CouponResponse)
def create_coupon(
    coupon: CouponCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Create new coupon template (admin only)
    """
    coupon_data = coupon.dict()
    new_coupon = crud_coupons.create_coupon(db, coupon_data)
    return new_coupon


@router.post("/grant", response_model=UserCouponResponse)
def grant_coupon_to_user(
    request: GrantCouponRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Grant coupon to a specific user by phone (admin only).
    """
    user = crud_user.get_by_phone(db, phone=request.phone)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    try:
        user_coupon = crud_coupons.claim_coupon(
            db=db,
            user_id=user.id,
            coupon_id=request.coupon_id,
            source="admin"
        )
        coupon = crud_coupons.get_coupon(db, request.coupon_id)
        if coupon:
            if coupon.type == "fixed_amount":
                discount_text = f"${coupon.discount_value:g} off"
            else:
                discount_text = f"{coupon.discount_value:g}% off"
            notification_service.notify_coupon_granted(
                db=db,
                user_id=user.id,
                coupon_name=coupon.name,
                discount_text=discount_text,
                expires_at=user_coupon.expires_at
            )
        return user_coupon
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{coupon_id}", response_model=CouponResponse)
def get_coupon(
    coupon_id: int,
    db: Session = Depends(get_db)
):
    """
    Get coupon details
    """
    coupon = crud_coupons.get_coupon(db, coupon_id)
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found"
        )
    return coupon
