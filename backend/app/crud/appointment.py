"""
Appointment CRUD operations
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.models.appointment import Appointment, AppointmentStatus
from app.models.store import Store
from app.models.service import Service
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
        Service.name.label('service_name'),
        Service.price.label('service_price'),
        Service.duration_minutes.label('service_duration')
    ).join(
        Store, Appointment.store_id == Store.id
    ).join(
        Service, Appointment.service_id == Service.id
    ).filter(
        Appointment.user_id == user_id
    ).order_by(
        Appointment.appointment_date.desc(),
        Appointment.appointment_time.desc()
    ).offset(skip).limit(limit).all()
    
    return appointments


def create_appointment(db: Session, appointment: AppointmentCreate, user_id: int) -> Appointment:
    """Create new appointment"""
    db_appointment = Appointment(
        **appointment.dict(),
        user_id=user_id
    )
    db.add(db_appointment)
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
    """Check if there's a conflicting appointment"""
    existing = db.query(Appointment).filter(
        Appointment.store_id == store_id,
        Appointment.appointment_date == appointment_date,
        Appointment.appointment_time == appointment_time,
        Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])
    ).first()
    
    return existing is not None
