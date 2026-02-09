"""
Appointment CRUD operations
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, time, datetime, timedelta
from app.models.appointment import Appointment, AppointmentStatus
from app.models.store import Store
from app.models.service import Service
from app.models.review import Review
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate


def get_appointment(db: Session, appointment_id: int) -> Optional[Appointment]:
    """Get appointment by ID"""
    return db.query(Appointment).filter(Appointment.id == appointment_id).first()


def get_user_appointments(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    status: Optional[AppointmentStatus] = None
) -> List[Appointment]:
    """Get user's appointments"""
    query = db.query(Appointment).filter(Appointment.user_id == user_id)
    
    if status:
        query = query.filter(Appointment.status == status)
    
    return query.order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc()).offset(skip).limit(limit).all()


def get_user_appointments_with_details(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    """Get user's appointments with store and service details"""
    appointments = db.query(
        Appointment,
        Store.name.label('store_name'),
        Store.address.label('store_address'),
        Service.name.label('service_name'),
        Service.price.label('service_price'),
        Service.duration_minutes.label('service_duration'),
        Review.id.label('review_id')
    ).join(
        Store, Appointment.store_id == Store.id
    ).join(
        Service, Appointment.service_id == Service.id
    ).outerjoin(
        Review, Review.appointment_id == Appointment.id
    ).filter(
        Appointment.user_id == user_id
    ).order_by(
        Appointment.appointment_date.desc(),
        Appointment.appointment_time.desc()
    ).offset(skip).limit(limit).all()
    
    return appointments


def get_appointments_with_details(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    store_id: Optional[int] = None,
    status: Optional[AppointmentStatus] = None
):
    """Get appointments with store and service details (admin)"""
    appointments = db.query(
        Appointment,
        Store.name.label('store_name'),
        Store.address.label('store_address'),
        Service.name.label('service_name'),
        Service.price.label('service_price'),
        Service.duration_minutes.label('service_duration'),
        Review.id.label('review_id')
    ).join(
        Store, Appointment.store_id == Store.id
    ).join(
        Service, Appointment.service_id == Service.id
    ).outerjoin(
        Review, Review.appointment_id == Appointment.id
    )

    if store_id is not None:
        appointments = appointments.filter(Appointment.store_id == store_id)

    if status is not None:
        appointments = appointments.filter(Appointment.status == status)

    return appointments.order_by(
        Appointment.appointment_date.desc(),
        Appointment.appointment_time.desc()
    ).offset(skip).limit(limit).all()


def create_appointment(db: Session, appointment: AppointmentCreate, user_id: int) -> Appointment:
    """Create new appointment"""
    db_appointment = Appointment(
        **appointment.dict(),
        user_id=user_id
    )
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    if not db_appointment.order_number:
        date_part = datetime.utcnow().strftime("%y%m%d")
        db_appointment.order_number = f"ORD{date_part}{db_appointment.id:06d}"
        db.commit()
        db.refresh(db_appointment)
    return db_appointment


def update_appointment(
    db: Session,
    appointment_id: int,
    appointment: AppointmentUpdate
) -> Optional[Appointment]:
    """Update appointment"""
    db_appointment = get_appointment(db, appointment_id)
    if not db_appointment:
        return None
    
    update_data = appointment.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_appointment, field, value)
    
    db.commit()
    db.refresh(db_appointment)
    return db_appointment


def cancel_appointment(db: Session, appointment_id: int) -> Optional[Appointment]:
    """Cancel appointment"""
    db_appointment = get_appointment(db, appointment_id)
    if not db_appointment:
        return None
    
    db_appointment.status = AppointmentStatus.CANCELLED
    db.commit()
    db.refresh(db_appointment)
    return db_appointment


def check_appointment_conflict(
    db: Session,
    store_id: int,
    appointment_date: date,
    appointment_time: str
) -> bool:
    """Check if there's a conflicting appointment (deprecated - use check_time_conflict instead)"""
    existing = db.query(Appointment).filter(
        Appointment.store_id == store_id,
        Appointment.appointment_date == appointment_date,
        Appointment.appointment_time == appointment_time,
        Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])
    ).first()
    
    return existing is not None


