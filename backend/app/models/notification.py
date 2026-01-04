"""
Notification Model
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum


class NotificationType(str, enum.Enum):
    """Notification type enum"""
    APPOINTMENT_CREATED = "appointment_created"
    APPOINTMENT_CONFIRMED = "appointment_confirmed"
    APPOINTMENT_CANCELLED = "appointment_cancelled"
    APPOINTMENT_COMPLETED = "appointment_completed"
    APPOINTMENT_REMINDER = "appointment_reminder"  # 24h reminder


class Notification(Base):
    """
    Notification model
    Stores in-app notifications for users
    """
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("backend_users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=True, index=True)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    appointment = relationship("Appointment", foreign_keys=[appointment_id])
    
    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, type={self.type}, is_read={self.is_read})>"
