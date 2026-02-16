"""
Coupon service helpers
"""
import logging
from datetime import datetime
from app.core.config import settings

logger = logging.getLogger(__name__)


def send_coupon_claim_sms(phone: str, coupon_name: str, expires_at: datetime) -> bool:
    if not phone:
        return False
    expires_text = expires_at.date().isoformat() if expires_at else "soon"
    message = (
        f"NailsDash coupon waiting for you: {coupon_name}. "
        f"Register/login with this phone number to claim it. "
        f"Claim by {expires_text}."
    )
    if settings.DEBUG:
        logger.info(f"[DEV SMS] To {phone}: {message}")
        return True
    logger.info(f"SMS to {phone}: {message}")
    return True
