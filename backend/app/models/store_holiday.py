"""
Store Holiday Model
Stores holiday/special closure dates for stores
"""
from sqlalchemy import Column, Integer, String, Date, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.session import Base


class StoreHoliday(Base):
    """
    Store Holiday model
    Stores special closure dates (holidays, vacations, etc.)
    """
    __tablename__ = "store_holidays"
    
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, index=True)
    holiday_date = Column(Date, nullable=False, index=True)
    name = Column(String(255), nullable=False)  # e.g., "Christmas Day", "Vacation"
    description = Column(Text, nullable=True)  # Optional description
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    store = relationship("Store", foreign_keys=[store_id])
    
    def __repr__(self):
        return f"<StoreHoliday(id={self.id}, store_id={self.store_id}, date={self.holiday_date}, name={self.name})>"
