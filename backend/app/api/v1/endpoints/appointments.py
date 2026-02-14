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
    AppointmentGuestOwnerUpdate,
    AppointmentGroupAddGuests,
    AppointmentGroupCreate,
    AppointmentGroupGuestCreate,
    AppointmentGroupResponse,
    AppointmentStaffSplitSummary,
    AppointmentStaffSplitUpdate,
    AppointmentStaffSplitResponse,
    AppointmentTechnicianUpdate,
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
from app.models.appointment import Appointment as AppointmentModel
from app.models.appointment_group import AppointmentGroup
from app.models.service import Service
from app.models.store import Store
from app.models.technician import Technician
from app.models.appointment_staff_split import AppointmentStaffSplit
from app.models.user import User as UserModel
from app.models.review import Review
from app.services import notification_service
from app.services import reminder_service
from app.services import risk_service
from app.services import log_service
from app.crud import coupons as crud_coupons

router = APIRouter()
ET_TZ = ZoneInfo("America/New_York")


def _normalize_us_phone(raw_phone: Optional[str]) -> Optional[str]:
    if not raw_phone:
        return None
    digits = "".join(ch for ch in str(raw_phone) if ch.isdigit())
    if len(digits) == 10:
        return f"1{digits}"
    if len(digits) == 11:
        return digits
    return None


def _resolve_guest_owner_user_id(db: Session, raw_phone: Optional[str], fallback_user_id: int) -> int:
    normalized_phone = _normalize_us_phone(raw_phone)
    if not normalized_phone:
        return fallback_user_id
    user = db.query(UserModel).filter(UserModel.phone == normalized_phone, UserModel.is_active == True).first()
    if user:
        return int(user.id)
    return fallback_user_id

def _ensure_not_past_appointment(appointment_date, appointment_time):
    appointment_datetime = datetime.combine(appointment_date, appointment_time).replace(tzinfo=ET_TZ)
    now = datetime.now(ET_TZ)
    if appointment_datetime <= now:
        raise HTTPException(
            status_code=400,
            detail="Past time cannot be booked. Please select a future time."
        )


def _resolve_appointment_order_amount(appointment, service: Optional[Service]) -> float:
    if appointment.order_amount is not None:
        return float(appointment.order_amount)
    if service and service.price is not None:
        return float(service.price)
    return 0.0


def _mark_paid_if_completed(appointment: AppointmentModel, service: Optional[Service]) -> None:
    if appointment.status != AppointmentStatus.COMPLETED:
        return
    order_amount = _resolve_appointment_order_amount(appointment, service)
    appointment.payment_status = "paid"
    appointment.paid_amount = float(order_amount)


def _recompute_group_host_status(db: Session, group_id: int) -> None:
    group = db.query(AppointmentGroup).filter(AppointmentGroup.id == group_id).first()
    if not group:
        return
    host = db.query(AppointmentModel).filter(AppointmentModel.id == group.host_appointment_id).first()
    if not host:
        return

    members = (
        db.query(AppointmentModel)
        .filter(AppointmentModel.group_id == group_id)
        .order_by(AppointmentModel.id.asc())
        .all()
    )
    if not members:
        return

    statuses = [member.status for member in members]
    if any(status == AppointmentStatus.COMPLETED for status in statuses):
        next_status = AppointmentStatus.COMPLETED
    elif any(status == AppointmentStatus.CONFIRMED for status in statuses):
        next_status = AppointmentStatus.CONFIRMED
    elif all(status == AppointmentStatus.CANCELLED for status in statuses):
        next_status = AppointmentStatus.CANCELLED
    else:
        next_status = AppointmentStatus.PENDING

    host.status = next_status
    host.is_group_host = True
    if next_status == AppointmentStatus.COMPLETED:
        if host.completed_at is None:
            host.completed_at = datetime.utcnow()
        service = db.query(Service).filter(Service.id == host.service_id).first()
        _mark_paid_if_completed(host, service)


