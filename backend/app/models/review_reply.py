"""
ReviewReply database model
"""
from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.session import Base


class ReviewReply(Base):
    """ReviewReply model for store admin responses to reviews"""
    __tablename__ = "review_replies"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False, unique=True)  # 一个评价只能有一个回复
    admin_id = Column(Integer, ForeignKey("backend_users.id", ondelete="CASCADE"), nullable=False)  # 回复的管理员
    content = Column(Text, nullable=False)  # 回复内容
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    review = relationship("Review", back_populates="reply")
    admin = relationship("User", foreign_keys=[admin_id])
    
    def __repr__(self):
        return f"<ReviewReply(id={self.id}, review_id={self.review_id}, admin_id={self.admin_id})>"