def check_time_conflict(
    db: Session,
    appointment_date: date,
    appointment_time: time,
    service_id: int,
    technician_id: Optional[int] = None,
    user_id: Optional[int] = None,
    exclude_appointment_id: Optional[int] = None
) -> dict:
    """
    Check for time conflicts considering service duration
    Returns: {"has_conflict": bool, "conflict_type": str, "message": str}
    """
    from app.models.service import Service
    
    # Get service duration
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        return {"has_conflict": True, "conflict_type": "invalid_service", "message": "Service not found"}
    
    duration_minutes = service.duration_minutes
    
    # Convert appointment_time to datetime for calculation
    appt_datetime = datetime.combine(appointment_date, appointment_time)
    appt_end_time = appt_datetime + timedelta(minutes=duration_minutes)
    
    # Build base query for active appointments on the same date
    query = db.query(Appointment, Service).join(
        Service, Appointment.service_id == Service.id
    ).filter(
        Appointment.appointment_date == appointment_date,
        Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])
    )
    
    # Exclude current appointment if updating
    if exclude_appointment_id:
        query = query.filter(Appointment.id != exclude_appointment_id)
    
    # Check technician conflict
    if technician_id:
        technician_appointments = query.filter(Appointment.technician_id == technician_id).all()
        
        for appt, svc in technician_appointments:
            existing_datetime = datetime.combine(appointment_date, appt.appointment_time)
            existing_end_time = existing_datetime + timedelta(minutes=svc.duration_minutes)
            
            # Check if time ranges overlap
            if (appt_datetime < existing_end_time and appt_end_time > existing_datetime):
                return {
                    "has_conflict": True,
                    "conflict_type": "technician",
                    "message": (
                        f"The technician is already booked from {existing_datetime.strftime('%H:%M')} "
                        f"to {existing_end_time.strftime('%H:%M')}. Please choose a time after "
                        f"{existing_end_time.strftime('%H:%M')} or pick another technician."
                    )
                }
    
    # Check user conflict
    if user_id:
        user_appointments = query.filter(Appointment.user_id == user_id).all()
        
        for appt, svc in user_appointments:
            existing_datetime = datetime.combine(appointment_date, appt.appointment_time)
            existing_end_time = existing_datetime + timedelta(minutes=svc.duration_minutes)
            
            # Check if time ranges overlap
            if (appt_datetime < existing_end_time and appt_end_time > existing_datetime):
                return {
                    "has_conflict": True,
                    "conflict_type": "user",
                    "message": (
                        f"You already have an appointment from {existing_datetime.strftime('%H:%M')} "
                        f"to {existing_end_time.strftime('%H:%M')}. Please choose a time after "
                        f"{existing_end_time.strftime('%H:%M')}."
                    )
                }
    
    return {"has_conflict": False, "conflict_type": None, "message": "No conflict"}



def cancel_appointment_with_reason(
    db: Session,
    appointment_id: int,
    cancel_reason: Optional[str] = None,
    cancelled_by: Optional[int] = None
) -> Optional[Appointment]:
    """Cancel appointment with reason"""
    db_appointment = get_appointment(db, appointment_id)
    if not db_appointment:
        return None
    
    db_appointment.status = AppointmentStatus.CANCELLED
    db_appointment.cancel_reason = cancel_reason
    db_appointment.cancelled_at = datetime.now()
    db_appointment.cancelled_by = cancelled_by
    
    db.commit()
    db.refresh(db_appointment)
    return db_appointment


def reschedule_appointment(
    db: Session,
    appointment_id: int,
    new_date: date,
    new_time: time
) -> Optional[Appointment]:
    """Reschedule appointment to a new date/time"""
    db_appointment = get_appointment(db, appointment_id)
    if not db_appointment:
        return None
    
    # Save original date/time if this is the first reschedule
    if db_appointment.reschedule_count == 0:
        db_appointment.original_date = db_appointment.appointment_date
        db_appointment.original_time = db_appointment.appointment_time
    
    # Update to new date/time
    db_appointment.appointment_date = new_date
    db_appointment.appointment_time = new_time
    db_appointment.reschedule_count += 1
    
    # Reset status to pending (needs confirmation again)
    db_appointment.status = AppointmentStatus.PENDING
    
    db.commit()
    db.refresh(db_appointment)
    return db_appointment
