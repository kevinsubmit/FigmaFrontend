"""
Appointments API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db, get_current_user
from app.crud import appointment as crud_appointment
from app.crud import points as crud_points
from app.schemas.appointment import (
    Appointment,
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentWithDetails,
    AppointmentCancel,
    AppointmentReschedule,
    AppointmentNotesUpdate,
    AppointmentComplete,
    AppointmentStatusUpdate
)
from app.schemas.user import UserResponse
from app.models.appointment import AppointmentStatus
from app.models.service import Service
from app.services import notification_service
from app.services import reminder_service
from app.crud import coupons as crud_coupons

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

    service = db.query(Service).filter(Service.id == appointment.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    if service.store_id != appointment.store_id:
        raise HTTPException(status_code=400, detail="Service does not belong to this store")
    if service.is_active != 1:
        raise HTTPException(status_code=400, detail="Service is not available")
    
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
    
    # Create reminders for the appointment
    reminder_service.create_reminders_on_appointment_creation(
        db,
        db_appointment.id,
        user_id,
        db_appointment.appointment_date,
        db_appointment.appointment_time
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
    for appt, store_name, service_name, service_price, service_duration, review_id in appointments_data:
        result.append({
            **appt.__dict__,
            "store_name": store_name,
            "service_name": service_name,
            "service_price": service_price,
            "service_duration": service_duration,
            "review_id": review_id
        })
    
    return result


@router.get("/admin", response_model=List[AppointmentWithDetails])
def get_admin_appointments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    status: Optional[str] = Query(None, description="Filter by status"),
    store_id: Optional[int] = Query(None, description="Filter by store ID (super admin only)"),
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get appointments with details (Store admin only)

    - Super admin can view appointments from any store
    - Store manager can only view appointments from their own store
    """
    if not current_user.is_admin and not current_user.store_id:
        raise HTTPException(
            status_code=403,
            detail="Only store administrators can view appointments"
        )
    if not current_user.is_admin and current_user.store_admin_status != "approved":
        raise HTTPException(
            status_code=403,
            detail="Store admin approval required"
        )

    resolved_store_id = store_id
    if not current_user.is_admin:
        resolved_store_id = current_user.store_id
    elif store_id is None:
        resolved_store_id = None

    status_enum = None
    if status:
        try:
            status_enum = AppointmentStatus(status)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid status"
            )

    appointments_data = crud_appointment.get_appointments_with_details(
        db,
        skip=skip,
        limit=limit,
        store_id=resolved_store_id,
        status=status_enum
    )

    result = []
    for appt, store_name, service_name, service_price, service_duration, review_id in appointments_data:
        result.append({
            **appt.__dict__,
            "store_name": store_name,
            "service_name": service_name,
            "service_price": service_price,
            "service_duration": service_duration,
            "review_id": review_id
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
    
    # Cancel reminders
    reminder_service.handle_appointment_cancellation(db, appointment_id)
    
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
    
    # Update reminders
    reminder_service.handle_appointment_reschedule(
        db,
        appointment_id,
        current_user.id,
        reschedule_data.new_date,
        reschedule_data.new_time
    )
    
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


@router.put("/{appointment_id}/status", response_model=Appointment)
def update_appointment_status(
    appointment_id: int,
    status_update: AppointmentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Update appointment status (Store admin only)

    Supports: confirmed, completed, cancelled
    """
    from app.models.service import Service

    # Verify user is store admin
    if not current_user.is_admin and not current_user.store_id:
        raise HTTPException(
            status_code=403,
            detail="Only store administrators can update appointment status"
        )
    if not current_user.is_admin and current_user.store_admin_status != "approved":
        raise HTTPException(
            status_code=403,
            detail="Store admin approval required"
        )

    appointment = crud_appointment.get_appointment(db, appointment_id=appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    service = db.query(Service).filter(Service.id == appointment.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    if not current_user.is_admin and service.store_id != current_user.store_id:
        raise HTTPException(
            status_code=403,
            detail="You can only update appointments from your own store"
        )

    target_status = status_update.status
    if target_status == AppointmentStatus.CONFIRMED:
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

        updated_appointment = crud_appointment.update_appointment(
            db,
            appointment_id=appointment_id,
            appointment=AppointmentUpdate(status=AppointmentStatus.CONFIRMED)
        )
        notification_service.notify_appointment_confirmed(db, updated_appointment)
        return updated_appointment

    if target_status == AppointmentStatus.COMPLETED:
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

        updated_appointment = crud_appointment.update_appointment(
            db,
            appointment_id=appointment_id,
            appointment=AppointmentUpdate(status=AppointmentStatus.COMPLETED)
        )

        if status_update.user_coupon_id:
            user_coupon = crud_coupons.get_user_coupon(
                db, status_update.user_coupon_id, updated_appointment.user_id
            )
            if not user_coupon:
                raise HTTPException(
                    status_code=400,
                    detail="Coupon not found for this user"
                )

            coupon = crud_coupons.get_coupon(db, user_coupon.coupon_id)
            if not coupon:
                raise HTTPException(
                    status_code=400,
                    detail="Coupon template not found"
                )

            discount = crud_coupons.calculate_discount(
                coupon=coupon,
                original_amount=service.price or 0
            )

            if discount <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Coupon is not applicable to this appointment amount"
                )

            try:
                crud_coupons.use_coupon(
                    db=db,
                    user_coupon_id=status_update.user_coupon_id,
                    user_id=updated_appointment.user_id,
                    appointment_id=updated_appointment.id
                )
            except ValueError as e:
                raise HTTPException(
                    status_code=400,
                    detail=str(e)
                )

        if service.price is not None:
            points_txn = crud_points.award_points_for_appointment(
                db=db,
                user_id=updated_appointment.user_id,
                appointment_id=updated_appointment.id,
                amount_spent=service.price
            )
            if points_txn:
                notification_service.notify_points_earned(
                    db=db,
                    appointment=updated_appointment,
                    points=points_txn.amount
                )

        notification_service.notify_appointment_completed(db, updated_appointment)
        return updated_appointment

    if target_status == AppointmentStatus.CANCELLED:
        if appointment.status == AppointmentStatus.CANCELLED:
            raise HTTPException(status_code=400, detail="Appointment is already cancelled")
        if appointment.status == AppointmentStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Cannot cancel a completed appointment")

        cancelled_appointment = crud_appointment.cancel_appointment_with_reason(
            db,
            appointment_id=appointment_id,
            cancel_reason=status_update.cancel_reason,
            cancelled_by=current_user.id
        )
        notification_service.notify_appointment_cancelled(
            db, cancelled_appointment, cancelled_by_admin=True
        )
        reminder_service.handle_appointment_cancellation(db, appointment_id)
        return cancelled_appointment

    raise HTTPException(status_code=400, detail="Unsupported status update")


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
    if not current_user.is_admin and current_user.store_admin_status != "approved":
        raise HTTPException(
            status_code=403,
            detail="Store admin approval required"
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
    payload: AppointmentComplete = None,
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
    if not current_user.is_admin and current_user.store_admin_status != "approved":
        raise HTTPException(
            status_code=403,
            detail="Store admin approval required"
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

    # Apply coupon if provided (admin selected)
    if payload and payload.user_coupon_id:
        user_coupon = crud_coupons.get_user_coupon(
            db, payload.user_coupon_id, updated_appointment.user_id
        )
        if not user_coupon:
            raise HTTPException(
                status_code=400,
                detail="Coupon not found for this user"
            )

        coupon = crud_coupons.get_coupon(db, user_coupon.coupon_id)
        if not coupon:
            raise HTTPException(
                status_code=400,
                detail="Coupon template not found"
            )

        discount = crud_coupons.calculate_discount(
            coupon=coupon,
            original_amount=service.price or 0
        )

        if discount <= 0:
            raise HTTPException(
                status_code=400,
                detail="Coupon is not applicable to this appointment amount"
            )

        try:
            crud_coupons.use_coupon(
                db=db,
                user_coupon_id=payload.user_coupon_id,
                user_id=updated_appointment.user_id,
                appointment_id=updated_appointment.id
            )
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=str(e)
            )

    # Award points based on service price (1 point per $1)
    if service.price is not None:
        points_txn = crud_points.award_points_for_appointment(
            db=db,
            user_id=updated_appointment.user_id,
            appointment_id=updated_appointment.id,
            amount_spent=service.price
        )
        if points_txn:
            notification_service.notify_points_earned(
                db=db,
                appointment=updated_appointment,
                points=points_txn.amount
            )
    
    # Send notification to customer
    notification_service.notify_appointment_completed(db, updated_appointment)
    
    return updated_appointment