def _appointment_row_to_details_payload(row_tuple):
    appt, store_name, store_address, service_name, service_price, service_duration, review_id, user_name, customer_name, customer_phone, technician_name = row_tuple
    resolved_amount = appt.order_amount if appt.order_amount is not None else service_price
    resolved_customer_name = appt.guest_name or customer_name or user_name
    resolved_customer_phone = appt.guest_phone or customer_phone
    return {
        **appt.__dict__,
        "store_name": store_name,
        "store_address": store_address,
        "service_name": service_name,
        "service_price": service_price,
        "order_amount": resolved_amount,
        "service_duration": service_duration,
        "review_id": review_id,
        "user_name": user_name,
        "customer_name": resolved_customer_name,
        "customer_phone": resolved_customer_phone,
        "technician_name": technician_name,
    }


def _get_group_appointments_with_details(db: Session, group_id: int):
    return (
        db.query(
            AppointmentModel,
            Store.name.label("store_name"),
            Store.address.label("store_address"),
            Service.name.label("service_name"),
            Service.price.label("service_price"),
            Service.duration_minutes.label("service_duration"),
            Review.id.label("review_id"),
            UserModel.username.label("user_name"),
            UserModel.full_name.label("customer_name"),
            UserModel.phone.label("customer_phone"),
            Technician.name.label("technician_name"),
        )
        .join(Store, AppointmentModel.store_id == Store.id)
        .join(Service, AppointmentModel.service_id == Service.id)
        .outerjoin(UserModel, AppointmentModel.user_id == UserModel.id)
        .outerjoin(Technician, AppointmentModel.technician_id == Technician.id)
        .outerjoin(Review, Review.appointment_id == AppointmentModel.id)
        .filter(AppointmentModel.group_id == group_id)
        .order_by(AppointmentModel.id.asc())
        .all()
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
    store = db.query(Store).filter(Store.id == appointment.store_id).first()
    if not store or store.is_visible is False:
        raise HTTPException(status_code=400, detail="Store is not available")
    
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


def _validate_store_service_for_group(db: Session, store_id: int, service_id: int) -> Service:
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail=f"Service {service_id} not found")
    if service.store_id != store_id:
        raise HTTPException(status_code=400, detail=f"Service {service.name} does not belong to this store")
    if service.is_active != 1:
        raise HTTPException(status_code=400, detail=f"Service {service.name} is not available")
    return service


def _create_group_child_appointment(
    db: Session,
    user_id: int,
    store_id: int,
    appointment_date,
    appointment_time,
    item: AppointmentGroupGuestCreate,
) -> AppointmentModel:
    _validate_store_service_for_group(db, store_id, item.service_id)
    normalized_guest_phone = _normalize_us_phone(item.guest_phone)
    if item.guest_phone and not normalized_guest_phone:
        raise HTTPException(status_code=400, detail="Guest phone must be a valid US phone number")
    owner_user_id = _resolve_guest_owner_user_id(db, normalized_guest_phone, user_id)
    conflict_result = crud_appointment.check_time_conflict(
        db,
        appointment_date=appointment_date,
        appointment_time=appointment_time,
        service_id=item.service_id,
        technician_id=item.technician_id,
        user_id=owner_user_id if owner_user_id != user_id else None,
    )
    if conflict_result["has_conflict"]:
        raise HTTPException(status_code=400, detail=conflict_result["message"])
    child = crud_appointment.create_appointment(
        db,
        appointment=AppointmentCreate(
            store_id=store_id,
            service_id=item.service_id,
            technician_id=item.technician_id,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            notes=item.notes,
        ),
        user_id=owner_user_id,
        booked_by_user_id=user_id,
    )
    child.guest_name = item.guest_name
    child.guest_phone = normalized_guest_phone
    child.is_group_host = False
    child.payment_status = "unpaid"
    child.paid_amount = 0.0
    return child


