"""
Technicians API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import case, func
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime, date
from zoneinfo import ZoneInfo

from app.api.deps import get_db, get_current_admin_user, get_current_store_admin
from app.models.user import User
from app.models.appointment import Appointment, AppointmentStatus
from app.models.appointment_staff_split import AppointmentStaffSplit
from app.models.service import Service
from app.models.technician import Technician as TechnicianModel
from app.crud import technician as crud_technician
from app.schemas.technician import Technician as TechnicianSchema, TechnicianCreate, TechnicianUpdate

router = APIRouter()
ET_TZ = ZoneInfo("America/New_York")


def _ensure_store_scope(current_user: User, target_store_id: int) -> None:
    if current_user.is_admin:
        return
    if current_user.store_id != target_store_id:
        raise HTTPException(status_code=403, detail="You can only access data from your own store")


@router.get("/", response_model=List[TechnicianSchema])
def get_technicians(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    store_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get list of technicians with optional filters
    
    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return
    - **store_id**: Filter by store ID
    """
    technicians = crud_technician.get_technicians(
        db,
        skip=skip,
        limit=limit,
        store_id=store_id
    )
    return technicians


@router.get("/performance/summary", response_model=List[dict])
def get_technician_performance_summary(
    store_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin),
):
    """
    Technician performance summary (today + all history) by store.
    """
    target_store_id = store_id
    if not current_user.is_admin:
        target_store_id = current_user.store_id
    elif target_store_id is None:
        raise HTTPException(status_code=400, detail="store_id is required for super admin")

    if target_store_id is None:
        raise HTTPException(status_code=400, detail="store_id is required")

    _ensure_store_scope(current_user, target_store_id)

    today_et = datetime.now(ET_TZ).date()

    split_total_subquery = (
        db.query(
            AppointmentStaffSplit.appointment_id.label("appointment_id"),
            func.coalesce(func.sum(AppointmentStaffSplit.amount), 0.0).label("split_total"),
        )
        .group_by(AppointmentStaffSplit.appointment_id)
        .subquery()
    )
    commission_share_expr = case(
        (split_total_subquery.c.split_total > 0, Service.commission_amount * (AppointmentStaffSplit.amount / split_total_subquery.c.split_total)),
        else_=0.0,
    )

    rows = (
        db.query(
            AppointmentStaffSplit.technician_id.label("technician_id"),
            func.count(AppointmentStaffSplit.id).label("total_order_count"),
            func.coalesce(func.sum(AppointmentStaffSplit.amount), 0.0).label("total_amount"),
            func.coalesce(func.sum(commission_share_expr), 0.0).label("total_commission"),
            func.sum(case((Appointment.appointment_date == today_et, 1), else_=0)).label("today_order_count"),
            func.coalesce(
                func.sum(case((Appointment.appointment_date == today_et, AppointmentStaffSplit.amount), else_=0.0)),
                0.0,
            ).label("today_amount"),
            func.coalesce(
                func.sum(case((Appointment.appointment_date == today_et, commission_share_expr), else_=0.0)),
                0.0,
            ).label("today_commission"),
        )
        .join(Appointment, Appointment.id == AppointmentStaffSplit.appointment_id)
        .join(Service, Service.id == Appointment.service_id)
        .join(split_total_subquery, split_total_subquery.c.appointment_id == Appointment.id)
        .filter(
            Appointment.store_id == target_store_id,
            Appointment.status == AppointmentStatus.COMPLETED,
        )
        .group_by(AppointmentStaffSplit.technician_id)
        .all()
    )
    agg_map = {
        row.technician_id: {
            "total_order_count": int(row.total_order_count or 0),
            "total_amount": float(row.total_amount or 0),
            "total_commission": float(row.total_commission or 0),
            "today_order_count": int(row.today_order_count or 0),
            "today_amount": float(row.today_amount or 0),
            "today_commission": float(row.today_commission or 0),
        }
        for row in rows
    }

    technicians = (
        db.query(TechnicianModel)
        .filter(TechnicianModel.store_id == target_store_id, TechnicianModel.is_active == 1)
        .order_by(TechnicianModel.name.asc())
        .all()
    )

    return [
        {
            "technician_id": tech.id,
            "technician_name": tech.name,
            "store_id": tech.store_id,
            "today_order_count": agg_map.get(tech.id, {}).get("today_order_count", 0),
            "today_amount": agg_map.get(tech.id, {}).get("today_amount", 0.0),
            "today_commission": agg_map.get(tech.id, {}).get("today_commission", 0.0),
            "total_order_count": agg_map.get(tech.id, {}).get("total_order_count", 0),
            "total_amount": agg_map.get(tech.id, {}).get("total_amount", 0.0),
            "total_commission": agg_map.get(tech.id, {}).get("total_commission", 0.0),
        }
        for tech in technicians
    ]


