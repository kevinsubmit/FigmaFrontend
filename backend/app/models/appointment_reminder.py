"""
Appointment Reminder Model
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum, func
from app.db.session import Base
import enum


class ReminderType(str, enum.Enum):
    """Reminder type enum"""
    HOURS_24 = "24_hours"  # 24小时前提醒
    HOUR_1 = "1_hour"      # 1小时前提醒


class ReminderStatus(str, enum.Enum):
    """Reminder status enum"""
    PENDING = "pending"      # 待发送
    SENT = "sent"           # 已发送
    FAILED = "failed"       # 发送失败
    CANCELLED = "cancelled"  # 已取消（预约被取消）


class AppointmentReminder(Base):
    """Appointment reminder model"""
    __tablename__ = "appointment_reminders"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    reminder_type = Column(
        Enum('24_hours', '1_hour', name='reminder_type'),
        nullable=False,
        index=True
    )
    status = Column(
        Enum('pending', 'sent', 'failed', 'cancelled', name='reminder_status'),
        default='pending',
        nullable=False,
        index=True
    )
    scheduled_time = Column(DateTime(timezone=True), nullable=False, index=True)  # 计划发送时间
    sent_at = Column(DateTime(timezone=True))  # 实际发送时间
    error_message = Column(String(500))  # 错误信息（如果发送失败）
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
