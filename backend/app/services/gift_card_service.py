"""
Gift card service helpers
"""
import logging
from datetime import datetime
from app.core.config import settings

logger = logging.getLogger(__name__)


def send_gift_card_sms(phone: str, claim_code: str, amount: float, expires_at: datetime) -> bool:
    if not phone or not claim_code:
        return False
    message = (
        f"NailsDash gift card: ${amount:.2f}. "
        f"Claim code: {claim_code}. "
        f"Claim by {expires_at.date().isoformat()}."
    )
    if settings.DEBUG:
        logger.info(f"[DEV SMS] To {phone}: {message}")
        return True
    logger.info(f"SMS to {phone}: {message}")
    return True
