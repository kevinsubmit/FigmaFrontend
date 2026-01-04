from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("backend_users.id", ondelete="CASCADE"), nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, unique=True)
    rating = Column(Float, nullable=False)  # 1-5 stars
    comment = Column(Text, nullable=True)
    images = Column(JSON, nullable=True)  # 评价图片列表 (JSON数组，存储图片URL)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="reviews")
    store = relationship("Store", back_populates="reviews")
    appointment = relationship("Appointment", back_populates="review")
    reply = relationship("ReviewReply", back_populates="review", uselist=False, cascade="all, delete-orphan")