@router.get("/{technician_id}/performance", response_model=dict)
def get_technician_performance_detail(
    technician_id: int,
    date_from: Optional[str] = Query(None, description="YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="YYYY-MM-DD"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin),
):
    """
    Technician split-order detail in a date range.
    """
    technician = crud_technician.get_technician(db, technician_id=technician_id)
    if not technician:
        raise HTTPException(status_code=404, detail="Technician not found")
    _ensure_store_scope(current_user, technician.store_id)

    from_date_obj: Optional[date] = None
    to_date_obj: Optional[date] = None
    if date_from:
        try:
            from_date_obj = datetime.strptime(date_from, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="date_from format must be YYYY-MM-DD")
    if date_to:
        try:
            to_date_obj = datetime.strptime(date_to, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="date_to format must be YYYY-MM-DD")
    if from_date_obj and to_date_obj and from_date_obj > to_date_obj:
        raise HTTPException(status_code=400, detail="date_from cannot be later than date_to")

    split_total_subquery = (
        db.query(
            AppointmentStaffSplit.appointment_id.label("appointment_id"),
            func.coalesce(func.sum(AppointmentStaffSplit.amount), 0.0).label("split_total"),
        )
        .group_by(AppointmentStaffSplit.appointment_id)
        .subquery()
    )
    commission_share_expr = case(
        (split_total_subquery.c.split_total > 0, Service.commission_amount * (AppointmentStaffSplit.amount / split_total_subquery.c.split_total)),
        else_=0.0,
    )

    base_query = (
        db.query(
            AppointmentStaffSplit,
            Appointment.order_number.label("order_number"),
            Appointment.appointment_date.label("appointment_date"),
            Appointment.appointment_time.label("appointment_time"),
            Service.name.label("service_name"),
            func.coalesce(User.full_name, User.username).label("customer_name"),
            commission_share_expr.label("commission_amount"),
        )
        .join(Appointment, Appointment.id == AppointmentStaffSplit.appointment_id)
        .join(Service, Service.id == Appointment.service_id)
        .join(User, User.id == Appointment.user_id)
        .join(split_total_subquery, split_total_subquery.c.appointment_id == Appointment.id)
        .filter(
            AppointmentStaffSplit.technician_id == technician_id,
            Appointment.status == AppointmentStatus.COMPLETED,
        )
    )

    filtered_query = base_query
    if from_date_obj:
        filtered_query = filtered_query.filter(Appointment.appointment_date >= from_date_obj)
    if to_date_obj:
        filtered_query = filtered_query.filter(Appointment.appointment_date <= to_date_obj)

    rows = (
        filtered_query.order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    total_all = (
        db.query(
            func.count(AppointmentStaffSplit.id).label("total_orders"),
            func.coalesce(func.sum(AppointmentStaffSplit.amount), 0.0).label("total_amount"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            split_total_subquery.c.split_total > 0,
                            Service.commission_amount * (AppointmentStaffSplit.amount / split_total_subquery.c.split_total),
                        ),
                        else_=0.0,
                    )
                ),
                0.0,
            ).label("total_commission"),
        )
        .join(Appointment, Appointment.id == AppointmentStaffSplit.appointment_id)
        .join(Service, Service.id == Appointment.service_id)
        .join(split_total_subquery, split_total_subquery.c.appointment_id == Appointment.id)
        .filter(
            AppointmentStaffSplit.technician_id == technician_id,
            Appointment.status == AppointmentStatus.COMPLETED,
        )
        .first()
    )
    total_period = (
        db.query(
            func.count(AppointmentStaffSplit.id).label("period_orders"),
            func.coalesce(func.sum(AppointmentStaffSplit.amount), 0.0).label("period_amount"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            split_total_subquery.c.split_total > 0,
                            Service.commission_amount * (AppointmentStaffSplit.amount / split_total_subquery.c.split_total),
                        ),
                        else_=0.0,
                    )
                ),
                0.0,
            ).label("period_commission"),
        )
        .join(Appointment, Appointment.id == AppointmentStaffSplit.appointment_id)
        .join(Service, Service.id == Appointment.service_id)
        .join(split_total_subquery, split_total_subquery.c.appointment_id == Appointment.id)
        .filter(
            AppointmentStaffSplit.technician_id == technician_id,
            Appointment.status == AppointmentStatus.COMPLETED,
        )
    )
    if from_date_obj:
        total_period = total_period.filter(Appointment.appointment_date >= from_date_obj)
    if to_date_obj:
        total_period = total_period.filter(Appointment.appointment_date <= to_date_obj)
    total_period = total_period.first()

    items = []
    for split, order_number, appointment_date, appointment_time, service_name, customer_name, commission_amount in rows:
        items.append(
            {
                "split_id": split.id,
                "appointment_id": split.appointment_id,
                "order_number": order_number,
                "appointment_date": str(appointment_date),
                "appointment_time": str(appointment_time),
                "service_name": service_name,
                "customer_name": customer_name,
                "work_type": split.work_type or service_name,
                "amount": float(split.amount or 0),
                "commission_amount": float(commission_amount or 0),
            }
        )

    return {
        "technician_id": technician.id,
        "technician_name": technician.name,
        "store_id": technician.store_id,
        "date_from": str(from_date_obj) if from_date_obj else None,
        "date_to": str(to_date_obj) if to_date_obj else None,
        "period_order_count": int(total_period.period_orders or 0),
        "period_amount": float(total_period.period_amount or 0),
        "period_commission": float(total_period.period_commission or 0),
        "total_order_count": int(total_all.total_orders or 0),
        "total_amount": float(total_all.total_amount or 0),
        "total_commission": float(total_all.total_commission or 0),
        "items": items,
    }


