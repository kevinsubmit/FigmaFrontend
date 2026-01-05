"""
Referral model
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base


class Referral(Base):
    """推荐关系模型"""
    __tablename__ = "referrals"

    id = Column(Integer, primary_key=True, index=True)
    
    # 推荐人ID
    referrer_id = Column(Integer, ForeignKey("backend_users.id"), nullable=False, index=True)
    
    # 被推荐人ID
    referee_id = Column(Integer, ForeignKey("backend_users.id"), nullable=False, index=True)
    
    # 使用的推荐码
    referral_code = Column(String(10), nullable=False, index=True)
    
    # 状态: registered(已注册), rewarded(已奖励)
    status = Column(String(20), default="registered")
    
    # 推荐人奖励记录
    referrer_reward_given = Column(Boolean, default=False)
    referrer_coupon_id = Column(Integer, nullable=True)  # 优惠券ID(不设外键)
    
    # 被推荐人奖励记录
    referee_reward_given = Column(Boolean, default=False)
    referee_coupon_id = Column(Integer, nullable=True)  # 优惠券ID(不设外键)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    rewarded_at = Column(DateTime, nullable=True)
    
    # 关系
    referrer = relationship("User", foreign_keys=[referrer_id], backref="referrals_made")
    referee = relationship("User", foreign_keys=[referee_id], backref="referral_received")
