"""
Appointment Schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, time
from app.models.appointment import AppointmentStatus


class AppointmentBase(BaseModel):
    """Appointment base schema"""
    store_id: int
    service_id: int
    technician_id: Optional[int] = None  # Optional: specific technician
    appointment_date: date
    appointment_time: time
    notes: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    """Appointment create schema"""
    pass


class AppointmentUpdate(BaseModel):
    """Appointment update schema"""
    appointment_date: Optional[date] = None
    appointment_time: Optional[time] = None
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None


class AppointmentComplete(BaseModel):
    """Appointment complete schema"""
    user_coupon_id: Optional[int] = None


class AppointmentStatusUpdate(BaseModel):
    """Appointment status update (admin)"""
    status: AppointmentStatus
    cancel_reason: Optional[str] = None
    user_coupon_id: Optional[int] = None


class Appointment(AppointmentBase):
    """Appointment response schema"""
    id: int
    order_number: Optional[str] = None
    user_id: int
    technician_id: Optional[int] = None
    status: AppointmentStatus
    cancel_reason: Optional[str] = None
    review_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AppointmentWithDetails(Appointment):
    """Appointment with store and service details"""
    store_name: Optional[str] = None
    service_name: Optional[str] = None
    service_price: Optional[float] = None
    service_duration: Optional[int] = None
    technician_name: Optional[str] = None

    class Config:
        from_attributes = True


class AppointmentCancel(BaseModel):
    """Appointment cancel schema"""
    cancel_reason: Optional[str] = None


class AppointmentReschedule(BaseModel):
    """Appointment reschedule schema"""
    new_date: date
    new_time: time


class AppointmentNotesUpdate(BaseModel):
    """Appointment notes update schema"""
    notes: str
