"""
Coupons API endpoints
"""
from datetime import datetime, time
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional
from app.api.deps import get_db, get_current_user, get_current_admin_user
from app.core.config import settings
from app.models.user import User
from app.models.user_coupon import CouponStatus
from app.models.user_coupon import UserCoupon
from app.models.coupon_phone_grant import CouponPhoneGrant
from app.schemas.coupons import (
    CouponResponse,
    CouponCreate,
    CouponUpdate,
    UserCouponResponse,
    ClaimCouponRequest,
    GrantCouponRequest,
    GrantCouponResult,
    GrantCouponBatchRequest,
    GrantCouponBatchResult,
    GrantCouponBatchItem,
    CouponPhoneGrantResponse,
)
from app.crud import coupons as crud_coupons
from app.crud import user as crud_user
from app.models.coupon import Coupon
from app.services.coupon_service import send_coupon_claim_sms
from app.services import notification_service
from app.services import log_service
from app.schemas.phone import normalize_us_phone


router = APIRouter()


def _today_start_utc() -> datetime:
    now = datetime.utcnow()
    return datetime.combine(now.date(), time.min)


def _coupon_today_grant_total_face_value(db: Session) -> float:
    """
    Global daily face value for admin coupon grants.
    Includes directly granted user coupons (source=admin) and pending phone grants.
    """
    start_at = _today_start_utc()
    direct_total = (
        db.query(func.coalesce(func.sum(Coupon.discount_value), 0.0))
        .select_from(UserCoupon)
        .join(Coupon, Coupon.id == UserCoupon.coupon_id)
        .filter(
            UserCoupon.source == "admin",
            UserCoupon.obtained_at >= start_at,
        )
        .scalar()
        or 0.0
    )
    pending_total = (
        db.query(func.coalesce(func.sum(Coupon.discount_value), 0.0))
        .select_from(CouponPhoneGrant)
        .join(Coupon, Coupon.id == CouponPhoneGrant.coupon_id)
        .filter(CouponPhoneGrant.granted_at >= start_at)
        .scalar()
        or 0.0
    )
    return float(direct_total or 0.0) + float(pending_total or 0.0)


def _enforce_coupon_grant_guardrails(
    db: Session,
    *,
    coupon: Coupon,
    requested_count: int,
) -> None:
    if coupon.is_active is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Coupon template is inactive")

    face_value = float(coupon.discount_value or 0.0)
    if face_value <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Coupon face value must be greater than 0")

    if face_value > settings.ADMIN_COUPON_GRANT_MAX_FACE_VALUE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Coupon face value exceeds limit (${settings.ADMIN_COUPON_GRANT_MAX_FACE_VALUE:g}). "
                "Please reduce discount value or adjust security threshold."
            ),
        )

    projected = _coupon_today_grant_total_face_value(db) + face_value * max(requested_count, 1)
    if projected > settings.ADMIN_COUPON_GRANT_DAILY_TOTAL_FACE_VALUE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Daily coupon grant total limit exceeded (${settings.ADMIN_COUPON_GRANT_DAILY_TOTAL_FACE_VALUE:g}). "
                "Please try tomorrow or reduce grant amount/count."
            ),
        )


def _grant_coupon_for_phone(
    db: Session,
    phone: str,
    coupon_id: int,
    operator_user_id: Optional[int],
) -> GrantCouponResult:
    user = crud_user.get_by_phone(db, phone=phone)
    if user:
        user_coupon = crud_coupons.claim_coupon(
            db=db,
            user_id=user.id,
            coupon_id=coupon_id,
            source="admin"
        )
        coupon = crud_coupons.get_coupon(db, coupon_id)
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
        return GrantCouponResult(
            status="granted",
            detail="Coupon granted to registered user",
            sms_sent=False,
            user_coupon_id=user_coupon.id,
        )

    pending = crud_coupons.create_phone_pending_grant(
        db=db,
        phone=phone,
        coupon_id=coupon_id,
        granted_by_user_id=operator_user_id,
    )
    coupon = crud_coupons.get_coupon(db, coupon_id)
    coupon_name = coupon.name if coupon else f"coupon #{coupon_id}"
    sms_sent = send_coupon_claim_sms(
        phone=phone,
        coupon_name=coupon_name,
        expires_at=pending.claim_expires_at,
    ) if pending.claim_expires_at else False
    return GrantCouponResult(
        status="pending_claim",
        detail=f"Phone not registered yet. Coupon {coupon_name} saved as pending claim.",
        sms_sent=sms_sent,
        pending_grant_id=pending.id,
    )


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


