"""
Store Portfolio Model
Stores portfolio/work images uploaded by store managers
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.session import Base


class StorePortfolio(Base):
    """
    Store Portfolio model
    Stores portfolio images (nail art works) uploaded by store managers
    """
    __tablename__ = "store_portfolio"
    
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(Text, nullable=False)
    title = Column(String(255), nullable=True)  # Optional title for the work
    description = Column(Text, nullable=True)  # Optional description
    display_order = Column(Integer, default=0)  # For sorting
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    store = relationship("Store", foreign_keys=[store_id])
    
    def __repr__(self):
        return f"<StorePortfolio(id={self.id}, store_id={self.store_id}, title={self.title})>"
