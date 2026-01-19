"""
Notification Service
Handles notification creation and management
"""
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.models.notification import Notification, NotificationType
from app.models.appointment import Appointment
from app.models.user import User
from app.models.store import Store


def create_notification(
    db: Session,
    user_id: int,
    notification_type: NotificationType,
    title: str,
    message: str,
    appointment_id: Optional[int] = None
) -> Notification:
    """Create a new notification"""
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        appointment_id=appointment_id
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def notify_appointment_created(db: Session, appointment: Appointment):
    """
    Notify store admin when a new appointment is created
    """
    # Refresh appointment to load relationships
    db.refresh(appointment)
    
    # Get store admin
    store_admin = db.query(User).filter(
        User.store_id == appointment.store_id,
        User.is_active == True
    ).first()
    
    if not store_admin:
        return  # No store admin found
    
    # Get appointment details
    from app.models.service import Service
    from app.models.user import User as UserModel
    service = db.query(Service).filter(Service.id == appointment.service_id).first()
    customer = db.query(UserModel).filter(UserModel.id == appointment.user_id).first()
    
    service_name = service.name if service else "Unknown Service"
    customer_name = customer.username if customer else "Unknown Customer"
    
    title = "New Appointment"
    message = f"{customer_name} has booked {service_name} on {appointment.appointment_date} at {appointment.appointment_time.strftime('%H:%M')}. Please confirm the appointment."
    
    create_notification(
        db=db,
        user_id=store_admin.id,
        notification_type=NotificationType.APPOINTMENT_CREATED,
        title=title,
        message=message,
        appointment_id=appointment.id
    )


def notify_appointment_confirmed(db: Session, appointment: Appointment):
    """
    Notify customer when their appointment is confirmed
    """
    # Get service and store details
    from app.models.service import Service
    service = db.query(Service).filter(Service.id == appointment.service_id).first()
    store = db.query(Store).filter(Store.id == appointment.store_id).first()
    
    service_name = service.name if service else "Unknown Service"
    store_name = store.name if store else "Unknown Store"
    
    title = "Appointment Confirmed"
    message = f"Your appointment for {service_name} at {store_name} on {appointment.appointment_date} at {appointment.appointment_time.strftime('%H:%M')} has been confirmed."
    
    create_notification(
        db=db,
        user_id=appointment.user_id,
        notification_type=NotificationType.APPOINTMENT_CONFIRMED,
        title=title,
        message=message,
        appointment_id=appointment.id
    )


def notify_appointment_cancelled(db: Session, appointment: Appointment, cancelled_by_admin: bool = False):
    """
    Notify relevant parties when an appointment is cancelled
    """
    # Get service and store details
    from app.models.service import Service
    service = db.query(Service).filter(Service.id == appointment.service_id).first()
    store = db.query(Store).filter(Store.id == appointment.store_id).first()
    
    service_name = service.name if service else "Unknown Service"
    store_name = store.name if store else "Unknown Store"
    
    if cancelled_by_admin:
        # Notify customer
        title = "Appointment Cancelled"
        message = f"Your appointment for {service_name} at {store_name} on {appointment.appointment_date} at {appointment.appointment_time.strftime('%H:%M')} has been cancelled by the store."
        
        create_notification(
            db=db,
            user_id=appointment.user_id,
            notification_type=NotificationType.APPOINTMENT_CANCELLED,
            title=title,
            message=message,
            appointment_id=appointment.id
        )
    else:
        # Notify store admin
        store_admin = db.query(User).filter(
            User.store_id == appointment.store_id,
            User.is_active == True
        ).first()
        
        if store_admin:
            customer = db.query(User).filter(User.id == appointment.user_id).first()
            customer_name = customer.username if customer else "Unknown Customer"
            title = "Appointment Cancelled"
            message = f"{customer_name}'s appointment for {service_name} on {appointment.appointment_date} at {appointment.appointment_time.strftime('%H:%M')} has been cancelled."
            
            create_notification(
                db=db,
                user_id=store_admin.id,
                notification_type=NotificationType.APPOINTMENT_CANCELLED,
                title=title,
                message=message,
                appointment_id=appointment.id
            )


