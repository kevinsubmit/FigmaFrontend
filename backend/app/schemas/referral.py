"""
Referral schemas
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ReferralCodeResponse(BaseModel):
    """推荐码响应"""
    referral_code: str
    
    class Config:
        from_attributes = True


class ReferralApply(BaseModel):
    """应用推荐码请求"""
    referral_code: str


class ReferralStats(BaseModel):
    """推荐统计"""
    total_referrals: int  # 总推荐人数
    successful_referrals: int  # 成功推荐人数(已奖励)
    pending_referrals: int  # 待完成推荐
    total_rewards_earned: int  # 获得的优惠券数量
    
    class Config:
        from_attributes = True


class ReferralListItem(BaseModel):
    """推荐列表项"""
    id: int
    referee_name: str  # 被推荐人姓名
    referee_phone: str  # 被推荐人手机号(部分隐藏)
    status: str  # 状态
    created_at: datetime  # 注册时间
    rewarded_at: Optional[datetime]  # 奖励时间
    referrer_reward_given: bool  # 是否已奖励
    
    class Config:
        from_attributes = True


class ReferralResponse(BaseModel):
    """推荐关系响应"""
    id: int
    referrer_id: int
    referee_id: int
    referral_code: str
    status: str
    referrer_reward_given: bool
    referee_reward_given: bool
    created_at: datetime
    rewarded_at: Optional[datetime]
    
    class Config:
        from_attributes = True
