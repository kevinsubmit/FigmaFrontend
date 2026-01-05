"""
创建推荐奖励优惠券模板
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.coupon import Coupon, CouponType, CouponCategory
# 导入所有模型以确保关系正确初始化
from app.models.user import User
from app.models.user_points import UserPoints
from app.models.user_coupon import UserCoupon
from app.models.point_transaction import PointTransaction

def create_referral_coupon():
    """创建推荐奖励优惠券模板"""
    db = SessionLocal()
    try:
        # 检查是否已存在
        existing = db.query(Coupon).filter(
            Coupon.type == CouponType.FIXED_AMOUNT,
            Coupon.discount_value == 10.0,
            Coupon.category == CouponCategory.REFERRAL
        ).first()
        
        if existing:
            print(f"✓ 推荐奖励优惠券已存在 (ID: {existing.id})")
            print(f"  名称: {existing.name}")
            print(f"  金额: ${existing.discount_value}")
            print(f"  有效期: {existing.valid_days}天")
            return
        
        # 创建新的推荐奖励优惠券模板
        coupon = Coupon(
            name="Referral Reward $10 Off",
            description="推荐好友注册成功奖励",
            type=CouponType.FIXED_AMOUNT,
            category=CouponCategory.REFERRAL,
            discount_value=10.0,
            min_amount=0.0,  # 无最低消费限制
            valid_days=90,  # 90天有效期
            is_active=True,
            total_quantity=None,  # 无限量
            claimed_quantity=0,
            points_required=None  # 不可积分兑换
        )
        
        db.add(coupon)
        db.commit()
        db.refresh(coupon)
        
        print("✅ 推荐奖励优惠券创建成功!")
        print(f"  ID: {coupon.id}")
        print(f"  名称: {coupon.name}")
        print(f"  金额: ${coupon.discount_value}")
        print(f"  有效期: {coupon.valid_days}天")
        
    except Exception as e:
        db.rollback()
        print(f"❌ 创建失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_referral_coupon()
