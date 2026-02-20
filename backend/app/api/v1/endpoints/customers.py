"""
Customer management admin endpoints
"""
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import and_, case, func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_store_admin, get_db
from app.models.appointment import Appointment
from app.models.coupon import Coupon
from app.models.gift_card import GiftCard
from app.models.point_transaction import PointTransaction
from app.models.risk import UserRiskState
from app.models.service import Service
from app.models.store import Store
from app.models.user_coupon import UserCoupon
from app.models.user_points import UserPoints
from app.models.user import User
from app.services import log_service
from app.utils.phone_privacy import mask_phone, validate_keyword_min_length

router = APIRouter()


class CustomerListItem(BaseModel):
    id: int
    name: str
    phone: str
    registered_at: datetime
    last_login_at: Optional[datetime] = None
    total_appointments: int
    completed_count: int
    cancelled_count: int
    no_show_count: int
    next_appointment_at: Optional[datetime] = None
    risk_level: str = "normal"
    restricted_until: Optional[datetime] = None
    status: str


class CustomerListResponse(BaseModel):
    items: List[CustomerListItem]
    total: int
    skip: int
    limit: int


class CustomerDetail(BaseModel):
    id: int
    name: str
    username: str
    phone: str
    date_of_birth: Optional[date] = None
    registered_at: datetime
    last_login_at: Optional[datetime] = None
    total_appointments: int
    completed_count: int
    cancelled_count: int
    no_show_count: int
    next_appointment_at: Optional[datetime] = None
    risk_level: str = "normal"
    restricted_until: Optional[datetime] = None
    cancel_rate: float
    lifetime_spent: float


class CustomerAppointmentItem(BaseModel):
    id: int
    order_number: Optional[str] = None
    store_id: int
    store_name: Optional[str] = None
    service_name: Optional[str] = None
    service_price: Optional[float] = None
    appointment_date: date
    appointment_time: str
    status: str
    cancel_reason: Optional[str] = None
    created_at: Optional[datetime] = None


class CustomerPointsSummary(BaseModel):
    total_points: int
    available_points: int


class CustomerPointTransactionItem(BaseModel):
    id: int
    amount: int
    type: str
    reason: str
    description: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    created_at: datetime


class CustomerCouponItem(BaseModel):
    id: int
    coupon_id: int
    coupon_name: str
    status: str
    source: Optional[str] = None
    obtained_at: datetime
    expires_at: datetime
    used_at: Optional[datetime] = None
    discount_type: Optional[str] = None
    discount_value: float
    min_amount: float
    max_discount: Optional[float] = None


class CustomerGiftCardItem(BaseModel):
    id: int
    card_number: str
    status: str
    balance: float
    initial_balance: float
    expires_at: Optional[datetime] = None
    created_at: datetime


class CustomerRewardsResponse(BaseModel):
    points: CustomerPointsSummary
    point_transactions: List[CustomerPointTransactionItem]
    coupons: List[CustomerCouponItem]
    gift_cards: List[CustomerGiftCardItem]


def _base_customer_query(db: Session, current_user: User):
    query = db.query(User).filter(User.is_active == True, User.is_admin == False, User.store_id.is_(None))
    if current_user.is_admin:
        return query

    if not current_user.store_id:
        raise HTTPException(status_code=403, detail="Store admin scope is missing")

    subquery = (
        db.query(Appointment.user_id)
        .filter(Appointment.store_id == current_user.store_id)
        .distinct()
        .subquery()
    )
    return query.filter(User.id.in_(subquery))


def _appointment_scope_filter(current_user: User):
    if current_user.is_admin:
        return []
    if not current_user.store_id:
        raise HTTPException(status_code=403, detail="Store admin scope is missing")
    return [Appointment.store_id == current_user.store_id]


def _build_next_appointment_datetime(appointment: Optional[Appointment]) -> Optional[datetime]:
    if not appointment:
        return None
    return datetime.combine(appointment.appointment_date, appointment.appointment_time)


