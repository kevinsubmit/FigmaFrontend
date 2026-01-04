"""
Appointments API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db, get_current_user
from app.crud import appointment as crud_appointment
from app.schemas.appointment import (
    Appointment,
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentWithDetails
)
from app.schemas.user import UserResponse
from app.models.appointment import AppointmentStatus

router = APIRouter()


@router.post("/", response_model=Appointment)
def create_appointment(
    appointment: AppointmentCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new appointment (requires authentication)
    """
    # Check for conflicts
    has_conflict = crud_appointment.check_appointment_conflict(
        db,
        store_id=appointment.store_id,
        appointment_date=appointment.appointment_date,
        appointment_time=str(appointment.appointment_time)
    )
    
    if has_conflict:
        raise HTTPException(
            status_code=400,
            detail="This time slot is already booked"
        )
    
    db_appointment = crud_appointment.create_appointment(
        db,
        appointment=appointment,
        user_id=current_user.id
    )
    return db_appointment


@router.get("/", response_model=List[AppointmentWithDetails])
def get_my_appointments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's appointments with details (requires authentication)
    """
    appointments_data = crud_appointment.get_user_appointments_with_details(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )
    
    # Format response
    result = []
    for appt, store_name, service_name, service_price, service_duration in appointments_data:
        result.append({
            **appt.__dict__,
            "store_name": store_name,
            "service_name": service_name,
            "service_price": service_price,
            "service_duration": service_duration
        })
    
    return result


@router.get("/{appointment_id}", response_model=Appointment)
def get_appointment(
    appointment_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get appointment details (requires authentication)
    """
    appointment = crud_appointment.get_appointment(db, appointment_id=appointment_id)
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check if appointment belongs to current user
    if appointment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this appointment")
    
    return appointment


@router.patch("/{appointment_id}", response_model=Appointment)
def update_appointment(
    appointment_id: int,
    appointment_update: AppointmentUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update appointment (requires authentication)
    """
    appointment = crud_appointment.get_appointment(db, appointment_id=appointment_id)
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check if appointment belongs to current user
    if appointment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this appointment")
    
    updated_appointment = crud_appointment.update_appointment(
        db,
        appointment_id=appointment_id,
        appointment=appointment_update
    )
    
    return updated_appointment


@router.delete("/{appointment_id}", response_model=Appointment)
def cancel_appointment(
    appointment_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel appointment (requires authentication)
    """
    appointment = crud_appointment.get_appointment(db, appointment_id=appointment_id)
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check if appointment belongs to current user
    if appointment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this appointment")
    
    cancelled_appointment = crud_appointment.cancel_appointment(db, appointment_id=appointment_id)
    
    return cancelled_appointment
