"""
Technicians API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from app.api.deps import get_db, get_current_admin_user, get_current_store_admin
from app.models.user import User
from app.crud import technician as crud_technician
from app.schemas.technician import Technician, TechnicianCreate, TechnicianUpdate

router = APIRouter()


@router.get("/", response_model=List[Technician])
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


@router.get("/{technician_id}", response_model=Technician)
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


@router.post("/", response_model=Technician, status_code=201)
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
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if technician.store_id != current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only create technicians for your own store"
            )
    
    new_technician = crud_technician.create_technician(db, technician=technician)
    return new_technician


@router.patch("/{technician_id}", response_model=Technician)
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
    
    updated_technician = crud_technician.update_technician(
        db,
        technician_id=technician_id,
        technician=technician
    )
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
    
    crud_technician.delete_technician(db, technician_id=technician_id)
    return None


@router.patch("/{technician_id}/availability", response_model=Technician)
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
