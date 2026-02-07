"""
Store admin application model
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, func
from app.db.session import Base


class StoreAdminApplication(Base):
    """Store admin application"""
    __tablename__ = "store_admin_applications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(200), nullable=True)
    phone = Column(String(20), nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    store_name = Column(String(200), nullable=False)
    store_address = Column(String(500), nullable=True)
    store_phone = Column(String(20), nullable=True)
    opening_hours = Column(String(255), nullable=True)
    status = Column(String(20), nullable=False, default="pending", index=True)
    review_reason = Column(Text, nullable=True)
    reviewed_by = Column(Integer, nullable=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    store_id = Column(Integer, nullable=True, index=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<StoreAdminApplication(id={self.id}, phone={self.phone}, status={self.status})>"
