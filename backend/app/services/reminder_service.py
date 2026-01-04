"""
Appointment Reminder Service
Handles sending reminders to users about their upcoming appointments
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import List
import logging

from app.crud import appointment_reminder as reminder_crud
from app.crud import appointment as appointment_crud
from app.crud import user as user_crud
from app.crud import store as store_crud
from app.crud import service as service_crud
from app.models.appointment_reminder import AppointmentReminder
from app.crud.notification import create_notification
from app.models.notification import NotificationType

logger = logging.getLogger(__name__)


def send_reminder_notification(
    db: Session,
    reminder: AppointmentReminder
) -> bool:
    """
    Send a reminder notification to the user
    Returns True if successful, False otherwise
    """
    try:
        # Get appointment details
        appointment = appointment_crud.get_appointment(db, reminder.appointment_id)
        if not appointment:
            logger.error(f"Appointment {reminder.appointment_id} not found")
            return False
        
        # Get user
        user = user_crud.get(db, reminder.user_id)
        if not user:
            logger.error(f"User {reminder.user_id} not found")
            return False
        
        # Get store and service details
        store = store_crud.get_store(db, appointment.store_id)
        service = service_crud.get_service(db, appointment.service_id)
        
        # Format appointment time
        apt_date = appointment.appointment_date.strftime("%B %d, %Y")
        apt_time = appointment.appointment_time.strftime("%I:%M %p")
        
        # Determine reminder message based on type
        if reminder.reminder_type == "24_hours":
            title = "Appointment Reminder - Tomorrow"
            message = f"Hi {user.username}! Your appointment at {store.name if store else 'the salon'} is tomorrow at {apt_time}."
        else:  # 1_hour
            title = "Appointment Reminder - In 1 Hour"
            message = f"Hi {user.username}! Your appointment at {store.name if store else 'the salon'} is in 1 hour at {apt_time}."
        
        if service:
            message += f" Service: {service.name}."
        
        message += " See you soon!"
        
        # Create notification
        notification = create_notification(
            db=db,
            user_id=reminder.user_id,
            notification_type=NotificationType.APPOINTMENT_REMINDER.value,
            title=title,
            message=message,
            related_id=reminder.appointment_id
        )
        
        if notification:
            logger.info(f"Reminder notification sent for appointment {reminder.appointment_id}")
            return True
        else:
            logger.error(f"Failed to create notification for reminder {reminder.id}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending reminder notification: {e}")
        return False


def process_pending_reminders(db: Session) -> dict:
    """
    Process all pending reminders that should be sent now
    Returns a dict with statistics
    """
    current_time = datetime.now()
    stats = {
        "total": 0,
        "sent": 0,
        "failed": 0,
        "errors": []
    }
    
    try:
        # Get all pending reminders that should be sent
        pending_reminders = reminder_crud.get_pending_reminders(db, current_time)
        stats["total"] = len(pending_reminders)
        
        logger.info(f"Processing {stats['total']} pending reminders")
        
        for reminder in pending_reminders:
            try:
                # Send the reminder
                success = send_reminder_notification(db, reminder)
                
                if success:
                    # Mark as sent
                    reminder_crud.mark_reminder_as_sent(db, reminder.id)
                    stats["sent"] += 1
                else:
                    # Mark as failed
                    reminder_crud.mark_reminder_as_failed(
                        db,
                        reminder.id,
                        "Failed to send notification"
                    )
                    stats["failed"] += 1
                    
            except Exception as e:
                error_msg = f"Error processing reminder {reminder.id}: {str(e)}"
                logger.error(error_msg)
                stats["errors"].append(error_msg)
                stats["failed"] += 1
                
                # Mark as failed
                reminder_crud.mark_reminder_as_failed(db, reminder.id, str(e))
        
        logger.info(f"Reminder processing complete: {stats['sent']} sent, {stats['failed']} failed")
        
    except Exception as e:
        error_msg = f"Error in process_pending_reminders: {str(e)}"
        logger.error(error_msg)
        stats["errors"].append(error_msg)
    
    return stats


def create_reminders_on_appointment_creation(
    db: Session,
    appointment_id: int,
    user_id: int,
    appointment_date: datetime,
    appointment_time: datetime
) -> List[AppointmentReminder]:
    """
    Create reminders when a new appointment is created
    """
    # Combine date and time
    appointment_datetime = datetime.combine(
        appointment_date,
        appointment_time.time() if hasattr(appointment_time, 'time') else appointment_time
    )
    
    # Only create reminders if appointment is in the future
    if appointment_datetime > datetime.now():
        return reminder_crud.create_reminders_for_appointment(
            db,
            appointment_id,
            user_id,
            appointment_datetime
        )
    
    return []


def handle_appointment_cancellation(
    db: Session,
    appointment_id: int
) -> int:
    """
    Cancel all reminders when an appointment is cancelled
    Returns the number of reminders cancelled
    """
    return reminder_crud.cancel_reminders_for_appointment(db, appointment_id)


def handle_appointment_reschedule(
    db: Session,
    appointment_id: int,
    user_id: int,
    new_appointment_date: datetime,
    new_appointment_time: datetime
) -> List[AppointmentReminder]:
    """
    Update reminders when an appointment is rescheduled
    """
    # Combine date and time
    new_appointment_datetime = datetime.combine(
        new_appointment_date,
        new_appointment_time.time() if hasattr(new_appointment_time, 'time') else new_appointment_time
    )
    
    # Only create reminders if appointment is in the future
    if new_appointment_datetime > datetime.now():
        return reminder_crud.update_reminders_for_rescheduled_appointment(
            db,
            appointment_id,
            user_id,
            new_appointment_datetime
        )
    
    return []