@router.get("/{technician_id}", response_model=TechnicianSchema)
def get_technician(
    technician_id: int,
    db: Session = Depends(get_db)
):
    """
    Get technician details by ID
    """
    technician = crud_technician.get_technician(db, technician_id=technician_id)
    if not technician:
        raise HTTPException(status_code=404, detail="Technician not found")
    
    return technician


@router.post("/", response_model=TechnicianSchema, status_code=201)
def create_technician(
    technician: TechnicianCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Create a new technician (Store admin only)
    
    - Super admin can create technicians for any store
    - Store manager can only create technicians for their own store
    """
    technician.name = technician.name.strip()
    if not technician.name:
        raise HTTPException(status_code=400, detail="Technician name is required")

    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if technician.store_id != current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only create technicians for your own store"
            )

    existed = crud_technician.get_technician_by_store_and_name(
        db,
        store_id=technician.store_id,
        name=technician.name,
    )
    if existed:
        raise HTTPException(
            status_code=400,
            detail="Technician name already exists in this store",
        )
    
    try:
        new_technician = crud_technician.create_technician(db, technician=technician)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Technician name already exists in this store")
    return new_technician


@router.patch("/{technician_id}", response_model=TechnicianSchema)
def update_technician(
    technician_id: int,
    technician: TechnicianUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Update technician information (Store admin only)
    
    - Super admin can update technicians from any store
    - Store manager can only update technicians from their own store
    """
    # Get existing technician
    existing_technician = crud_technician.get_technician(db, technician_id=technician_id)
    if not existing_technician:
        raise HTTPException(status_code=404, detail="Technician not found")
    
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if existing_technician.store_id != current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only update technicians from your own store"
            )

    if technician.name is not None:
        technician.name = technician.name.strip()
    if technician.name is not None and technician.name:
        existed = crud_technician.get_technician_by_store_and_name(
            db,
            store_id=existing_technician.store_id,
            name=technician.name,
        )
        if existed and existed.id != existing_technician.id:
            raise HTTPException(
                status_code=400,
                detail="Technician name already exists in this store",
            )
    if technician.name is not None and not technician.name:
        raise HTTPException(status_code=400, detail="Technician name is required")
    
    try:
        updated_technician = crud_technician.update_technician(
            db,
            technician_id=technician_id,
            technician=technician
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Technician name already exists in this store")
    return updated_technician


@router.delete("/{technician_id}", status_code=204)
def delete_technician(
    technician_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Delete a technician (Store admin only)
    
    - Super admin can delete technicians from any store
    - Store manager can only delete technicians from their own store
    """
    technician = crud_technician.get_technician(db, technician_id=technician_id)
    if not technician:
        raise HTTPException(status_code=404, detail="Technician not found")
    
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if technician.store_id != current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only delete technicians from your own store"
            )
    
    # Soft delete to preserve historical appointment linkage.
    crud_technician.update_technician(
        db,
        technician_id=technician_id,
        technician=TechnicianUpdate(is_active=0),
    )
    return None


@router.patch("/{technician_id}/availability", response_model=TechnicianSchema)
def toggle_technician_availability(
    technician_id: int,
    is_active: int = Query(..., ge=0, le=1, description="0 for inactive, 1 for active"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Toggle technician availability (Store admin only)
    
    - Super admin can toggle availability for technicians from any store
    - Store manager can only toggle availability for technicians from their own store
    """
    technician = crud_technician.get_technician(db, technician_id=technician_id)
    if not technician:
        raise HTTPException(status_code=404, detail="Technician not found")
    
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if technician.store_id != current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only toggle availability for technicians from your own store"
            )
    
    updated_technician = crud_technician.update_technician(
        db,
        technician_id=technician_id,
        technician=TechnicianUpdate(is_active=is_active)
    )
    return updated_technician


@router.get("/{technician_id}/appointments", response_model=List[dict])
def get_technician_appointments(
    technician_id: int,
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db)
):
    """
    Get technician's appointments (public endpoint)
    """
    from app.models.appointment import Appointment, AppointmentStatus
    from app.models.service import Service
    from app.models.user import User
    from datetime import datetime, date as date_type
    
    # Check if technician exists
    technician = crud_technician.get_technician(db, technician_id=technician_id)
    if not technician:
        raise HTTPException(status_code=404, detail="Technician not found")
    
    # Build query
    query = db.query(
        Appointment,
        Service.name.label('service_name'),
        Service.duration_minutes.label('duration'),
        func.coalesce(User.full_name, User.username).label('customer_name')
    ).join(
        Service, Appointment.service_id == Service.id
    ).join(
        User, Appointment.user_id == User.id
    ).filter(
        Appointment.technician_id == technician_id
    )
    
    # Apply filters
    if date:
        try:
            filter_date = datetime.strptime(date, "%Y-%m-%d").date()
            query = query.filter(Appointment.appointment_date == filter_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    if status:
        try:
            status_enum = AppointmentStatus(status)
            query = query.filter(Appointment.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status. Use: {', '.join([s.value for s in AppointmentStatus])}")
    
    # Execute query
    appointments = query.order_by(
        Appointment.appointment_date,
        Appointment.appointment_time
    ).all()
    
    # Format response
    result = []
    for appt, service_name, duration, customer_name in appointments:
        result.append({
            "id": appt.id,
            "appointment_date": str(appt.appointment_date),
            "appointment_time": str(appt.appointment_time),
            "service_name": service_name,
            "duration_minutes": duration,
            "customer_name": customer_name,
            "status": appt.status,
            "notes": appt.notes
        })
    
    return result


@router.get("/{technician_id}/available-slots", response_model=List[dict])
def get_technician_available_slots(
    technician_id: int,
    date: str = Query(..., description="Date to check availability (YYYY-MM-DD)"),
    service_id: int = Query(..., description="Service ID to calculate duration"),
    db: Session = Depends(get_db)
):
    """
    Get technician's available time slots for a specific date and service
    """
    from app.models.appointment import Appointment, AppointmentStatus
    from app.models.service import Service
    from app.models.store import Store
    from datetime import datetime, timedelta, time as time_type
    
    # Check if technician exists
    technician = crud_technician.get_technician(db, technician_id=technician_id)
    if not technician:
        raise HTTPException(status_code=404, detail="Technician not found")
    
    # Check if service exists
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Parse date
    try:
        check_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Get store hours from database
    from app.crud import store_hours as crud_store_hours
    
    # Get day of week (0=Monday, 6=Sunday)
    day_of_week = check_date.weekday()
    
    # Get store hours for this day
    store_hours = crud_store_hours.get_store_hours_for_day(db, technician.store_id, day_of_week)
    
    # If store is closed or no hours set, return empty list
    if not store_hours or store_hours['is_closed']:
        return []
    
    store_open_time = store_hours['open_time']
    store_close_time = store_hours['close_time']
    slot_interval = 30  # 30-minute slots
    
    # Get technician's existing appointments for the date
    existing_appointments = db.query(Appointment, Service).join(
        Service, Appointment.service_id == Service.id
    ).filter(
        Appointment.technician_id == technician_id,
        Appointment.appointment_date == check_date,
        Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])
    ).all()
    
    # Check if technician is unavailable on this date
    from app.crud import technician_unavailable as crud_unavailable
    is_unavailable = crud_unavailable.check_technician_unavailable(
        db, technician_id, check_date
    )
    if is_unavailable:
        return []  # Technician is unavailable for the entire day
    
    # Build list of busy time ranges (appointments + partial unavailable periods)
    busy_ranges = []
    
    # Add existing appointments
    for appt, appt_service in existing_appointments:
        start_datetime = datetime.combine(check_date, appt.appointment_time)
        end_datetime = start_datetime + timedelta(minutes=appt_service.duration_minutes)
        busy_ranges.append((start_datetime, end_datetime))
    
    # Add partial unavailable periods (with specific start/end times)
    unavailable_periods = crud_unavailable.get_unavailable_periods(
        db, technician_id, check_date, check_date
    )
    for period in unavailable_periods:
        if period.start_time and period.end_time:
            # Partial day unavailability
            start_datetime = datetime.combine(check_date, period.start_time)
            end_datetime = datetime.combine(check_date, period.end_time)
            busy_ranges.append((start_datetime, end_datetime))
    
    # Generate available slots
    available_slots = []
    current_time = datetime.combine(check_date, store_open_time)
    end_time = datetime.combine(check_date, store_close_time)
    service_duration = timedelta(minutes=service.duration_minutes)
    
    while current_time + service_duration <= end_time:
        slot_end_time = current_time + service_duration
        
        # Check if this slot conflicts with any busy range
        is_available = True
        for busy_start, busy_end in busy_ranges:
            if (current_time < busy_end and slot_end_time > busy_start):
                is_available = False
                break
        
        if is_available:
            available_slots.append({
                "start_time": current_time.strftime("%H:%M"),
                "end_time": slot_end_time.strftime("%H:%M"),
                "duration_minutes": service.duration_minutes
            })
        
        # Move to next slot
        current_time += timedelta(minutes=slot_interval)
    
    return available_slots
