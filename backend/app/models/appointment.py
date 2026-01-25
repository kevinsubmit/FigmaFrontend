"""
Appointment Model
"""
from sqlalchemy import Column, Integer, String, Date, Time, Text, DateTime, func, Enum
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum


class AppointmentStatus(str, enum.Enum):
    """Appointment status enum"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Appointment(Base):
    """Appointment model"""
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(32), unique=True, nullable=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    store_id = Column(Integer, nullable=False, index=True)
    service_id = Column(Integer, nullable=False, index=True)
    technician_id = Column(Integer, nullable=True, index=True)  # Optional: specific technician
    appointment_date = Column(Date, nullable=False, index=True)
    appointment_time = Column(Time, nullable=False)
    status = Column(
        Enum('pending', 'confirmed', 'completed', 'cancelled', name='appointment_status'),
        default='pending',
        nullable=False,
        index=True
    )
    notes = Column(Text)  # 用户备注
    cancel_reason = Column(Text)  # 取消原因
    cancelled_at = Column(DateTime(timezone=True))  # 取消时间
    cancelled_by = Column(Integer)  # 取消人ID（用户或管理员）
    original_date = Column(Date)  # 原始预约日期（用于改期记录）
    original_time = Column(Time)  # 原始预约时间（用于改期记录）
    reschedule_count = Column(Integer, default=0)  # 改期次数
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    review = relationship("Review", back_populates="appointment", uselist=False, cascade="all, delete-orphan")