def notify_appointment_completed(db: Session, appointment: Appointment):
    """
    Notify customer when their appointment is completed
    """
    # Get service and store details
    from app.models.service import Service
    service = db.query(Service).filter(Service.id == appointment.service_id).first()
    store = db.query(Store).filter(Store.id == appointment.store_id).first()
    
    service_name = service.name if service else "Unknown Service"
    store_name = store.name if store else "Unknown Store"
    
    title = "Appointment Completed"
    message = f"Your appointment for {service_name} at {store_name} has been completed. Thank you for choosing us!"
    
    create_notification(
        db=db,
        user_id=appointment.user_id,
        notification_type=NotificationType.APPOINTMENT_COMPLETED,
        title=title,
        message=message,
        appointment_id=appointment.id
    )


def notify_appointment_rescheduled(db: Session, appointment: Appointment):
    """
    Notify store admin when a customer reschedules an appointment
    """
    db.refresh(appointment)

    store_admin = db.query(User).filter(
        User.store_id == appointment.store_id,
        User.is_active == True
    ).first()

    if not store_admin:
        return

    from app.models.service import Service
    from app.models.user import User as UserModel

    service = db.query(Service).filter(Service.id == appointment.service_id).first()
    customer = db.query(UserModel).filter(UserModel.id == appointment.user_id).first()

    service_name = service.name if service else "Unknown Service"
    customer_name = customer.username if customer else "Unknown Customer"

    title = "Appointment Rescheduled"
    message = (
        f"{customer_name} rescheduled {service_name} to "
        f"{appointment.appointment_date} at {appointment.appointment_time.strftime('%H:%M')}."
    )

    create_notification(
        db=db,
        user_id=store_admin.id,
        notification_type=NotificationType.APPOINTMENT_CREATED,
        title=title,
        message=message,
        appointment_id=appointment.id
    )


def notify_appointment_reminder_24h(db: Session, appointment: Appointment):
    """
    Send 24-hour reminder notification for upcoming appointment
    """
    # Get service and store details
    from app.models.service import Service
    service = db.query(Service).filter(Service.id == appointment.service_id).first()
    store = db.query(Store).filter(Store.id == appointment.store_id).first()
    
    service_name = service.name if service else "Unknown Service"
    store_name = store.name if store else "Unknown Store"
    
    title = "Appointment Reminder - Tomorrow"
    message = (
        f"Reminder: You have an appointment tomorrow "
        f"({appointment.appointment_date.strftime('%B %d, %Y')}) at "
        f"{appointment.appointment_time.strftime('%I:%M %p')} "
        f"for {service_name} at {store_name}. We look forward to seeing you!"
    )
    
    create_notification(
        db=db,
        user_id=appointment.user_id,
        notification_type=NotificationType.APPOINTMENT_REMINDER,
        title=title,
        message=message,
        appointment_id=appointment.id
    )


def notify_appointment_reminder_1h(db: Session, appointment: Appointment):
    """
    Send 1-hour reminder notification for upcoming appointment
    """
    # Get service and store details
    from app.models.service import Service
    service = db.query(Service).filter(Service.id == appointment.service_id).first()
    store = db.query(Store).filter(Store.id == appointment.store_id).first()
    
    service_name = service.name if service else "Unknown Service"
    store_name = store.name if store else "Unknown Store"
    
    title = "Appointment Reminder - In 1 Hour"
    message = (
        f"Your appointment for {service_name} at {store_name} "
        f"is in 1 hour at {appointment.appointment_time.strftime('%I:%M %p')}. "
        f"Please arrive on time. See you soon!"
    )
    
    create_notification(
        db=db,
        user_id=appointment.user_id,
        notification_type=NotificationType.APPOINTMENT_REMINDER,
        title=title,
        message=message,
        appointment_id=appointment.id
    )
