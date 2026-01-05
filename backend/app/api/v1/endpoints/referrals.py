"""
Referrals API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user
from app.crud import referral as crud_referral
from app.crud import coupons as crud_coupons
from app.schemas.referral import (
    ReferralCodeResponse,
    ReferralStats,
    ReferralListItem,
    ReferralResponse
)
from app.schemas.user import UserResponse
from app.models.user import User

router = APIRouter()


@router.get("/my-code", response_model=ReferralCodeResponse)
def get_my_referral_code(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取我的推荐码(如果没有则自动生成)
    """
    code = crud_referral.get_or_create_referral_code(db, current_user.id)
    return {"referral_code": code}


@router.get("/stats", response_model=ReferralStats)
def get_referral_stats(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取推荐统计
    """
    stats = crud_referral.get_referral_stats(db, current_user.id)
    return stats


@router.get("/list", response_model=List[ReferralListItem])
def get_referral_list(
    skip: int = 0,
    limit: int = 100,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取推荐列表
    """
    referrals = crud_referral.get_referrals_by_referrer(
        db,
        current_user.id,
        skip=skip,
        limit=limit
    )
    
    result = []
    for ref in referrals:
        # 获取被推荐人信息
        referee = db.query(User).filter(User.id == ref.referee_id).first()
        if referee:
            # 隐藏部分手机号
            phone = referee.phone
            hidden_phone = phone[:3] + "****" + phone[-4:] if len(phone) >= 7 else phone
            
            result.append({
                "id": ref.id,
                "referee_name": referee.full_name or "User",
                "referee_phone": hidden_phone,
                "status": ref.status,
                "created_at": ref.created_at,
                "rewarded_at": ref.rewarded_at,
                "referrer_reward_given": ref.referrer_reward_given
            })
    
    return result
