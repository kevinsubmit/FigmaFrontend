"""
Promotion Models
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Enum, func
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum


class PromotionScope(str, enum.Enum):
    """Promotion scope enum"""
    PLATFORM = "platform"
    STORE = "store"


class PromotionDiscountType(str, enum.Enum):
    """Promotion discount type enum"""
    FIXED_AMOUNT = "fixed_amount"
    PERCENTAGE = "percentage"


class Promotion(Base):
    """Promotion model"""
    __tablename__ = "promotions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    scope = Column(Enum(PromotionScope), nullable=False, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    type = Column(String(50), nullable=False, index=True)
    image_url = Column(String(512), nullable=True)
    discount_type = Column(Enum(PromotionDiscountType), nullable=False)
    discount_value = Column(Float, nullable=False)
    rules = Column(String(500), nullable=True)
    start_at = Column(DateTime(timezone=True), nullable=False, index=True)
    end_at = Column(DateTime(timezone=True), nullable=False, index=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    store = relationship("Store", foreign_keys=[store_id])
    service_rules = relationship("PromotionService", back_populates="promotion", cascade="all, delete-orphan")


class PromotionService(Base):
    """Promotion service rule model"""
    __tablename__ = "promotion_services"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    promotion_id = Column(Integer, ForeignKey("promotions.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    min_price = Column(Float, nullable=True)
    max_price = Column(Float, nullable=True)

    promotion = relationship("Promotion", back_populates="service_rules")
    service = relationship("Service")