def _summarize_customer(db: Session, customer_id: int, current_user: User):
    scope_filters = _appointment_scope_filter(current_user)
    no_show_expr = and_(
        Appointment.status == "cancelled",
        Appointment.cancel_reason.isnot(None),
        func.lower(Appointment.cancel_reason).like("%no show%"),
    )

    stats_row = (
        db.query(
            func.count(Appointment.id).label("total"),
            func.sum(case((Appointment.status == "completed", 1), else_=0)).label("completed"),
            func.sum(case((and_(Appointment.status == "cancelled", ~no_show_expr), 1), else_=0)).label("cancelled"),
            func.sum(case((no_show_expr, 1), else_=0)).label("no_show"),
        )
        .filter(Appointment.user_id == customer_id, *scope_filters)
        .first()
    )

    next_appointment = (
        db.query(Appointment)
        .filter(
            Appointment.user_id == customer_id,
            Appointment.status.in_(["pending", "confirmed"]),
            or_(
                Appointment.appointment_date > date.today(),
                and_(
                    Appointment.appointment_date == date.today(),
                    Appointment.appointment_time >= datetime.now().time(),
                ),
            ),
            *scope_filters,
        )
        .order_by(Appointment.appointment_date.asc(), Appointment.appointment_time.asc())
        .first()
    )

    return {
        "total": int(stats_row.total or 0),
        "completed": int(stats_row.completed or 0),
        "cancelled": int(stats_row.cancelled or 0),
        "no_show": int(stats_row.no_show or 0),
        "next_appointment_at": _build_next_appointment_datetime(next_appointment),
    }


@router.get("/admin", response_model=CustomerListResponse)
def list_customers(
    request: Request,
    keyword: Optional[str] = Query(None),
    include_full_phone: bool = Query(False, description="Only super admin can request full phone"),
    register_from: Optional[date] = Query(None),
    register_to: Optional[date] = Query(None),
    restricted_only: bool = Query(False),
    risk_level: Optional[str] = Query(None),
    has_upcoming: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin),
):
    if include_full_phone and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only super admin can access full phone numbers")
    try:
        validate_keyword_min_length(keyword, min_length=3)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    query = _base_customer_query(db, current_user).outerjoin(UserRiskState, UserRiskState.user_id == User.id)

    if keyword:
        kw = f"%{keyword.strip()}%"
        order_match_query = db.query(Appointment.user_id).filter(Appointment.order_number.ilike(kw))
        for scope_filter in _appointment_scope_filter(current_user):
            order_match_query = order_match_query.filter(scope_filter)
        query = query.filter(
            or_(
                User.username.ilike(kw),
                User.phone.ilike(kw),
                User.full_name.ilike(kw),
                User.id.in_(order_match_query.distinct()),
            )
        )

    if register_from:
        query = query.filter(func.date(User.created_at) >= register_from)
    if register_to:
        query = query.filter(func.date(User.created_at) <= register_to)
    if risk_level and risk_level != "all":
        query = query.filter(UserRiskState.risk_level == risk_level)
    if restricted_only:
        query = query.filter(
            UserRiskState.restricted_until.isnot(None),
            UserRiskState.restricted_until > datetime.now(),
        )

    rows = query.order_by(User.created_at.desc()).all()

    result: List[CustomerListItem] = []
    for user_row in rows:
        user = user_row
        state = (
            db.query(UserRiskState)
            .filter(UserRiskState.user_id == user.id)
            .first()
        )
        summary = _summarize_customer(db, user.id, current_user)

        if has_upcoming is True and not summary["next_appointment_at"]:
            continue
        if has_upcoming is False and summary["next_appointment_at"]:
            continue

        restricted_until = state.restricted_until if state else None
        is_restricted = bool(restricted_until and restricted_until > datetime.now())
        result.append(
            CustomerListItem(
                id=user.id,
                name=user.full_name or user.username,
                phone=user.phone if include_full_phone else mask_phone(user.phone),
                registered_at=user.created_at,
                last_login_at=user.last_login_at or user.updated_at,
                total_appointments=summary["total"],
                completed_count=summary["completed"],
                cancelled_count=summary["cancelled"],
                no_show_count=summary["no_show"],
                next_appointment_at=summary["next_appointment_at"],
                risk_level=state.risk_level if state else "normal",
                restricted_until=restricted_until,
                status="restricted" if is_restricted else "active",
            )
        )

    if include_full_phone:
        log_service.create_audit_log(
            db,
            request=request,
            operator_user_id=current_user.id,
            module="customers",
            action="customers.list.full_phone",
            message="管理员查询客户列表明文手机号",
            target_type="customer",
            meta={"count": len(result)},
        )

    total = len(result)
    page_items = result[skip : skip + limit]
    return CustomerListResponse(items=page_items, total=total, skip=skip, limit=limit)


