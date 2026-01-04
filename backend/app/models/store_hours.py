"""
Store Hours Model
"""
from sqlalchemy import Column, Integer, String, Time, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.db.session import Base


class StoreHours(Base):
    """
    Store operating hours model
    Stores the operating hours for each day of the week
    """
    __tablename__ = "store_hours"
    
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 1=Tuesday, ..., 6=Sunday
    open_time = Column(Time, nullable=True)  # NULL means closed
    close_time = Column(Time, nullable=True)  # NULL means closed
    is_closed = Column(Boolean, default=False, nullable=False)  # True if store is closed on this day
    
    # Relationship
    store = relationship("Store", back_populates="hours")
    
    def __repr__(self):
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        if self.is_closed:
            return f"<StoreHours(store_id={self.store_id}, {day_names[self.day_of_week]}: Closed)>"
        return f"<StoreHours(store_id={self.store_id}, {day_names[self.day_of_week]}: {self.open_time}-{self.close_time})>"
