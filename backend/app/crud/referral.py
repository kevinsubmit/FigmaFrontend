"""
Referral CRUD operations
"""
from sqlalchemy.orm import Session
from typing import Optional, List
import random
import string
from datetime import datetime

from app.models.referral import Referral
from app.models.user import User


def generate_referral_code() -> str:
    """生成6位字母数字混合推荐码"""
    # 使用大写字母和数字,排除容易混淆的字符(0,O,I,1)
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return ''.join(random.choices(chars, k=6))


def get_or_create_referral_code(db: Session, user_id: int) -> str:
    """获取或创建用户的推荐码"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if user and user.referral_code:
        return user.referral_code
    
    # 生成唯一推荐码
    max_attempts = 10
    for _ in range(max_attempts):
        code = generate_referral_code()
        existing = db.query(User).filter(User.referral_code == code).first()
        if not existing:
            # 更新用户推荐码
            if user:
                user.referral_code = code
                db.commit()
                db.refresh(user)
            return code
    
    raise Exception("Failed to generate unique referral code")


def create_referral(
    db: Session,
    referrer_id: int,
    referee_id: int,
    referral_code: str
) -> Referral:
    """创建推荐关系"""
    referral = Referral(
        referrer_id=referrer_id,
        referee_id=referee_id,
        referral_code=referral_code,
        status="registered"
    )
    db.add(referral)
    db.commit()
    db.refresh(referral)
    return referral


def get_referral_by_referee(db: Session, referee_id: int) -> Optional[Referral]:
    """根据被推荐人ID获取推荐关系"""
    return db.query(Referral).filter(Referral.referee_id == referee_id).first()


def get_referrals_by_referrer(
    db: Session,
    referrer_id: int,
    skip: int = 0,
    limit: int = 100
) -> List[Referral]:
    """获取推荐人的所有推荐关系"""
    return db.query(Referral)\
        .filter(Referral.referrer_id == referrer_id)\
        .order_by(Referral.created_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()


def get_referral_stats(db: Session, referrer_id: int) -> dict:
    """获取推荐统计"""
    referrals = db.query(Referral).filter(Referral.referrer_id == referrer_id).all()
    
    total = len(referrals)
    successful = sum(1 for r in referrals if r.referrer_reward_given)
    pending = total - successful
    
    return {
        "total_referrals": total,
        "successful_referrals": successful,
        "pending_referrals": pending,
        "total_rewards_earned": successful  # 每个成功推荐1个优惠券
    }


def mark_referral_rewarded(
    db: Session,
    referral_id: int,
    referrer_coupon_id: Optional[int] = None,
    referee_coupon_id: Optional[int] = None
) -> Referral:
    """标记推荐关系已奖励"""
    referral = db.query(Referral).filter(Referral.id == referral_id).first()
    if referral:
        referral.status = "rewarded"
        referral.referrer_reward_given = True
        referral.referee_reward_given = True
        referral.rewarded_at = datetime.utcnow()
        
        if referrer_coupon_id:
            referral.referrer_coupon_id = referrer_coupon_id
        if referee_coupon_id:
            referral.referee_coupon_id = referee_coupon_id
            
        db.commit()
        db.refresh(referral)
    return referral


def find_referrer_by_code(db: Session, referral_code: str) -> Optional[User]:
    """根据推荐码查找推荐人"""
    return db.query(User).filter(User.referral_code == referral_code).first()
