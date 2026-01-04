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


class Appointment(AppointmentBase):
    """Appointment response schema"""
    id: int
    user_id: int
    status: AppointmentStatus
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

    class Config:
        from_attributes = True
