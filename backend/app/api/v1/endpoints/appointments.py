"""
Appointments API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from zoneinfo import ZoneInfo

from app.api.deps import get_db, get_current_user
from app.crud import appointment as crud_appointment
from app.crud import points as crud_points
from app.schemas.appointment import (
    Appointment,
    AppointmentAmountUpdate,
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
from app.services import risk_service
from app.services import log_service
from app.crud import coupons as crud_coupons

router = APIRouter()
ET_TZ = ZoneInfo("America/New_York")

def _ensure_not_past_appointment(appointment_date, appointment_time):
    appointment_datetime = datetime.combine(appointment_date, appointment_time).replace(tzinfo=ET_TZ)
    now = datetime.now(ET_TZ)
    if appointment_datetime <= now:
        raise HTTPException(
            status_code=400,
            detail="Past time cannot be booked. Please select a future time."
        )


@router.post("/", response_model=Appointment)
def create_appointment(
    request: Request,
    appointment: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Create a new appointment (requires authentication)
    """
    user_id = current_user.id
    _ensure_not_past_appointment(appointment.appointment_date, appointment.appointment_time)
    ip_address = request.client.host if request.client else None

    decision = risk_service.evaluate_booking_request(
        db,
        user_id=user_id,
        appointment_date=appointment.appointment_date,
        ip_address=ip_address,
    )
    if not decision.allowed:
        risk_service.log_risk_event(
            db,
            user_id=user_id,
            event_type="booking_blocked",
            ip_address=ip_address,
            reason=decision.error_code,
            meta={"appointment_date": str(appointment.appointment_date)},
        )
        raise HTTPException(status_code=decision.status_code, detail=decision.message)

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
    if service.price is not None and db_appointment.order_amount is None:
        db_appointment.order_amount = float(service.price)
        db.commit()
        db.refresh(db_appointment)
    risk_service.log_risk_event(
        db,
        user_id=user_id,
        event_type="appointment_created",
        appointment_id=db_appointment.id,
        ip_address=ip_address,
        meta={"appointment_date": str(db_appointment.appointment_date)},
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
    for appt, store_name, store_address, service_name, service_price, service_duration, review_id in appointments_data:
        resolved_amount = appt.order_amount if appt.order_amount is not None else service_price
        result.append({
            **appt.__dict__,
            "store_name": store_name,
            "store_address": store_address,
            "service_name": service_name,
            "service_price": service_price,
            "order_amount": resolved_amount,
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
    for appt, store_name, store_address, service_name, service_price, service_duration, review_id in appointments_data:
        resolved_amount = appt.order_amount if appt.order_amount is not None else service_price
        result.append({
            **appt.__dict__,
            "store_name": store_name,
            "store_address": store_address,
            "service_name": service_name,
            "service_price": service_price,
            "order_amount": resolved_amount,
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
    risk_service.log_risk_event(
        db,
        user_id=current_user.id,
        event_type="appointment_cancelled",
        appointment_id=cancelled_appointment.id,
        reason="cancel_by_user",
    )
    risk_service.refresh_user_risk_state(db, user_id=current_user.id)
    
    # Send notification (cancelled by customer)
    notification_service.notify_appointment_cancelled(db, cancelled_appointment, cancelled_by_admin=False)
    
    # Cancel reminders
    reminder_service.handle_appointment_cancellation(db, appointment_id)
    
    return cancelled_appointment


@router.post("/{appointment_id}/reschedule", response_model=Appointment)
def reschedule_appointment(
    request: Request,
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

    _ensure_not_past_appointment(reschedule_data.new_date, reschedule_data.new_time)
    
    # Appointment owner can reschedule. Store admins can reschedule appointments in their store.
    if appointment.user_id != current_user.id:
        from app.models.service import Service

        if not current_user.is_admin and not current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to reschedule this appointment"
            )
        if not current_user.is_admin and current_user.store_admin_status != "approved":
            raise HTTPException(
                status_code=403,
                detail="Store admin approval required"
            )

        service = db.query(Service).filter(Service.id == appointment.service_id).first()
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")

        if not current_user.is_admin and service.store_id != current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only reschedule appointments from your own store"
            )
    
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

    if current_user.is_admin or current_user.store_id:
        store_id_value = service.store_id if "service" in locals() and service else None
        if store_id_value is None:
            service_for_log = db.query(Service).filter(Service.id == appointment.service_id).first()
            store_id_value = service_for_log.store_id if service_for_log else None
        log_service.create_audit_log(
            db,
            request=request,
            operator_user_id=current_user.id,
            module="appointments",
            action="appointment.reschedule",
            message="调整预约时间",
            target_type="appointment",
            target_id=str(rescheduled_appointment.id),
            store_id=store_id_value,
            before={"date": str(appointment.appointment_date), "time": str(appointment.appointment_time)},
            after={"date": str(rescheduled_appointment.appointment_date), "time": str(rescheduled_appointment.appointment_time)},
        )
    
    return rescheduled_appointment


@router.patch("/{appointment_id}/notes", response_model=Appointment)
def update_appointment_notes(
    request: Request,
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
    
    # Appointment owner can edit notes. Store admins can edit notes for their store.
    if appointment.user_id != current_user.id:
        from app.models.service import Service

        if not current_user.is_admin and not current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to update this appointment"
            )
        if not current_user.is_admin and current_user.store_admin_status != "approved":
            raise HTTPException(
                status_code=403,
                detail="Store admin approval required"
            )

        service = db.query(Service).filter(Service.id == appointment.service_id).first()
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")

        if not current_user.is_admin and service.store_id != current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only update notes for appointments from your own store"
            )
    
    # Update notes
    updated_appointment = crud_appointment.update_appointment(
        db,
        appointment_id=appointment_id,
        appointment=AppointmentUpdate(notes=notes_data.notes)
    )

    if current_user.is_admin or current_user.store_id:
        store_id_value = service.store_id if "service" in locals() and service else None
        if store_id_value is None:
            service_for_log = db.query(Service).filter(Service.id == appointment.service_id).first()
            store_id_value = service_for_log.store_id if service_for_log else None
        log_service.create_audit_log(
            db,
            request=request,
            operator_user_id=current_user.id,
            module="appointments",
            action="appointment.notes.update",
            message="更新预约备注",
            target_type="appointment",
            target_id=str(updated_appointment.id),
            store_id=store_id_value,
            before={"notes": appointment.notes},
            after={"notes": updated_appointment.notes},
        )
    
    return updated_appointment


@router.patch("/{appointment_id}/amount", response_model=Appointment)
def update_appointment_amount(
    request: Request,
    appointment_id: int,
    amount_data: AppointmentAmountUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update appointment order amount (Store admin only).

    - Super admin can update any store appointment.
    - Store manager can only update their own store appointments.
    """
    from app.models.service import Service

    if amount_data.order_amount < 0:
        raise HTTPException(status_code=400, detail="Order amount cannot be negative")

    if not current_user.is_admin and not current_user.store_id:
        raise HTTPException(status_code=403, detail="Only store administrators can update order amount")
    if not current_user.is_admin and current_user.store_admin_status != "approved":
        raise HTTPException(status_code=403, detail="Store admin approval required")

    appointment = crud_appointment.get_appointment(db, appointment_id=appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    service = db.query(Service).filter(Service.id == appointment.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    if not current_user.is_admin and service.store_id != current_user.store_id:
        raise HTTPException(status_code=403, detail="You can only update appointments from your own store")

    before_amount = appointment.order_amount if appointment.order_amount is not None else service.price
    appointment.order_amount = float(amount_data.order_amount)
    db.commit()
    db.refresh(appointment)

    log_service.create_audit_log(
        db,
        request=request,
        operator_user_id=current_user.id,
        module="appointments",
        action="appointment.amount.update",
        message="更新预约订单金额",
        target_type="appointment",
        target_id=str(appointment.id),
        store_id=service.store_id if service else None,
        before={"order_amount": before_amount},
        after={"order_amount": appointment.order_amount},
    )

    return appointment


@router.put("/{appointment_id}/status", response_model=Appointment)
def update_appointment_status(
    request: Request,
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
        log_service.create_audit_log(
            db,
            request=request,
            operator_user_id=current_user.id,
            module="appointments",
            action="appointment.status.confirmed",
            message="预约状态改为已确认",
            target_type="appointment",
            target_id=str(updated_appointment.id),
            store_id=service.store_id if service else None,
            before={"status": str(appointment.status.value if hasattr(appointment.status, "value") else appointment.status)},
            after={"status": str(updated_appointment.status.value if hasattr(updated_appointment.status, "value") else updated_appointment.status)},
        )
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

        effective_amount = float(
            updated_appointment.order_amount
            if updated_appointment.order_amount is not None
            else (service.price or 0)
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
                original_amount=effective_amount
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

        if effective_amount > 0:
            points_txn = crud_points.award_points_for_appointment(
                db=db,
                user_id=updated_appointment.user_id,
                appointment_id=updated_appointment.id,
                amount_spent=effective_amount
            )
            if points_txn:
                notification_service.notify_points_earned(
                    db=db,
                    appointment=updated_appointment,
                    points=points_txn.amount
                )

        notification_service.notify_appointment_completed(db, updated_appointment)
        log_service.create_audit_log(
            db,
            request=request,
            operator_user_id=current_user.id,
            module="appointments",
            action="appointment.status.completed",
            message="预约状态改为已完成",
            target_type="appointment",
            target_id=str(updated_appointment.id),
            store_id=service.store_id if service else None,
            before={"status": str(appointment.status.value if hasattr(appointment.status, "value") else appointment.status)},
            after={"status": str(updated_appointment.status.value if hasattr(updated_appointment.status, "value") else updated_appointment.status)},
            meta={"used_coupon": bool(status_update.user_coupon_id), "order_amount": effective_amount},
        )
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
        risk_service.log_risk_event(
            db,
            user_id=cancelled_appointment.user_id,
            event_type="appointment_cancelled",
            appointment_id=cancelled_appointment.id,
            reason="cancel_by_admin",
            meta={"admin_id": current_user.id},
        )
        risk_service.refresh_user_risk_state(db, user_id=cancelled_appointment.user_id)
        notification_service.notify_appointment_cancelled(
            db, cancelled_appointment, cancelled_by_admin=True
        )
        reminder_service.handle_appointment_cancellation(db, appointment_id)
        log_service.create_audit_log(
            db,
            request=request,
            operator_user_id=current_user.id,
            module="appointments",
            action="appointment.status.cancelled",
            message="预约状态改为已取消",
            target_type="appointment",
            target_id=str(cancelled_appointment.id),
            store_id=service.store_id if service else None,
            before={"status": str(appointment.status.value if hasattr(appointment.status, "value") else appointment.status)},
            after={"status": str(cancelled_appointment.status.value if hasattr(cancelled_appointment.status, "value") else cancelled_appointment.status)},
            meta={"cancel_reason": status_update.cancel_reason},
        )
        return cancelled_appointment

    raise HTTPException(status_code=400, detail="Unsupported status update")


@router.patch("/{appointment_id}/confirm", response_model=Appointment)
def confirm_appointment(
    request: Request,
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
    log_service.create_audit_log(
        db,
        request=request,
        operator_user_id=current_user.id,
        module="appointments",
        action="appointment.confirm",
        message="确认预约",
        target_type="appointment",
        target_id=str(updated_appointment.id),
        store_id=service.store_id if service else None,
        before={"status": str(appointment.status.value if hasattr(appointment.status, "value") else appointment.status)},
        after={"status": str(updated_appointment.status.value if hasattr(updated_appointment.status, "value") else updated_appointment.status)},
    )
    
    return updated_appointment


@router.post("/{appointment_id}/no-show", response_model=Appointment)
def mark_appointment_no_show(
    request: Request,
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Mark appointment as no-show (Store admin only).

    Since current status enum doesn't include no_show yet, we persist it as cancelled
    with a no-show reason and log a dedicated risk event for scoring.
    """
    from app.models.service import Service

    if not current_user.is_admin and not current_user.store_id:
        raise HTTPException(
            status_code=403,
            detail="Only store administrators can mark no-show"
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
            detail="You can only mark no-show for appointments from your own store"
        )

    if appointment.status == AppointmentStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Cannot mark completed appointment as no-show")
    if appointment.status == AppointmentStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Appointment is already cancelled")

    no_show_appointment = crud_appointment.cancel_appointment_with_reason(
        db,
        appointment_id=appointment_id,
        cancel_reason="No show",
        cancelled_by=current_user.id
    )
    risk_service.log_risk_event(
        db,
        user_id=no_show_appointment.user_id,
        event_type="appointment_no_show",
        appointment_id=no_show_appointment.id,
        reason="marked_by_admin",
        meta={"admin_id": current_user.id},
    )
    risk_service.refresh_user_risk_state(db, user_id=no_show_appointment.user_id)
    notification_service.notify_appointment_cancelled(
        db, no_show_appointment, cancelled_by_admin=True
    )
    reminder_service.handle_appointment_cancellation(db, appointment_id)
    log_service.create_audit_log(
        db,
        request=request,
        operator_user_id=current_user.id,
        module="appointments",
        action="appointment.no_show",
        message="标记预约为未到店",
        target_type="appointment",
        target_id=str(no_show_appointment.id),
        store_id=service.store_id if service else None,
        before={"status": str(appointment.status.value if hasattr(appointment.status, "value") else appointment.status)},
        after={
            "status": str(no_show_appointment.status.value if hasattr(no_show_appointment.status, "value") else no_show_appointment.status),
            "cancel_reason": no_show_appointment.cancel_reason,
        },
    )

    return no_show_appointment


@router.patch("/{appointment_id}/complete", response_model=Appointment)
def complete_appointment(
    request: Request,
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
    effective_amount = float(
        updated_appointment.order_amount
        if updated_appointment.order_amount is not None
        else (service.price or 0)
    )

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
            original_amount=effective_amount
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
    if effective_amount > 0:
        points_txn = crud_points.award_points_for_appointment(
            db=db,
            user_id=updated_appointment.user_id,
            appointment_id=updated_appointment.id,
            amount_spent=effective_amount
        )
        if points_txn:
            notification_service.notify_points_earned(
                db=db,
                appointment=updated_appointment,
                points=points_txn.amount
            )
    
    # Send notification to customer
    notification_service.notify_appointment_completed(db, updated_appointment)
    log_service.create_audit_log(
        db,
        request=request,
        operator_user_id=current_user.id,
        module="appointments",
        action="appointment.complete",
        message="完成预约",
        target_type="appointment",
        target_id=str(updated_appointment.id),
        store_id=service.store_id if service else None,
        before={"status": str(appointment.status.value if hasattr(appointment.status, "value") else appointment.status)},
        after={"status": str(updated_appointment.status.value if hasattr(updated_appointment.status, "value") else updated_appointment.status)},
        meta={"used_coupon": bool(payload and payload.user_coupon_id), "order_amount": effective_amount},
    )
    
    return updated_appointment
