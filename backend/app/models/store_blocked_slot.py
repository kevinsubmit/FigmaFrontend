"""
Store blocked slot model
"""
from sqlalchemy import Column, Integer, String, Date, Time, DateTime, ForeignKey, func
from app.db.session import Base


class StoreBlockedSlot(Base):
    __tablename__ = "store_blocked_slots"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, index=True)
    blocked_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    reason = Column(String(255), nullable=True)
    status = Column(String(20), nullable=False, default="active", index=True)  # active | inactive
    created_by = Column(Integer, ForeignKey("backend_users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