@router.post("/groups", response_model=AppointmentGroupResponse)
def create_appointment_group(
    request: Request,
    payload: AppointmentGroupCreate,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    _ensure_not_past_appointment(payload.appointment_date, payload.appointment_time)
    store = db.query(Store).filter(Store.id == payload.store_id).first()
    if not store or store.is_visible is False:
        raise HTTPException(status_code=400, detail="Store is not available")

    host_service = _validate_store_service_for_group(db, payload.store_id, payload.host_service_id)
    conflict_result = crud_appointment.check_time_conflict(
        db,
        appointment_date=payload.appointment_date,
        appointment_time=payload.appointment_time,
        service_id=payload.host_service_id,
        technician_id=payload.host_technician_id,
        user_id=current_user.id,
    )
    if conflict_result["has_conflict"]:
        raise HTTPException(status_code=400, detail=conflict_result["message"])

    host = crud_appointment.create_appointment(
        db,
        appointment=AppointmentCreate(
            store_id=payload.store_id,
            service_id=payload.host_service_id,
            technician_id=payload.host_technician_id,
            appointment_date=payload.appointment_date,
            appointment_time=payload.appointment_time,
            notes=payload.host_notes,
        ),
        user_id=current_user.id,
    )
    if host.order_amount is None and host_service.price is not None:
        host.order_amount = float(host_service.price)
    host.is_group_host = True
    host.payment_status = "unpaid"
    host.paid_amount = 0.0

    group = AppointmentGroup(
        host_appointment_id=host.id,
        store_id=payload.store_id,
        appointment_date=payload.appointment_date,
        appointment_time=payload.appointment_time,
        created_by_user_id=current_user.id,
    )
    db.add(group)
    db.flush()
    group.group_code = f"GRP{payload.appointment_date.strftime('%y%m%d')}{group.id:06d}"
    host.group_id = group.id

    guest_appointments: List[AppointmentModel] = []
    for item in payload.guests:
        guest = _create_group_child_appointment(
            db=db,
            user_id=current_user.id,
            store_id=payload.store_id,
            appointment_date=payload.appointment_date,
            appointment_time=payload.appointment_time,
            item=item,
        )
        guest.group_id = group.id
        guest_appointments.append(guest)

    _recompute_group_host_status(db, group.id)
    db.commit()

    rows = _get_group_appointments_with_details(db, group_id=group.id)
    row_map = {row[0].id: row for row in rows}
    host_payload = _appointment_row_to_details_payload(row_map[host.id])
    guest_payloads = [_appointment_row_to_details_payload(row_map[item.id]) for item in guest_appointments]
    return AppointmentGroupResponse(
        group_id=group.id,
        group_code=group.group_code,
        host_appointment=AppointmentWithDetails(**host_payload),
        guest_appointments=[AppointmentWithDetails(**item) for item in guest_payloads],
    )


@router.post("/groups/{group_id}/guests", response_model=AppointmentGroupResponse)
def append_appointment_group_guests(
    group_id: int,
    payload: AppointmentGroupAddGuests,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    group = db.query(AppointmentGroup).filter(AppointmentGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Appointment group not found")
    host = db.query(AppointmentModel).filter(AppointmentModel.id == group.host_appointment_id).first()
    if not host:
        raise HTTPException(status_code=404, detail="Host appointment not found")
    if host.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to modify this appointment group")
    if host.status == AppointmentStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Cannot append guests to a cancelled group")

    guest_appointments: List[AppointmentModel] = []
    for item in payload.guests:
        guest = _create_group_child_appointment(
            db=db,
            user_id=host.user_id,
            store_id=group.store_id,
            appointment_date=group.appointment_date,
            appointment_time=group.appointment_time,
            item=item,
        )
        guest.group_id = group.id
        guest_appointments.append(guest)

    _recompute_group_host_status(db, group.id)
    db.commit()

    rows = _get_group_appointments_with_details(db, group_id=group.id)
    host_payload = None
    guest_payloads = []
    for row in rows:
        appointment_id = row[0].id
        if appointment_id == host.id:
            host_payload = _appointment_row_to_details_payload(row)
        elif appointment_id in {item.id for item in guest_appointments}:
            guest_payloads.append(_appointment_row_to_details_payload(row))
    if not host_payload:
        raise HTTPException(status_code=500, detail="Failed to resolve host appointment details")
    return AppointmentGroupResponse(
        group_id=group.id,
        group_code=group.group_code,
        host_appointment=AppointmentWithDetails(**host_payload),
        guest_appointments=[AppointmentWithDetails(**item) for item in guest_payloads],
    )


@router.get("/groups/{group_id}", response_model=AppointmentGroupResponse)
def get_appointment_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    group = db.query(AppointmentGroup).filter(AppointmentGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Appointment group not found")
    host = db.query(AppointmentModel).filter(AppointmentModel.id == group.host_appointment_id).first()
    if not host:
        raise HTTPException(status_code=404, detail="Host appointment not found")
    if host.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to view this appointment group")

    rows = _get_group_appointments_with_details(db, group_id=group.id)
    host_payload = None
    guest_payloads = []
    for row in rows:
        appt = row[0]
        if appt.group_id != group.id:
            continue
        payload = _appointment_row_to_details_payload(row)
        if appt.id == host.id:
            host_payload = payload
        else:
            guest_payloads.append(payload)
    if not host_payload:
        raise HTTPException(status_code=500, detail="Failed to resolve host appointment details")
    return AppointmentGroupResponse(
        group_id=group.id,
        group_code=group.group_code,
        host_appointment=AppointmentWithDetails(**host_payload),
        guest_appointments=[AppointmentWithDetails(**item) for item in guest_payloads],
    )


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
    for appt, store_name, store_address, service_name, service_price, service_duration, review_id, user_name, customer_name, customer_phone, technician_name in appointments_data:
        resolved_amount = appt.order_amount if appt.order_amount is not None else service_price
        resolved_customer_name = appt.guest_name or customer_name or user_name
        resolved_customer_phone = appt.guest_phone or customer_phone
        result.append({
            **appt.__dict__,
            "store_name": store_name,
            "store_address": store_address,
            "service_name": service_name,
            "service_price": service_price,
            "order_amount": resolved_amount,
            "service_duration": service_duration,
            "review_id": review_id,
            "user_name": user_name,
            "customer_name": resolved_customer_name,
            "customer_phone": resolved_customer_phone,
            "technician_name": technician_name,
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
    for appt, store_name, store_address, service_name, service_price, service_duration, review_id, user_name, customer_name, customer_phone, technician_name in appointments_data:
        resolved_amount = appt.order_amount if appt.order_amount is not None else service_price
        resolved_customer_name = appt.guest_name or customer_name or user_name
        resolved_customer_phone = appt.guest_phone or customer_phone
        result.append({
            **appt.__dict__,
            "store_name": store_name,
            "store_address": store_address,
            "service_name": service_name,
            "service_price": service_price,
            "order_amount": resolved_amount,
            "service_duration": service_duration,
            "review_id": review_id,
            "user_name": user_name,
            "customer_name": resolved_customer_name,
            "customer_phone": resolved_customer_phone,
            "technician_name": technician_name,
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
    if cancelled_appointment.group_id:
        _recompute_group_host_status(db, cancelled_appointment.group_id)
        db.commit()
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

    if amount_data.order_amount < 1:
        raise HTTPException(status_code=400, detail="Order amount must be greater than or equal to 1")

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


@router.patch("/{appointment_id}/technician", response_model=Appointment)
def update_appointment_technician(
    request: Request,
    appointment_id: int,
    payload: AppointmentTechnicianUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Bind appointment to technician (Store admin only).
    Allowed statuses: pending, confirmed, completed.
    """
    if not current_user.is_admin and not current_user.store_id:
        raise HTTPException(status_code=403, detail="Only store administrators can bind technician")
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

    if appointment.status not in (
        AppointmentStatus.PENDING,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.COMPLETED,
    ):
        raise HTTPException(
            status_code=400,
            detail="Only pending, confirmed, or completed appointments can bind technician",
        )

    technician = None
    if payload.technician_id is not None:
        technician = db.query(Technician).filter(Technician.id == payload.technician_id).first()
        if not technician:
            raise HTTPException(status_code=404, detail="Technician not found")
        if technician.store_id != appointment.store_id:
            raise HTTPException(status_code=400, detail="Technician does not belong to this store")
        if technician.is_active != 1:
            raise HTTPException(status_code=400, detail="Technician is inactive")

    before_technician_id = appointment.technician_id
    appointment.technician_id = payload.technician_id
    db.commit()
    db.refresh(appointment)

    log_service.create_audit_log(
        db,
        request=request,
        operator_user_id=current_user.id,
        module="appointments",
        action="appointment.technician.update",
        message="绑定预约技师",
        target_type="appointment",
        target_id=str(appointment.id),
        store_id=appointment.store_id,
        before={"technician_id": before_technician_id},
        after={"technician_id": appointment.technician_id},
    )

    return appointment


@router.patch("/{appointment_id}/guest-owner", response_model=Appointment)
def update_appointment_guest_owner(
    request: Request,
    appointment_id: int,
    payload: AppointmentGuestOwnerUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update guest owner info for a group child appointment.

    - Supports unregistered guest by guest_phone snapshot.
    - If phone already exists as a registered user, appointment ownership is reassigned to that user.
    """
    if not current_user.is_admin and not current_user.store_id:
        raise HTTPException(status_code=403, detail="Only store administrators can update guest owner")
    if not current_user.is_admin and current_user.store_admin_status != "approved":
        raise HTTPException(status_code=403, detail="Store admin approval required")

    appointment = crud_appointment.get_appointment(db, appointment_id=appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if not appointment.group_id or appointment.is_group_host:
        raise HTTPException(status_code=400, detail="Only group child appointments support guest owner assignment")

    if not current_user.is_admin and appointment.store_id != current_user.store_id:
        raise HTTPException(status_code=403, detail="You can only update appointments from your own store")

    normalized_guest_phone = _normalize_us_phone(payload.guest_phone)
    if payload.guest_phone and not normalized_guest_phone:
        raise HTTPException(status_code=400, detail="Guest phone must be a valid US phone number")

    booked_by_user_id = appointment.booked_by_user_id or appointment.user_id
    target_user = None
    if normalized_guest_phone:
        target_user = (
            db.query(UserModel)
            .filter(UserModel.phone == normalized_guest_phone, UserModel.is_active == True)
            .first()
        )

    appointment.guest_phone = normalized_guest_phone
    appointment.guest_name = payload.guest_name.strip() if payload.guest_name else None
    appointment.user_id = int(target_user.id) if target_user else int(booked_by_user_id)
    db.commit()
    db.refresh(appointment)

    log_service.create_audit_log(
        db,
        request=request,
        operator_user_id=current_user.id,
        module="appointments",
        action="appointment.guest_owner.update",
        message="更新团单子单客人归属",
        target_type="appointment",
        target_id=str(appointment.id),
        store_id=appointment.store_id,
        after={
            "guest_phone": appointment.guest_phone,
            "guest_name": appointment.guest_name,
            "owner_user_id": appointment.user_id,
        },
    )

    return appointment


@router.get("/{appointment_id}/splits", response_model=AppointmentStaffSplitSummary)
def get_appointment_staff_splits(
    appointment_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_admin and not current_user.store_id:
        raise HTTPException(status_code=403, detail="Only store administrators can view staff splits")
    if not current_user.is_admin and current_user.store_admin_status != "approved":
        raise HTTPException(status_code=403, detail="Store admin approval required")

    appointment = crud_appointment.get_appointment(db, appointment_id=appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if not current_user.is_admin and appointment.store_id != current_user.store_id:
        raise HTTPException(status_code=403, detail="You can only access appointments from your own store")

    service = db.query(Service).filter(Service.id == appointment.service_id).first()
    order_amount = _resolve_appointment_order_amount(appointment, service)

    rows = (
        db.query(
            AppointmentStaffSplit,
            Technician.name.label("technician_name"),
            Service.name.label("split_service_name"),
        )
        .join(Technician, Technician.id == AppointmentStaffSplit.technician_id)
        .outerjoin(Service, Service.id == AppointmentStaffSplit.service_id)
        .filter(AppointmentStaffSplit.appointment_id == appointment.id)
        .order_by(AppointmentStaffSplit.id.asc())
        .all()
    )

    split_items = [
        AppointmentStaffSplitResponse(
            id=row.id,
            appointment_id=row.appointment_id,
            technician_id=row.technician_id,
            technician_name=technician_name,
            service_id=row.service_id or appointment.service_id,
            service_name=split_service_name or (service.name if service else None),
            amount=float(row.amount or 0),
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
        for row, technician_name, split_service_name in rows
    ]
    split_total = round(sum(item.amount for item in split_items), 2)
    return AppointmentStaffSplitSummary(
        order_amount=order_amount,
        split_total=split_total,
        is_balanced=abs(split_total - order_amount) < 0.01,
        splits=split_items,
    )


@router.put("/{appointment_id}/splits", response_model=AppointmentStaffSplitSummary)
def update_appointment_staff_splits(
    request: Request,
    appointment_id: int,
    payload: AppointmentStaffSplitUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_admin and not current_user.store_id:
        raise HTTPException(status_code=403, detail="Only store administrators can update staff splits")
    if not current_user.is_admin and current_user.store_admin_status != "approved":
        raise HTTPException(status_code=403, detail="Store admin approval required")

    appointment = crud_appointment.get_appointment(db, appointment_id=appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if not current_user.is_admin and appointment.store_id != current_user.store_id:
        raise HTTPException(status_code=403, detail="You can only update appointments from your own store")

    if appointment.status not in {
        AppointmentStatus.PENDING,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.COMPLETED,
    }:
        raise HTTPException(
            status_code=400,
            detail="Only pending, confirmed, or completed appointments can set staff splits",
        )

    service = db.query(Service).filter(Service.id == appointment.service_id).first()
    order_amount = _resolve_appointment_order_amount(appointment, service)
    if order_amount <= 0:
        raise HTTPException(status_code=400, detail="Order amount must be set before splitting")

    normalized_splits = []
    for item in payload.splits:
        tech = db.query(Technician).filter(Technician.id == item.technician_id).first()
        if not tech:
            raise HTTPException(status_code=404, detail=f"Technician {item.technician_id} not found")
        if tech.store_id != appointment.store_id:
            raise HTTPException(status_code=400, detail=f"Technician {tech.name} does not belong to this store")
        split_service = db.query(Service).filter(Service.id == item.service_id).first()
        if not split_service:
            raise HTTPException(status_code=404, detail=f"Service {item.service_id} not found")
        if split_service.store_id != appointment.store_id:
            raise HTTPException(status_code=400, detail=f"Service {split_service.name} does not belong to this store")
        normalized_splits.append(
            {
                "technician_id": item.technician_id,
                "service_id": item.service_id,
                "amount": round(float(item.amount), 2),
                "technician_name": tech.name,
                "service_name": split_service.name,
            }
        )

    split_total = round(sum(item["amount"] for item in normalized_splits), 2)
    if normalized_splits and abs(split_total - order_amount) >= 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Split total ({split_total:.2f}) must equal order amount ({order_amount:.2f})",
        )

    before_rows = (
        db.query(AppointmentStaffSplit)
        .filter(AppointmentStaffSplit.appointment_id == appointment.id)
        .order_by(AppointmentStaffSplit.id.asc())
        .all()
    )
    before_payload = [
        {
            "technician_id": row.technician_id,
            "service_id": row.service_id or appointment.service_id,
            "amount": float(row.amount or 0),
        }
        for row in before_rows
    ]

    db.query(AppointmentStaffSplit).filter(AppointmentStaffSplit.appointment_id == appointment.id).delete()
    db.flush()
    for item in normalized_splits:
        db.add(
            AppointmentStaffSplit(
                appointment_id=appointment.id,
                technician_id=item["technician_id"],
                service_id=item["service_id"],
                amount=item["amount"],
            )
        )
    if len(normalized_splits) == 1:
        appointment.technician_id = normalized_splits[0]["technician_id"]
    else:
        appointment.technician_id = None
    db.commit()

    log_service.create_audit_log(
        db,
        request=request,
        operator_user_id=current_user.id,
        module="appointments",
        action="appointment.staff_splits.update",
        message="更新订单技师金额拆分",
        target_type="appointment",
        target_id=str(appointment.id),
        store_id=appointment.store_id,
        before={"splits": before_payload},
        after={"splits": normalized_splits, "split_total": split_total, "order_amount": order_amount},
    )

    return get_appointment_staff_splits(
        appointment_id=appointment_id,
        current_user=current_user,
        db=db,
    )


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
        if updated_appointment.group_id:
            _recompute_group_host_status(db, updated_appointment.group_id)
            db.commit()
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
            appointment=AppointmentUpdate(
                status=AppointmentStatus.COMPLETED,
                completed_at=datetime.utcnow(),
            )
        )
        _mark_paid_if_completed(updated_appointment, service)
        if updated_appointment.group_id:
            _recompute_group_host_status(db, updated_appointment.group_id)
        db.commit()

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
        if cancelled_appointment.group_id:
            _recompute_group_host_status(db, cancelled_appointment.group_id)
            db.commit()
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
    if no_show_appointment.group_id:
        _recompute_group_host_status(db, no_show_appointment.group_id)
        db.commit()
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
        appointment=AppointmentUpdate(
            status=AppointmentStatus.COMPLETED,
            completed_at=datetime.utcnow(),
        )
    )
    _mark_paid_if_completed(updated_appointment, service)
    if updated_appointment.group_id:
        _recompute_group_host_status(db, updated_appointment.group_id)
    db.commit()

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