@router.get("/", response_model=List[CouponResponse])
def get_coupons(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    active_only: Optional[bool] = None,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get coupon templates (admin only)
    """
    coupons = crud_coupons.get_coupons(db, skip=skip, limit=limit, active_only=active_only)
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
    http_request: Request,
    coupon: CouponCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Create new coupon template (admin only)
    """
    coupon_data = coupon.dict()
    try:
        new_coupon = crud_coupons.create_coupon(db, coupon_data)
        log_service.create_audit_log(
            db,
            request=http_request,
            operator_user_id=current_user.id,
            module="coupons",
            action="coupon.template.create",
            message="创建优惠券模板",
            target_type="coupon",
            target_id=str(new_coupon.id),
            after={
                "coupon_id": new_coupon.id,
                "name": new_coupon.name,
                "type": str(new_coupon.type.value if hasattr(new_coupon.type, "value") else new_coupon.type),
                "discount_value": float(new_coupon.discount_value or 0),
                "min_amount": float(new_coupon.min_amount or 0),
                "valid_days": int(new_coupon.valid_days or 0),
            },
        )
        return new_coupon
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.patch("/id/{coupon_id}", response_model=CouponResponse)
def update_coupon(
    coupon_id: int,
    http_request: Request,
    payload: CouponUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    update_data = payload.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    before = crud_coupons.get_coupon(db, coupon_id)
    if not before:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")
    before_snapshot = {
        "name": before.name,
        "description": before.description,
        "type": str(before.type.value if hasattr(before.type, "value") else before.type),
        "category": str(before.category.value if hasattr(before.category, "value") else before.category),
        "discount_value": float(before.discount_value or 0),
        "min_amount": float(before.min_amount or 0),
        "max_discount": before.max_discount,
        "valid_days": int(before.valid_days or 0),
        "is_active": bool(before.is_active),
    }

    try:
        updated = crud_coupons.update_coupon(db, coupon_id, update_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    log_service.create_audit_log(
        db,
        request=http_request,
        operator_user_id=current_user.id,
        module="coupons",
        action="coupon.template.update",
        message="更新优惠券模板",
        target_type="coupon",
        target_id=str(updated.id),
        before=before_snapshot,
        after={
            "name": updated.name,
            "description": updated.description,
            "type": str(updated.type.value if hasattr(updated.type, "value") else updated.type),
            "category": str(updated.category.value if hasattr(updated.category, "value") else updated.category),
            "discount_value": float(updated.discount_value or 0),
            "min_amount": float(updated.min_amount or 0),
            "max_discount": updated.max_discount,
            "valid_days": int(updated.valid_days or 0),
            "is_active": bool(updated.is_active),
        },
    )
    return updated


@router.post("/grant", response_model=GrantCouponResult)
def grant_coupon_to_user(
    http_request: Request,
    payload: GrantCouponRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Grant coupon to a specific user by phone (admin only).
    """
    try:
        coupon = crud_coupons.get_coupon(db, payload.coupon_id)
        if not coupon:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")
        _enforce_coupon_grant_guardrails(db, coupon=coupon, requested_count=1)

        result = _grant_coupon_for_phone(
            db=db,
            phone=payload.phone,
            coupon_id=payload.coupon_id,
            operator_user_id=current_user.id,
        )
        log_service.create_audit_log(
            db,
            request=http_request,
            operator_user_id=current_user.id,
            module="coupons",
            action="coupon.grant.phone",
            message="按手机号发放优惠券",
            target_type="coupon",
            target_id=str(payload.coupon_id),
            after={
                "phone": payload.phone,
                "coupon_id": payload.coupon_id,
                "coupon_name": coupon.name if coupon else None,
                "discount_value": float(coupon.discount_value or 0) if coupon else None,
                "result_status": result.status,
                "sms_sent": result.sms_sent,
                "user_coupon_id": result.user_coupon_id,
                "pending_grant_id": result.pending_grant_id,
            },
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/grant/batch", response_model=GrantCouponBatchResult)
def grant_coupon_batch(
    http_request: Request,
    payload: GrantCouponBatchRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    if not payload.phones:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="phones is required")
    if len(payload.phones) > settings.ADMIN_COUPON_BATCH_MAX_RECIPIENTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch recipients exceed limit ({settings.ADMIN_COUPON_BATCH_MAX_RECIPIENTS})",
        )

    coupon = crud_coupons.get_coupon(db, payload.coupon_id)
    if not coupon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")

    _enforce_coupon_grant_guardrails(db, coupon=coupon, requested_count=len(payload.phones))

    items: List[GrantCouponBatchItem] = []
    seen = set()

    for raw_phone in payload.phones:
        input_phone = str(raw_phone or "").strip()
        if not input_phone:
            continue

        try:
            normalized = normalize_us_phone(input_phone, "Invalid US phone format")
        except ValueError as exc:
            items.append(GrantCouponBatchItem(
                input_phone=input_phone,
                status="failed",
                detail=str(exc),
            ))
            continue

        if normalized in seen:
            items.append(GrantCouponBatchItem(
                input_phone=input_phone,
                normalized_phone=normalized,
                status="failed",
                detail="Duplicate phone in this batch",
            ))
            continue
        seen.add(normalized)

        try:
            result = _grant_coupon_for_phone(
                db=db,
                phone=normalized,
                coupon_id=payload.coupon_id,
                operator_user_id=current_user.id,
            )
            items.append(GrantCouponBatchItem(
                input_phone=input_phone,
                normalized_phone=normalized,
                status=result.status,
                detail=result.detail,
                sms_sent=result.sms_sent,
                user_coupon_id=result.user_coupon_id,
                pending_grant_id=result.pending_grant_id,
            ))
        except ValueError as exc:
            items.append(GrantCouponBatchItem(
                input_phone=input_phone,
                normalized_phone=normalized,
                status="failed",
                detail=str(exc),
            ))

    granted_count = sum(1 for item in items if item.status == "granted")
    pending_count = sum(1 for item in items if item.status == "pending_claim")
    failed_count = sum(1 for item in items if item.status == "failed")

    result = GrantCouponBatchResult(
        total=len(items),
        granted_count=granted_count,
        pending_count=pending_count,
        failed_count=failed_count,
        items=items,
    )
    log_service.create_audit_log(
        db,
        request=http_request,
        operator_user_id=current_user.id,
        module="coupons",
        action="coupon.grant.batch",
        message="批量按手机号发放优惠券",
        target_type="coupon",
        target_id=str(payload.coupon_id),
        after={
            "coupon_id": payload.coupon_id,
            "coupon_name": coupon.name if coupon else None,
            "discount_value": float(coupon.discount_value or 0) if coupon else None,
            "total": result.total,
            "granted_count": result.granted_count,
            "pending_count": result.pending_count,
            "failed_count": result.failed_count,
        },
        meta={"items": [item.dict() for item in result.items]},
    )
    return result


@router.get("/pending-grants", response_model=List[CouponPhoneGrantResponse])
def get_coupon_pending_grants(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    crud_coupons.expire_phone_pending_grants(db)
    rows = crud_coupons.list_phone_pending_grants(db=db, status=status, skip=skip, limit=limit)
    coupon_ids = {row.coupon_id for row in rows}
    coupon_map = {}
    if coupon_ids:
        coupon_map = {row.id: row.name for row in db.query(Coupon).filter(Coupon.id.in_(coupon_ids)).all()}
    return [
        CouponPhoneGrantResponse(
            id=row.id,
            coupon_id=row.coupon_id,
            coupon_name=coupon_map.get(row.coupon_id),
            phone=row.phone,
            status=row.status,
            note=row.note,
            granted_by_user_id=row.granted_by_user_id,
            granted_at=row.granted_at,
            claim_expires_at=row.claim_expires_at,
            claimed_user_id=row.claimed_user_id,
            claimed_at=row.claimed_at,
            user_coupon_id=row.user_coupon_id,
        )
        for row in rows
    ]


@router.post("/pending-grants/{grant_id}/revoke", response_model=CouponPhoneGrantResponse)
def revoke_coupon_pending_grant(
    grant_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    row = crud_coupons.revoke_phone_pending_grant(db=db, grant_id=grant_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pending grant not found")
    coupon = crud_coupons.get_coupon(db, row.coupon_id)
    return CouponPhoneGrantResponse(
        id=row.id,
        coupon_id=row.coupon_id,
        coupon_name=coupon.name if coupon else None,
        phone=row.phone,
        status=row.status,
        note=row.note,
        granted_by_user_id=row.granted_by_user_id,
        granted_at=row.granted_at,
        claim_expires_at=row.claim_expires_at,
        claimed_user_id=row.claimed_user_id,
        claimed_at=row.claimed_at,
        user_coupon_id=row.user_coupon_id,
    )


@router.get("/id/{coupon_id}", response_model=CouponResponse)
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
