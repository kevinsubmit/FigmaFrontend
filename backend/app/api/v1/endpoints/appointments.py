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
    AppointmentWithDetails,
    AppointmentCancel,
    AppointmentReschedule,
    AppointmentNotesUpdate
)
from app.schemas.user import UserResponse
from app.models.appointment import AppointmentStatus
from app.services import notification_service

router = APIRouter()


@router.post("/", response_model=Appointment)
def create_appointment(
    appointment: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Create a new appointment (requires authentication)
    """
    user_id = current_user.id
    
    # Check for conflicts using improved conflict checker
    conflict_result = crud_appointment.check_time_conflict(
        db,
        appointment_date=appointment.appointment_date,
        appointment_time=appointment.appointment_time,
        service_id=appointment.service_id,
        technician_id=appointment.technician_id,
        user_id=user_id
    )
    
    if conflict_result["has_conflict"]:
        raise HTTPException(
            status_code=400,
            detail=conflict_result["message"]
        )
    
    db_appointment = crud_appointment.create_appointment(
        db,
        appointment=appointment,
        user_id=user_id
    )
    
    # Send notification to store admin
    notification_service.notify_appointment_created(db, db_appointment)
    
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


@router.post("/{appointment_id}/cancel", response_model=Appointment)
def cancel_appointment(
    appointment_id: int,
    cancel_data: AppointmentCancel,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel appointment with reason (requires authentication)
    """
    appointment = crud_appointment.get_appointment(db, appointment_id=appointment_id)
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check if appointment belongs to current user
    if appointment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this appointment")
    
    # Check if appointment can be cancelled
    if appointment.status == AppointmentStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Appointment is already cancelled")
    
    if appointment.status == AppointmentStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Cannot cancel a completed appointment")
    
    # Cancel appointment with reason
    cancelled_appointment = crud_appointment.cancel_appointment_with_reason(
        db,
        appointment_id=appointment_id,
        cancel_reason=cancel_data.cancel_reason,
        cancelled_by=current_user.id
    )
    
    # Send notification (cancelled by customer)
    notification_service.notify_appointment_cancelled(db, cancelled_appointment, cancelled_by_admin=False)
    
    return cancelled_appointment


@router.post("/{appointment_id}/reschedule", response_model=Appointment)
def reschedule_appointment(
    appointment_id: int,
    reschedule_data: AppointmentReschedule,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reschedule appointment to a new date/time (requires authentication)
    """
    appointment = crud_appointment.get_appointment(db, appointment_id=appointment_id)
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check if appointment belongs to current user
    if appointment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to reschedule this appointment")
    
    # Check if appointment can be rescheduled
    if appointment.status == AppointmentStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Cannot reschedule a cancelled appointment")
    
    if appointment.status == AppointmentStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Cannot reschedule a completed appointment")
    
    # Check for time conflicts
    conflict_result = crud_appointment.check_time_conflict(
        db,
        appointment_date=reschedule_data.new_date,
        appointment_time=reschedule_data.new_time,
        service_id=appointment.service_id,
        technician_id=appointment.technician_id,
        user_id=current_user.id,
        exclude_appointment_id=appointment_id
    )
    
    if conflict_result["has_conflict"]:
        raise HTTPException(
            status_code=400,
            detail=conflict_result["message"]
        )
    
    # Reschedule appointment
    rescheduled_appointment = crud_appointment.reschedule_appointment(
        db,
        appointment_id=appointment_id,
        new_date=reschedule_data.new_date,
        new_time=reschedule_data.new_time
    )
    
    # Send notification
    notification_service.notify_appointment_rescheduled(db, rescheduled_appointment)
    
    return rescheduled_appointment


@router.patch("/{appointment_id}/notes", response_model=Appointment)
def update_appointment_notes(
    appointment_id: int,
    notes_data: AppointmentNotesUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update appointment notes (requires authentication)
    """
    appointment = crud_appointment.get_appointment(db, appointment_id=appointment_id)
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check if appointment belongs to current user
    if appointment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this appointment")
    
    # Update notes
    updated_appointment = crud_appointment.update_appointment(
        db,
        appointment_id=appointment_id,
        appointment=AppointmentUpdate(notes=notes_data.notes)
    )
    
    return updated_appointment


@router.patch("/{appointment_id}/confirm", response_model=Appointment)
def confirm_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Confirm appointment (Store admin only)
    
    - Super admin can confirm appointments from any store
    - Store manager can only confirm appointments from their own store
    """
    from app.models.service import Service
    from app.api.deps import get_current_store_admin
    
    # Verify user is store admin
    if not current_user.is_admin and not current_user.store_id:
        raise HTTPException(
            status_code=403,
            detail="Only store administrators can confirm appointments"
        )
    
    # Get appointment
    appointment = crud_appointment.get_appointment(db, appointment_id=appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Get service to check store ownership
    service = db.query(Service).filter(Service.id == appointment.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if service.store_id != current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only confirm appointments from your own store"
            )
    
    # Check current status
    if appointment.status == AppointmentStatus.CANCELLED:
        raise HTTPException(
            status_code=400,
            detail="Cannot confirm a cancelled appointment"
        )
    
    if appointment.status == AppointmentStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="Cannot confirm a completed appointment"
        )
    
    # Update status to confirmed
    updated_appointment = crud_appointment.update_appointment(
        db,
        appointment_id=appointment_id,
        appointment=AppointmentUpdate(status=AppointmentStatus.CONFIRMED)
    )
    
    # Send notification to customer
    notification_service.notify_appointment_confirmed(db, updated_appointment)
    
    return updated_appointment


@router.patch("/{appointment_id}/complete", response_model=Appointment)
def complete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Mark appointment as completed (Store admin only)
    
    - Super admin can complete appointments from any store
    - Store manager can only complete appointments from their own store
    """
    from app.models.service import Service
    
    # Verify user is store admin
    if not current_user.is_admin and not current_user.store_id:
        raise HTTPException(
            status_code=403,
            detail="Only store administrators can complete appointments"
        )
    
    # Get appointment
    appointment = crud_appointment.get_appointment(db, appointment_id=appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Get service to check store ownership
    service = db.query(Service).filter(Service.id == appointment.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if service.store_id != current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only complete appointments from your own store"
            )
    
    # Check current status
    if appointment.status == AppointmentStatus.CANCELLED:
        raise HTTPException(
            status_code=400,
            detail="Cannot complete a cancelled appointment"
        )
    
    if appointment.status == AppointmentStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="Appointment is already completed"
        )
    
    # Update status to completed
    updated_appointment = crud_appointment.update_appointment(
        db,
        appointment_id=appointment_id,
        appointment=AppointmentUpdate(status=AppointmentStatus.COMPLETED)
    )
    
    # Send notification to customer
    notification_service.notify_appointment_completed(db, updated_appointment)
    
    return updated_appointment