@router.get("/admin/{customer_id}", response_model=CustomerDetail)
def get_customer_detail(
    request: Request,
    customer_id: int,
    include_full_phone: bool = Query(False, description="Only super admin can request full phone"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin),
):
    if include_full_phone and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only super admin can access full phone numbers")

    customer = _base_customer_query(db, current_user).filter(User.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    summary = _summarize_customer(db, customer.id, current_user)
    state = db.query(UserRiskState).filter(UserRiskState.user_id == customer.id).first()

    scope_filters = _appointment_scope_filter(current_user)
    lifetime_spent = (
        db.query(func.coalesce(func.sum(Service.price), 0.0))
        .select_from(Appointment)
        .join(Service, Service.id == Appointment.service_id)
        .filter(Appointment.user_id == customer.id, Appointment.status == "completed", *scope_filters)
        .scalar()
    )

    cancel_rate = (summary["cancelled"] + summary["no_show"]) / summary["total"] if summary["total"] else 0.0

    detail = CustomerDetail(
        id=customer.id,
        name=customer.full_name or customer.username,
        username=customer.username,
        phone=customer.phone if include_full_phone else mask_phone(customer.phone),
        date_of_birth=customer.date_of_birth,
        registered_at=customer.created_at,
        last_login_at=customer.last_login_at or customer.updated_at,
        total_appointments=summary["total"],
        completed_count=summary["completed"],
        cancelled_count=summary["cancelled"],
        no_show_count=summary["no_show"],
        next_appointment_at=summary["next_appointment_at"],
        risk_level=state.risk_level if state else "normal",
        restricted_until=state.restricted_until if state else None,
        cancel_rate=round(cancel_rate, 4),
        lifetime_spent=float(lifetime_spent or 0.0),
    )
    if include_full_phone:
        log_service.create_audit_log(
            db,
            request=request,
            operator_user_id=current_user.id,
            module="customers",
            action="customers.detail.full_phone",
            message="管理员查看客户详情明文手机号",
            target_type="customer",
            target_id=str(customer.id),
        )
    return detail


@router.get("/admin/{customer_id}/appointments", response_model=List[CustomerAppointmentItem])
def get_customer_appointments(
    customer_id: int,
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin),
):
    customer_exists = _base_customer_query(db, current_user).filter(User.id == customer_id).first()
    if not customer_exists:
        raise HTTPException(status_code=404, detail="Customer not found")

    query = (
        db.query(Appointment, Store.name.label("store_name"), Service.name.label("service_name"), Service.price.label("service_price"))
        .join(Store, Store.id == Appointment.store_id)
        .join(Service, Service.id == Appointment.service_id)
        .filter(Appointment.user_id == customer_id, *_appointment_scope_filter(current_user))
    )
    if status and status != "all":
        query = query.filter(Appointment.status == status)

    rows = query.order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc()).offset(skip).limit(limit).all()
    return [
        CustomerAppointmentItem(
            id=appointment.id,
            order_number=appointment.order_number,
            store_id=appointment.store_id,
            store_name=store_name,
            service_name=service_name,
            service_price=service_price,
            appointment_date=appointment.appointment_date,
            appointment_time=appointment.appointment_time.strftime("%H:%M:%S"),
            status=appointment.status,
            cancel_reason=appointment.cancel_reason,
            created_at=appointment.created_at,
        )
        for appointment, store_name, service_name, service_price in rows
    ]


