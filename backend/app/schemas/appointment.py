"""
Appointment Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
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


class AppointmentAmountUpdate(BaseModel):
    """Appointment amount update (admin)"""
    order_amount: float = Field(..., ge=1)


class AppointmentTechnicianUpdate(BaseModel):
    """Appointment technician binding update (admin)"""
    technician_id: Optional[int] = None


class AppointmentStaffSplitItem(BaseModel):
    """Single staff split line"""
    technician_id: int
    service_id: int
    amount: float = Field(..., gt=0)


class AppointmentStaffSplitUpdate(BaseModel):
    """Staff split batch update"""
    splits: List[AppointmentStaffSplitItem]


class AppointmentStaffSplitResponse(AppointmentStaffSplitItem):
    """Staff split response line"""
    id: int
    appointment_id: int
    technician_name: Optional[str] = None
    service_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AppointmentStaffSplitSummary(BaseModel):
    """Staff split summary"""
    order_amount: float
    split_total: float
    is_balanced: bool
    splits: List[AppointmentStaffSplitResponse]


class Appointment(AppointmentBase):
    """Appointment response schema"""
    id: int
    order_number: Optional[str] = None
    user_id: int
    technician_id: Optional[int] = None
    status: AppointmentStatus
    order_amount: Optional[float] = None
    cancel_reason: Optional[str] = None
    review_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AppointmentWithDetails(Appointment):
    """Appointment with store and service details"""
    store_name: Optional[str] = None
    store_address: Optional[str] = None
    service_name: Optional[str] = None
    service_price: Optional[float] = None
    service_duration: Optional[int] = None
    technician_name: Optional[str] = None
    user_name: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None

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
