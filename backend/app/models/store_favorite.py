"""
Store Favorite Model
"""
from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.db.session import Base


class StoreFavorite(Base):
    """
    Store Favorite model
    Tracks user's favorite stores
    """
    __tablename__ = "store_favorites"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("backend_users.id", ondelete="CASCADE"), nullable=False, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    store = relationship("Store", foreign_keys=[store_id])
    
    # Unique constraint: one user can only favorite a store once
    __table_args__ = (
        UniqueConstraint('user_id', 'store_id', name='uq_user_store_favorite'),
    )
    
    def __repr__(self):
        return f"<StoreFavorite(id={self.id}, user_id={self.user_id}, store_id={self.store_id})>"
