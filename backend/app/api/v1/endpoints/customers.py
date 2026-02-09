"""
Customer management admin endpoints
"""
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import and_, case, func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_store_admin, get_db
from app.models.appointment import Appointment
from app.models.risk import UserRiskState
from app.models.service import Service
from app.models.store import Store
from app.models.user import User

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
    keyword: Optional[str] = Query(None),
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
                phone=user.phone,
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

    total = len(result)
    page_items = result[skip : skip + limit]
    return CustomerListResponse(items=page_items, total=total, skip=skip, limit=limit)


@router.get("/admin/{customer_id}", response_model=CustomerDetail)
def get_customer_detail(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin),
):
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

    return CustomerDetail(
        id=customer.id,
        name=customer.full_name or customer.username,
        username=customer.username,
        phone=customer.phone,
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
