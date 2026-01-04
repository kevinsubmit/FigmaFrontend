"""
Store Model
"""
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, func
from app.db.session import Base


class Store(Base):
    """Store model"""
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False, index=True)
    state = Column(String(50), nullable=False)
    zip_code = Column(String(20))
    latitude = Column(Float)
    longitude = Column(Float)
    phone = Column(String(20))
    email = Column(String(255))
    rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    description = Column(Text)
    opening_hours = Column(Text)  # JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class StoreImage(Base):
    """Store Image model"""
    __tablename__ = "store_images"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, nullable=False, index=True)
    image_url = Column(Text, nullable=False)
    is_primary = Column(Integer, default=0)  # 1 for primary image
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
