"""
Risk service for booking security controls.
"""
from dataclasses import dataclass
from datetime import datetime, timedelta, date
from typing import Optional
import json

from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.risk import RiskEvent, UserRiskState


RATE_LIMIT_USER_PER_MINUTE = 2
RATE_LIMIT_USER_PER_HOUR = 8
RATE_LIMIT_IP_PER_MINUTE = 4
RATE_LIMIT_IP_PER_HOUR = 20
DAILY_BOOKING_LIMIT = 3
RISK_RESTRICT_HOURS = 24
RISK_CANCEL_7D_LIMIT = 3
RISK_NO_SHOW_30D_LIMIT = 2


@dataclass
class RiskDecision:
    allowed: bool
    status_code: int = 200
    error_code: Optional[str] = None
    message: Optional[str] = None


def _get_or_create_user_risk_state(db: Session, user_id: int) -> UserRiskState:
    state = db.query(UserRiskState).filter(UserRiskState.user_id == user_id).first()
    if state:
        return state
    state = UserRiskState(user_id=user_id, risk_level="normal", cancel_7d=0, no_show_30d=0)
    db.add(state)
    db.commit()
    db.refresh(state)
    return state


def log_risk_event(
    db: Session,
    *,
    user_id: int,
    event_type: str,
    appointment_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    reason: Optional[str] = None,
    meta: Optional[dict] = None,
) -> RiskEvent:
    event = RiskEvent(
        user_id=user_id,
        appointment_id=appointment_id,
        ip_address=ip_address,
        event_type=event_type,
        reason=reason,
        meta_json=json.dumps(meta) if meta else None,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def _count_risk_events(
    db: Session,
    *,
    event_type: str,
    since: datetime,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
) -> int:
    query = db.query(RiskEvent).filter(
        RiskEvent.event_type == event_type,
        RiskEvent.created_at >= since,
    )
    if user_id is not None:
        query = query.filter(RiskEvent.user_id == user_id)
    if ip_address:
        query = query.filter(RiskEvent.ip_address == ip_address)
    return query.count()


def _count_user_appointments_on_date(db: Session, *, user_id: int, appointment_date: date) -> int:
    return (
        db.query(Appointment)
        .filter(Appointment.user_id == user_id, Appointment.appointment_date == appointment_date)
        .count()
    )


def evaluate_booking_request(
    db: Session,
    *,
    user_id: int,
    appointment_date: date,
    ip_address: Optional[str] = None,
) -> RiskDecision:
    state = _get_or_create_user_risk_state(db, user_id)
    now = datetime.now()
    if state.restricted_until and state.restricted_until > now:
        return RiskDecision(
            allowed=False,
            status_code=429,
            error_code="BOOK_RESTRICTED",
            message="Your account is temporarily restricted from booking. Please try again later.",
        )

    one_minute_ago = now - timedelta(minutes=1)
    one_hour_ago = now - timedelta(hours=1)
    user_1m = _count_risk_events(db, event_type="appointment_created", since=one_minute_ago, user_id=user_id)
    user_1h = _count_risk_events(db, event_type="appointment_created", since=one_hour_ago, user_id=user_id)
    if user_1m >= RATE_LIMIT_USER_PER_MINUTE or user_1h >= RATE_LIMIT_USER_PER_HOUR:
        return RiskDecision(
            allowed=False,
            status_code=429,
            error_code="BOOK_RATE_LIMITED",
            message="Too many booking requests. Please try again in a few minutes.",
        )

    if ip_address:
        ip_1m = _count_risk_events(db, event_type="appointment_created", since=one_minute_ago, ip_address=ip_address)
        ip_1h = _count_risk_events(db, event_type="appointment_created", since=one_hour_ago, ip_address=ip_address)
        if ip_1m >= RATE_LIMIT_IP_PER_MINUTE or ip_1h >= RATE_LIMIT_IP_PER_HOUR:
            return RiskDecision(
                allowed=False,
                status_code=429,
                error_code="BOOK_RATE_LIMITED",
                message="Too many requests from this network. Please retry later.",
            )

    same_day_count = _count_user_appointments_on_date(db, user_id=user_id, appointment_date=appointment_date)
    if same_day_count >= DAILY_BOOKING_LIMIT:
        return RiskDecision(
            allowed=False,
            status_code=400,
            error_code="BOOK_DAILY_LIMIT",
            message="Daily booking limit reached. Please choose another day.",
        )

    return RiskDecision(allowed=True)


def refresh_user_risk_state(db: Session, *, user_id: int) -> UserRiskState:
    state = _get_or_create_user_risk_state(db, user_id)
    now = datetime.now()
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)

    cancel_7d = (
        db.query(Appointment)
        .filter(
            Appointment.user_id == user_id,
            Appointment.status == "cancelled",
            Appointment.cancelled_at.isnot(None),
            Appointment.cancelled_at >= seven_days_ago,
        )
        .count()
    )
    no_show_30d = _count_risk_events(
        db,
        event_type="appointment_no_show",
        since=thirty_days_ago,
        user_id=user_id,
    )

    state.cancel_7d = cancel_7d
    state.no_show_30d = no_show_30d

    if cancel_7d >= RISK_CANCEL_7D_LIMIT or no_show_30d >= RISK_NO_SHOW_30D_LIMIT:
        state.risk_level = "high"
        new_until = now + timedelta(hours=RISK_RESTRICT_HOURS)
        if not state.restricted_until or state.restricted_until < new_until:
            state.restricted_until = new_until
    elif cancel_7d >= 2:
        state.risk_level = "medium"
    else:
        if not state.restricted_until or state.restricted_until <= now:
            state.risk_level = "normal"
            state.restricted_until = None

    db.commit()
    db.refresh(state)
    return state


def restrict_user(
    db: Session,
    *,
    user_id: int,
    admin_id: int,
    hours: int = 24,
    note: Optional[str] = None,
) -> UserRiskState:
    state = _get_or_create_user_risk_state(db, user_id)
    state.risk_level = "high"
    state.restricted_until = datetime.now() + timedelta(hours=hours)
    state.manual_note = note
    state.updated_by = admin_id
    db.commit()
    db.refresh(state)
    return state


def unrestrict_user(
    db: Session,
    *,
    user_id: int,
    admin_id: int,
    note: Optional[str] = None,
) -> UserRiskState:
    state = _get_or_create_user_risk_state(db, user_id)
    state.restricted_until = None
    state.manual_note = note
    state.updated_by = admin_id
    if state.cancel_7d >= 2:
        state.risk_level = "medium"
    else:
        state.risk_level = "normal"
    db.commit()
    db.refresh(state)
    return state


def set_user_risk_level(
    db: Session,
    *,
    user_id: int,
    admin_id: int,
    risk_level: str,
    note: Optional[str] = None,
) -> UserRiskState:
    if risk_level not in {"normal", "medium", "high"}:
        raise ValueError("Invalid risk level")

    state = _get_or_create_user_risk_state(db, user_id)
    state.risk_level = risk_level
    state.manual_note = note
    state.updated_by = admin_id
    db.commit()
    db.refresh(state)
    return state
