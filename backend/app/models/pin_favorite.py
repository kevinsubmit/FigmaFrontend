"""
Pin Favorite Model
"""
from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.db.session import Base


class PinFavorite(Base):
    """
    Pin Favorite model
    Tracks user's favorite pins
    """
    __tablename__ = "pin_favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("backend_users.id", ondelete="CASCADE"), nullable=False, index=True)
    pin_id = Column(Integer, ForeignKey("pins.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", foreign_keys=[user_id])
    pin = relationship("Pin", foreign_keys=[pin_id])

    __table_args__ = (
        UniqueConstraint('user_id', 'pin_id', name='uq_user_pin_favorite'),
    )

    def __repr__(self):
        return f"<PinFavorite(id={self.id}, user_id={self.user_id}, pin_id={self.pin_id})>"
