"""
Notification Service
Handles notification creation and management
"""
from queue import Empty, Full, Queue
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import logging
from threading import Event, Lock, Thread

from app.core.config import settings
from app.crud.notification import invalidate_unread_count_cache
from app.db.session import SessionLocal
from app.models.notification import Notification, NotificationType
from app.models.appointment import Appointment
from app.models.user import User
from app.models.store import Store
from app.services import push_service

logger = logging.getLogger(__name__)
_ASYNC_PUSH_POLL_SECONDS = 0.2


class _AsyncPushDispatcher:
    def __init__(self, maxsize: int):
        self._queue: Queue[int] = Queue(maxsize=maxsize)
        self._stop_event = Event()
        self._lock = Lock()
        self._thread: Optional[Thread] = None

    def start(self) -> None:
        with self._lock:
            if self._thread and self._thread.is_alive():
                return
            self._stop_event.clear()
            self._thread = Thread(
                target=self._run,
                name="push-dispatcher",
                daemon=True,
            )
            self._thread.start()

    def stop(self, timeout_seconds: float = 5.0) -> None:
        with self._lock:
            thread = self._thread
            self._stop_event.set()
        if thread and thread.is_alive():
            thread.join(timeout=timeout_seconds)

    def enqueue(self, notification_id: int) -> bool:
        self.start()
        try:
            self._queue.put_nowait(int(notification_id))
            return True
        except Full:
            logger.warning(
                "Async push queue is full; dropping push delivery for notification_id=%s",
                notification_id,
            )
            return False

    def _run(self) -> None:
        while not self._stop_event.is_set() or not self._queue.empty():
            try:
                notification_id = self._queue.get(timeout=_ASYNC_PUSH_POLL_SECONDS)
            except Empty:
                continue

            db = SessionLocal()
            try:
                notification = (
                    db.query(Notification)
                    .filter(Notification.id == int(notification_id))
                    .first()
                )
                if not notification:
                    logger.warning(
                        "Async push skipped because notification_id=%s was not found",
                        notification_id,
                    )
                else:
                    push_service.send_push_for_notification(db, notification)
            except Exception as exc:
                logger.warning(
                    "Async push delivery skipped for notification_id=%s (%s)",
                    notification_id,
                    exc,
                    exc_info=True,
                )
            finally:
                db.close()
                self._queue.task_done()


_ASYNC_PUSH_DISPATCHER = _AsyncPushDispatcher(
    maxsize=max(100, int(settings.ASYNC_PUSH_QUEUE_SIZE)),
)


def start_async_push_dispatcher() -> None:
    _ASYNC_PUSH_DISPATCHER.start()


def shutdown_async_push_dispatcher(timeout_seconds: float = 5.0) -> None:
    _ASYNC_PUSH_DISPATCHER.stop(timeout_seconds=timeout_seconds)
    push_service.close_http_client()


def enqueue_notification_push(notification_id: int) -> bool:
    return _ASYNC_PUSH_DISPATCHER.enqueue(int(notification_id))


def enqueue_notification_push_batch(notification_ids: list[int]) -> None:
    for notification_id in notification_ids:
        _ASYNC_PUSH_DISPATCHER.enqueue(int(notification_id))


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
    invalidate_unread_count_cache(user_id)
    enqueue_notification_push(int(notification.id))
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


def notify_coupon_granted(db: Session, user_id: int, coupon_name: str, discount_text: str, expires_at: Optional[datetime]):
    """
    Notify user when a coupon is granted
    """
    title = "New Coupon Received"
    message = f"You received {coupon_name} ({discount_text})."
    if expires_at:
        message += f" Expires on {expires_at.strftime('%b %d, %Y')}."

    create_notification(
        db=db,
        user_id=user_id,
        notification_type=NotificationType.COUPON_GRANTED,
        title=title,
        message=message
    )


def notify_points_earned(db: Session, appointment: Appointment, points: int):
    """
    Notify user when points are earned
    """
    from app.models.service import Service
    from app.models.store import Store

    service = db.query(Service).filter(Service.id == appointment.service_id).first()
    store = db.query(Store).filter(Store.id == appointment.store_id).first()

    service_name = service.name if service else "your service"
    store_name = store.name if store else "the salon"

    title = "Points Earned"
    message = f"You earned {points} points for {service_name} at {store_name}."

    create_notification(
        db=db,
        user_id=appointment.user_id,
        notification_type=NotificationType.POINTS_EARNED,
        title=title,
        message=message,
        appointment_id=appointment.id
    )


def notify_gift_card_sent(db: Session, purchaser_id: int, amount: float, recipient_phone: Optional[str], expires_at: Optional[datetime]):
    """
    Notify purchaser when a gift card is sent
    """
    title = "Gift Card Sent"
    recipient_text = recipient_phone or "the recipient"
    message = f"You sent a gift card for ${amount:.2f} to {recipient_text}."
    if expires_at:
        message += f" Claim expires on {expires_at.strftime('%b %d, %Y')}."

    create_notification(
        db=db,
        user_id=purchaser_id,
        notification_type=NotificationType.GIFT_CARD_SENT,
        title=title,
        message=message
    )


def notify_gift_card_received(db: Session, recipient_id: int, amount: float, expires_at: Optional[datetime]):
    """
    Notify recipient when a gift card is sent to them
    """
    title = "Gift Card Received"
    message = f"You received a gift card for ${amount:.2f}."
    if expires_at:
        message += f" Claim by {expires_at.strftime('%b %d, %Y')}."

    create_notification(
        db=db,
        user_id=recipient_id,
        notification_type=NotificationType.GIFT_CARD_RECEIVED,
        title=title,
        message=message
    )


def notify_gift_card_claimed(db: Session, purchaser_id: int, recipient_name: str, amount: float):
    """
    Notify purchaser when a gift card is claimed
    """
    title = "Gift Card Claimed"
    message = f"{recipient_name} claimed your gift card for ${amount:.2f}."

    create_notification(
        db=db,
        user_id=purchaser_id,
        notification_type=NotificationType.GIFT_CARD_CLAIMED,
        title=title,
        message=message
    )


def notify_gift_card_expiring(db: Session, purchaser_id: int, recipient_phone: Optional[str], expires_at: Optional[datetime]):
    """
    Notify purchaser when a gift card transfer is expiring soon
    """
    title = "Gift Card Expiring Soon"
    recipient_text = recipient_phone or "the recipient"
    if expires_at:
        message = f"The gift card sent to {recipient_text} will expire on {expires_at.strftime('%b %d, %Y')}."
    else:
        message = f"The gift card sent to {recipient_text} is expiring soon."

    create_notification(
        db=db,
        user_id=purchaser_id,
        notification_type=NotificationType.GIFT_CARD_EXPIRING,
        title=title,
        message=message
    )
