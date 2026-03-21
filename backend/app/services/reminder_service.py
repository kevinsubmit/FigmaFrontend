"""
Appointment Reminder Service
Handles sending reminders to users about their upcoming appointments
"""
from datetime import datetime
from sqlalchemy.orm import Session
from typing import Dict, List, Tuple
import logging

from app.crud import appointment_reminder as reminder_crud
from app.core.config import settings
from app.models.appointment import Appointment
from app.models.appointment_reminder import AppointmentReminder
from app.models.notification import Notification, NotificationType
from app.models.service import Service
from app.models.store import Store
from app.models.user import User
from app.services.notification_service import enqueue_notification_push_batch

logger = logging.getLogger(__name__)


def _load_reminder_context(
    db: Session,
    reminders: List[AppointmentReminder],
) -> tuple[Dict[int, Appointment], Dict[int, User], Dict[int, Store], Dict[int, Service]]:
    appointment_ids = {int(reminder.appointment_id) for reminder in reminders}
    user_ids = {int(reminder.user_id) for reminder in reminders}

    appointments = (
        db.query(Appointment)
        .filter(Appointment.id.in_(appointment_ids))
        .all()
        if appointment_ids
        else []
    )
    appointments_by_id = {int(appointment.id): appointment for appointment in appointments}

    store_ids = {
        int(appointment.store_id)
        for appointment in appointments
        if appointment.store_id is not None
    }
    service_ids = {
        int(appointment.service_id)
        for appointment in appointments
        if appointment.service_id is not None
    }

    users_by_id = {
        int(user.id): user
        for user in (
            db.query(User).filter(User.id.in_(user_ids)).all()
            if user_ids
            else []
        )
    }
    stores_by_id = {
        int(store.id): store
        for store in (
            db.query(Store).filter(Store.id.in_(store_ids)).all()
            if store_ids
            else []
        )
    }
    services_by_id = {
        int(service.id): service
        for service in (
            db.query(Service).filter(Service.id.in_(service_ids)).all()
            if service_ids
            else []
        )
    }

    return appointments_by_id, users_by_id, stores_by_id, services_by_id


def _build_reminder_notification(
    reminder: AppointmentReminder,
    appointment: Appointment | None,
    user: User | None,
    store: Store | None,
    service: Service | None,
) -> Tuple[Notification | None, str | None]:
    if not appointment:
        return None, f"Appointment {reminder.appointment_id} not found"
    if not user:
        return None, f"User {reminder.user_id} not found"

    apt_time = appointment.appointment_time.strftime("%I:%M %p")

    if reminder.reminder_type == "24_hours":
        title = "Appointment Reminder - Tomorrow"
        message = f"Hi {user.username}! Your appointment at {store.name if store else 'the salon'} is tomorrow at {apt_time}."
    else:
        title = "Appointment Reminder - In 1 Hour"
        message = f"Hi {user.username}! Your appointment at {store.name if store else 'the salon'} is in 1 hour at {apt_time}."

    if service:
        message += f" Service: {service.name}."

    message += " See you soon!"
    return (
        Notification(
            user_id=reminder.user_id,
            type=NotificationType.APPOINTMENT_REMINDER,
            title=title,
            message=message,
            appointment_id=reminder.appointment_id,
        ),
        None,
    )


def _process_reminder_batch(
    db: Session,
    reminders: List[AppointmentReminder],
) -> dict:
    batch_stats = {
        "sent": 0,
        "failed": 0,
        "errors": [],
    }
    if not reminders:
        return batch_stats

    appointments_by_id, users_by_id, stores_by_id, services_by_id = _load_reminder_context(db, reminders)

    notifications_to_create: List[Notification] = []
    sent_reminder_ids: List[int] = []
    failed_errors: Dict[int, str] = {}

    for reminder in reminders:
        try:
            appointment = appointments_by_id.get(int(reminder.appointment_id))
            user = users_by_id.get(int(reminder.user_id))
            store = stores_by_id.get(int(appointment.store_id)) if appointment and appointment.store_id is not None else None
            service = services_by_id.get(int(appointment.service_id)) if appointment and appointment.service_id is not None else None

            notification, error_message = _build_reminder_notification(
                reminder,
                appointment,
                user,
                store,
                service,
            )
            if notification is None:
                failed_errors[int(reminder.id)] = error_message or "Failed to build reminder notification"
                batch_stats["failed"] += 1
                if error_message:
                    batch_stats["errors"].append(error_message)
                continue

            notifications_to_create.append(notification)
            sent_reminder_ids.append(int(reminder.id))
        except Exception as exc:
            error_message = f"Error processing reminder {reminder.id}: {exc}"
            logger.error(error_message)
            batch_stats["errors"].append(error_message)
            failed_errors[int(reminder.id)] = str(exc)
            batch_stats["failed"] += 1

    notification_ids: List[int] = []
    if notifications_to_create:
        try:
            db.add_all(notifications_to_create)
            db.flush()
            notification_ids = [int(notification.id) for notification in notifications_to_create if notification.id is not None]
        except Exception as exc:
            db.rollback()
            error_message = f"Failed to persist reminder notifications batch: {exc}"
            logger.error(error_message)
            batch_stats["errors"].append(error_message)
            failed_errors.update(
                {reminder_id: "Failed to create notification" for reminder_id in sent_reminder_ids}
            )
            batch_stats["failed"] += len(sent_reminder_ids)
            sent_reminder_ids = []

    try:
        reminder_crud.mark_reminders_as_sent(
            db,
            sent_reminder_ids,
            sent_at=datetime.now(),
            auto_commit=False,
        )
        reminder_crud.mark_reminders_as_failed(
            db,
            failed_errors,
            auto_commit=False,
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        error_message = f"Failed to finalize reminder batch status updates: {exc}"
        logger.error(error_message)
        raise RuntimeError(error_message) from exc
    else:
        batch_stats["sent"] += len(sent_reminder_ids)
        enqueue_notification_push_batch(notification_ids)

    return batch_stats


def process_pending_reminders(db: Session) -> dict:
    """
    Process all pending reminders that should be sent now
    Returns a dict with statistics
    """
    current_time = datetime.now()
    batch_size = max(1, int(settings.REMINDER_PROCESS_BATCH_SIZE))
    stats = {
        "total": 0,
        "sent": 0,
        "failed": 0,
        "errors": []
    }
    
    try:
        stats["total"] = reminder_crud.count_pending_reminders(db, current_time)
        
        logger.info(f"Processing {stats['total']} pending reminders in batches of {batch_size}")

        while True:
            pending_reminders = reminder_crud.get_pending_reminders(
                db,
                current_time,
                limit=batch_size,
            )
            if not pending_reminders:
                break

            batch_stats = _process_reminder_batch(db, pending_reminders)
            stats["sent"] += batch_stats["sent"]
            stats["failed"] += batch_stats["failed"]
            stats["errors"].extend(batch_stats["errors"])
        
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
