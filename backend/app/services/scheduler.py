"""
Background Task Scheduler
Runs periodic tasks like sending appointment reminders
"""
import asyncio
import logging
from datetime import datetime
from app.db.session import SessionLocal
from app.services.reminder_service import process_pending_reminders
from app.services.notification_service import notify_gift_card_expiring
from app.crud import gift_card as gift_card_crud

logger = logging.getLogger(__name__)


class ReminderScheduler:
    """Scheduler for appointment reminders"""
    
    def __init__(self, interval_minutes: int = 5):
        """
        Initialize scheduler
        
        Args:
            interval_minutes: How often to check for pending reminders (default: 5 minutes)
        """
        self.interval_minutes = interval_minutes
        self.running = False
        self.task = None
    
    async def run(self):
        """Run the scheduler loop"""
        self.running = True
        logger.info(f"Reminder scheduler started (checking every {self.interval_minutes} minutes)")
        
        while self.running:
            try:
                # Process reminders
                db = SessionLocal()
                try:
                    logger.info(f"Checking for pending reminders at {datetime.now()}")
                    stats = process_pending_reminders(db)
                    logger.info(f"Reminder check complete: {stats}")
                    expired_count = gift_card_crud.expire_pending_transfers(db)
                    if expired_count:
                        logger.info(f"Gift card transfers expired: {expired_count}")

                    expiring_cards = gift_card_crud.get_pending_transfers_expiring_soon(db, within_hours=48)
                    for card in expiring_cards:
                        notify_gift_card_expiring(
                            db=db,
                            purchaser_id=card.purchaser_id,
                            recipient_phone=card.recipient_phone,
                            expires_at=card.claim_expires_at
                        )
                        gift_card_crud.mark_transfer_expiry_notified(db, card)
                    if expiring_cards:
                        db.commit()
                finally:
                    db.close()
                
                # Wait for next interval
                await asyncio.sleep(self.interval_minutes * 60)
                
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")
                # Wait a bit before retrying
                await asyncio.sleep(60)
    
    def start(self):
        """Start the scheduler in the background"""
        if not self.running:
            self.task = asyncio.create_task(self.run())
            logger.info("Reminder scheduler task created")
    
    async def stop(self):
        """Stop the scheduler"""
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
            logger.info("Reminder scheduler stopped")


# Global scheduler instance
reminder_scheduler = ReminderScheduler(interval_minutes=5)