@router.get("/admin/{customer_id}/rewards", response_model=CustomerRewardsResponse)
def get_customer_rewards(
    customer_id: int,
    point_limit: int = Query(20, ge=1, le=200),
    point_type: Optional[str] = Query(None),
    coupon_limit: int = Query(20, ge=1, le=200),
    coupon_status: Optional[str] = Query(None),
    coupon_validity: Optional[str] = Query(None),
    gift_card_limit: int = Query(20, ge=1, le=200),
    gift_card_status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin),
):
    customer_exists = _base_customer_query(db, current_user).filter(User.id == customer_id).first()
    if not customer_exists:
        raise HTTPException(status_code=404, detail="Customer not found")

    user_points = db.query(UserPoints).filter(UserPoints.user_id == customer_id).first()
    points_summary = CustomerPointsSummary(
        total_points=int(user_points.total_points if user_points else 0),
        available_points=int(user_points.available_points if user_points else 0),
    )

    point_rows = []
    if user_points:
        point_query = db.query(PointTransaction).filter(PointTransaction.user_points_id == user_points.id)
        if point_type and point_type != "all":
            point_query = point_query.filter(PointTransaction.type == point_type)
        point_rows = point_query.order_by(PointTransaction.created_at.desc()).limit(point_limit).all()

    coupons_query = (
        db.query(UserCoupon, Coupon)
        .join(Coupon, Coupon.id == UserCoupon.coupon_id)
        .filter(UserCoupon.user_id == customer_id)
    )
    if coupon_status and coupon_status != "all":
        coupons_query = coupons_query.filter(UserCoupon.status == coupon_status)
    if coupon_validity and coupon_validity != "all":
        now = datetime.utcnow()
        if coupon_validity == "valid":
            coupons_query = coupons_query.filter(UserCoupon.expires_at >= now)
        elif coupon_validity == "expired":
            coupons_query = coupons_query.filter(UserCoupon.expires_at < now)
    coupons_rows = coupons_query.order_by(UserCoupon.obtained_at.desc()).limit(coupon_limit).all()

    gift_card_query = db.query(GiftCard).filter(GiftCard.user_id == customer_id)
    if gift_card_status and gift_card_status != "all":
        gift_card_query = gift_card_query.filter(GiftCard.status == gift_card_status)
    gift_card_rows = gift_card_query.order_by(GiftCard.created_at.desc()).limit(gift_card_limit).all()

    return CustomerRewardsResponse(
        points=points_summary,
        point_transactions=[
            CustomerPointTransactionItem(
                id=row.id,
                amount=row.amount,
                type=str(row.type.value if hasattr(row.type, "value") else row.type),
                reason=row.reason,
                description=row.description,
                reference_type=row.reference_type,
                reference_id=row.reference_id,
                created_at=row.created_at,
            )
            for row in point_rows
        ],
        coupons=[
            CustomerCouponItem(
                id=user_coupon.id,
                coupon_id=coupon.id,
                coupon_name=coupon.name,
                status=str(user_coupon.status.value if hasattr(user_coupon.status, "value") else user_coupon.status),
                source=user_coupon.source,
                obtained_at=user_coupon.obtained_at,
                expires_at=user_coupon.expires_at,
                used_at=user_coupon.used_at,
                discount_type=str(coupon.type.value if hasattr(coupon.type, "value") else coupon.type) if coupon.type else None,
                discount_value=float(coupon.discount_value or 0.0),
                min_amount=float(coupon.min_amount or 0.0),
                max_discount=float(coupon.max_discount) if coupon.max_discount is not None else None,
            )
            for user_coupon, coupon in coupons_rows
        ],
        gift_cards=[
            CustomerGiftCardItem(
                id=row.id,
                card_number=row.card_number,
                status=row.status,
                balance=float(row.balance or 0.0),
                initial_balance=float(row.initial_balance or 0.0),
                expires_at=row.expires_at,
                created_at=row.created_at,
            )
            for row in gift_card_rows
        ],
    )
