"""
Appointment Reminder CRUD operations
"""
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
from app.models.appointment_reminder import AppointmentReminder, ReminderType, ReminderStatus


def create_reminders_for_appointment(
    db: Session,
    appointment_id: int,
    user_id: int,
    appointment_datetime: datetime
) -> List[AppointmentReminder]:
    """
    Create reminder records for an appointment
    Creates two reminders: 24 hours before and 1 hour before
    """
    reminders = []
    
    # 24小时前提醒
    reminder_24h = AppointmentReminder(
        appointment_id=appointment_id,
        user_id=user_id,
        reminder_type=ReminderType.HOURS_24,
        status=ReminderStatus.PENDING,
        scheduled_time=appointment_datetime - timedelta(hours=24)
    )
    db.add(reminder_24h)
    reminders.append(reminder_24h)
    
    # 1小时前提醒
    reminder_1h = AppointmentReminder(
        appointment_id=appointment_id,
        user_id=user_id,
        reminder_type=ReminderType.HOUR_1,
        status=ReminderStatus.PENDING,
        scheduled_time=appointment_datetime - timedelta(hours=1)
    )
    db.add(reminder_1h)
    reminders.append(reminder_1h)
    
    db.commit()
    for reminder in reminders:
        db.refresh(reminder)
    
    return reminders


def get_pending_reminders(
    db: Session,
    current_time: datetime
) -> List[AppointmentReminder]:
    """
    Get all pending reminders that should be sent now
    """
    return db.query(AppointmentReminder).filter(
        AppointmentReminder.status == ReminderStatus.PENDING,
        AppointmentReminder.scheduled_time <= current_time
    ).all()


def mark_reminder_as_sent(
    db: Session,
    reminder_id: int
) -> Optional[AppointmentReminder]:
    """
    Mark a reminder as sent
    """
    reminder = db.query(AppointmentReminder).filter(
        AppointmentReminder.id == reminder_id
    ).first()
    
    if reminder:
        reminder.status = ReminderStatus.SENT
        reminder.sent_at = datetime.now()
        db.commit()
        db.refresh(reminder)
    
    return reminder


def mark_reminder_as_failed(
    db: Session,
    reminder_id: int,
    error_message: str
) -> Optional[AppointmentReminder]:
    """
    Mark a reminder as failed with error message
    """
    reminder = db.query(AppointmentReminder).filter(
        AppointmentReminder.id == reminder_id
    ).first()
    
    if reminder:
        reminder.status = ReminderStatus.FAILED
        reminder.error_message = error_message
        db.commit()
        db.refresh(reminder)
    
    return reminder


def cancel_reminders_for_appointment(
    db: Session,
    appointment_id: int
) -> int:
    """
    Cancel all pending reminders for an appointment
    Returns the number of reminders cancelled
    """
    result = db.query(AppointmentReminder).filter(
        AppointmentReminder.appointment_id == appointment_id,
        AppointmentReminder.status == ReminderStatus.PENDING
    ).update({
        "status": ReminderStatus.CANCELLED
    })
    
    db.commit()
    return result


def get_reminders_by_appointment(
    db: Session,
    appointment_id: int
) -> List[AppointmentReminder]:
    """
    Get all reminders for an appointment
    """
    return db.query(AppointmentReminder).filter(
        AppointmentReminder.appointment_id == appointment_id
    ).all()


def update_reminders_for_rescheduled_appointment(
    db: Session,
    appointment_id: int,
    user_id: int,
    new_appointment_datetime: datetime
) -> List[AppointmentReminder]:
    """
    Update reminders when appointment is rescheduled
    Cancels old reminders and creates new ones
    """
    # Cancel existing pending reminders
    cancel_reminders_for_appointment(db, appointment_id)
    
    # Create new reminders with new datetime
    return create_reminders_for_appointment(
        db,
        appointment_id,
        user_id,
        new_appointment_datetime
    )
