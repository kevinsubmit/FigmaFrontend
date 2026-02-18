"""
Dashboard endpoints
"""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_store_admin
from app.models.user import User
from app.models.appointment import Appointment as AppointmentModel, AppointmentStatus
from app.models.store import Store
from app.models.service import Service
from app.models.user import User as UserModel
from app.schemas.dashboard import (
    DashboardRealtimeNotificationItem,
    DashboardRealtimeNotificationListResponse,
    DashboardSummaryResponse,
)


router = APIRouter()
ET_TZ = ZoneInfo("America/New_York")


def _resolve_amount(order_amount: float | None, final_paid_amount: float | None) -> float:
    final_paid = float(final_paid_amount or 0)
    if final_paid > 0:
        return final_paid
    return max(float(order_amount or 0), 0.0)


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    current_user: User = Depends(get_current_store_admin),
    db: Session = Depends(get_db),
):
    today = datetime.now(ET_TZ).date()
    week_start = today - timedelta(days=today.weekday())
    last_week_start = week_start - timedelta(days=7)
    last_week_end = week_start - timedelta(days=1)

    base_query = db.query(AppointmentModel)
    scope = "all_stores"
    scoped_store_id = None
    if not current_user.is_admin:
        if not current_user.store_id:
            raise HTTPException(status_code=403, detail="Store admin scope requires store_id")
        base_query = base_query.filter(AppointmentModel.store_id == current_user.store_id)
        scope = "store"
        scoped_store_id = int(current_user.store_id)

    today_appointments = (
        base_query.filter(
            AppointmentModel.appointment_date == today,
            AppointmentModel.status.in_(
                [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED]
            ),
        ).count()
    )

    today_completed_rows = (
        base_query.filter(
            AppointmentModel.appointment_date == today,
            AppointmentModel.status == AppointmentStatus.COMPLETED,
        )
        .with_entities(AppointmentModel.order_amount, AppointmentModel.final_paid_amount)
        .all()
    )
    today_revenue = round(sum(_resolve_amount(order, paid) for order, paid in today_completed_rows), 2)

    active_customers_week = (
        base_query.filter(
            AppointmentModel.appointment_date >= week_start,
            AppointmentModel.appointment_date <= today,
            AppointmentModel.status.in_(
                [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED]
            ),
        )
        .with_entities(AppointmentModel.user_id)
        .distinct()
        .count()
    )

    week_completed_rows = (
        base_query.filter(
            AppointmentModel.appointment_date >= week_start,
            AppointmentModel.appointment_date <= today,
            AppointmentModel.status == AppointmentStatus.COMPLETED,
        )
        .with_entities(AppointmentModel.order_amount, AppointmentModel.final_paid_amount)
        .all()
    )
    last_week_completed_rows = (
        base_query.filter(
            AppointmentModel.appointment_date >= last_week_start,
            AppointmentModel.appointment_date <= last_week_end,
            AppointmentModel.status == AppointmentStatus.COMPLETED,
        )
        .with_entities(AppointmentModel.order_amount, AppointmentModel.final_paid_amount)
        .all()
    )

    week_amounts = [_resolve_amount(order, paid) for order, paid in week_completed_rows]
    last_week_amounts = [_resolve_amount(order, paid) for order, paid in last_week_completed_rows]

    avg_ticket_week = round((sum(week_amounts) / len(week_amounts)) if week_amounts else 0.0, 2)
    avg_ticket_last_week = round((sum(last_week_amounts) / len(last_week_amounts)) if last_week_amounts else 0.0, 2)

    if avg_ticket_last_week > 0:
        avg_ticket_change_pct = round(((avg_ticket_week - avg_ticket_last_week) / avg_ticket_last_week) * 100, 1)
    else:
        avg_ticket_change_pct = 0.0

    return DashboardSummaryResponse(
        today_appointments=int(today_appointments),
        today_revenue=float(today_revenue),
        active_customers_week=int(active_customers_week),
        avg_ticket_week=float(avg_ticket_week),
        avg_ticket_change_pct=float(avg_ticket_change_pct),
        scope=scope,
        store_id=scoped_store_id,
    )


@router.get("/realtime-notifications", response_model=DashboardRealtimeNotificationListResponse)
def get_dashboard_realtime_notifications(
    limit: int = 10,
    current_user: User = Depends(get_current_store_admin),
    db: Session = Depends(get_db),
):
    query = (
        db.query(
            AppointmentModel.id.label("appointment_id"),
            AppointmentModel.store_id.label("store_id"),
            AppointmentModel.appointment_date.label("appointment_date"),
            AppointmentModel.appointment_time.label("appointment_time"),
            AppointmentModel.created_at.label("created_at"),
            AppointmentModel.guest_name.label("guest_name"),
            Store.name.label("store_name"),
            Service.name.label("service_name"),
            UserModel.full_name.label("customer_name"),
            UserModel.username.label("user_name"),
        )
        .join(Store, Store.id == AppointmentModel.store_id)
        .join(Service, Service.id == AppointmentModel.service_id)
        .join(UserModel, UserModel.id == AppointmentModel.user_id)
    )

    if not current_user.is_admin:
        if not current_user.store_id:
            raise HTTPException(status_code=403, detail="Store admin scope requires store_id")
        query = query.filter(AppointmentModel.store_id == current_user.store_id)

    rows = (
        query.order_by(AppointmentModel.created_at.desc())
        .limit(max(1, min(int(limit or 10), 50)))
        .all()
    )

    items = []
    for row in rows:
        customer_name = (row.guest_name or row.customer_name or row.user_name or "Customer").strip()
        service_name = (row.service_name or f"Service #{row.appointment_id}").strip()
        appt_date = str(row.appointment_date)
        appt_time = str(row.appointment_time)[:5]
        items.append(
            DashboardRealtimeNotificationItem(
                id=int(row.appointment_id),
                appointment_id=int(row.appointment_id),
                store_id=int(row.store_id),
                store_name=row.store_name,
                customer_name=customer_name,
                service_name=service_name,
                appointment_date=appt_date,
                appointment_time=appt_time,
                title="新预约提醒",
                message=f"{customer_name} booked {appt_date} {appt_time} {service_name}",
                created_at=row.created_at,
            )
        )

    return DashboardRealtimeNotificationListResponse(total=len(items), items=items)
