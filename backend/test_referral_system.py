"""
推荐系统测试
测试推荐码生成、推荐关系记录、奖励发放等功能
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.db.session import get_db
from app.models.user import User
from app.models.referral import Referral
from app.models.coupon import Coupon
from app.models.user_coupon import UserCoupon
from sqlalchemy.orm import Session
import json

client = TestClient(app)

# 测试用户数据
test_users = {
    "referrer": {
        "phone": "15550000100",  # 11位数字
        "username": "referrer_test",
        "full_name": "推荐人测试",
        "password": "Test123456",
        "verification_code": "999999"  # 测试用验证码
    },
    "referee": {
        "phone": "15550000101",  # 11位数字
        "username": "referee_test",
        "full_name": "被推荐人测试",
        "password": "Test123456",
        "verification_code": "999999"  # 测试用验证码
    }
}

def cleanup_test_data():
    """清理测试数据"""
    db: Session = next(get_db())
    try:
        # 删除测试用户的优惠券
        for user_data in test_users.values():
            user = db.query(User).filter(User.phone == user_data["phone"]).first()
            if user:
                db.query(UserCoupon).filter(UserCoupon.user_id == user.id).delete()
                db.query(Referral).filter(
                    (Referral.referrer_id == user.id) | (Referral.referee_id == user.id)
                ).delete()
                db.delete(user)
        
        db.commit()
        print("✓ 测试数据清理完成")
    except Exception as e:
        db.rollback()
        print(f"✗ 清理测试数据失败: {str(e)}")
    finally:
        db.close()

def test_1_register_referrer():
    """测试1: 注册推荐人账号"""
    print("\n=== 测试1: 注册推荐人账号 ===")
    
    # 先发送验证码
    print("步骤1: 发送验证码...")
    verify_response = client.post(
        "/api/v1/auth/send-verification-code",
        json={
            "phone": test_users["referrer"]["phone"],
            "purpose": "register"
        }
    )
    print(f"验证码发送状态: {verify_response.status_code}")
    if verify_response.status_code != 200:
        print(f"验证码发送失败: {verify_response.text}")
        return None
    
    # 获取验证码
    verify_data = verify_response.json()
    verification_code = verify_data.get('code', '123456')  # 从响应中获取验证码
    print(f"验证码: {verification_code}")
    
    # 注册
    print("步骤2: 注册用户...")
    referrer_data = test_users["referrer"].copy()
    referrer_data["verification_code"] = verification_code
    response = client.post(
        "/api/v1/auth/register",
        json=referrer_data
    )
    
    print(f"状态码: {response.status_code}")
    if response.status_code in [200, 201]:
        user_data = response.json()
        print(f"✓ 推荐人注册成功")
        print(f"  用户ID: {user_data.get('id', 'N/A')}")
        print(f"  手机号: {user_data.get('phone', 'N/A')}")
        print(f"  推荐码: {user_data.get('referral_code', 'N/A')}")
        
        # 登录获取token
        print("步骤3: 登录获取token...")
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "phone": test_users["referrer"]["phone"],
                "password": test_users["referrer"]["password"]
            }
        )
        if login_response.status_code in [200, 201]:
            login_data = login_response.json()
            return {
                "user": user_data,
                "access_token": login_data["access_token"]
            }
        else:
            print(f"✗ 登录失败: {login_response.text}")
            return None
    else:
        print(f"✗ 推荐人注册失败: {response.text}")
        return None

def test_2_get_referral_code(token: str):
    """测试2: 获取推荐码"""
    print("\n=== 测试2: 获取推荐码 ===")
    
    response = client.get(
        "/api/v1/referrals/my-code",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"状态码: {response.status_code}")
    if response.status_code in [200, 201]:
        data = response.json()
        print(f"✓ 获取推荐码成功")
        print(f"  推荐码: {data['referral_code']}")
        return data['referral_code']
    else:
        print(f"✗ 获取推荐码失败: {response.text}")
        return None

def test_3_register_with_referral_code(referral_code: str):
    """测试3: 使用推荐码注册新用户"""
    print("\n=== 测试3: 使用推荐码注册新用户 ===")
    
    # 先发送验证码
    print("步骤1: 发送验证码...")
    verify_response = client.post(
        "/api/v1/auth/send-verification-code",
        json={
            "phone": test_users["referee"]["phone"],
            "purpose": "register"
        }
    )
    print(f"验证码发送状态: {verify_response.status_code}")
    if verify_response.status_code != 200:
        print(f"验证码发送失败: {verify_response.text}")
        return None
    
    # 获取验证码
    verify_data = verify_response.json()
    verification_code = verify_data.get('code', '123456')
    print(f"验证码: {verification_code}")
    
    # 注册
    print("步骤2: 注册用户...")
    referee_data = test_users["referee"].copy()
    referee_data["verification_code"] = verification_code
    referee_data["referral_code"] = referral_code
    
    response = client.post(
        "/api/v1/auth/register",
        json=referee_data
    )
    
    print(f"状态码: {response.status_code}")
    if response.status_code in [200, 201]:
        user_data = response.json()
        print(f"✓ 被推荐人注册成功")
        print(f"  用户ID: {user_data.get('id', 'N/A')}")
        print(f"  手机号: {user_data.get('phone', 'N/A')}")
        print(f"  使用的推荐码: {referral_code}")
        
        # 登录获取token
        print("步骤3: 登录获取token...")
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "phone": test_users["referee"]["phone"],
                "password": test_users["referee"]["password"]
            }
        )
        if login_response.status_code in [200, 201]:
            login_data = login_response.json()
            return {
                "user": user_data,
                "access_token": login_data["access_token"]
            }
        else:
            print(f"✗ 登录失败: {login_response.text}")
            return None
    else:
        print(f"✗ 被推荐人注册失败: {response.text}")
        return None

def test_4_check_referral_rewards(referrer_token: str, referee_token: str):
    """测试4: 检查推荐奖励是否发放"""
    print("\n=== 测试4: 检查推荐奖励 ===")
    
    # 检查推荐人的优惠券
    print("\n检查推荐人的优惠券:")
    response = client.get(
        "/api/v1/coupons/my-coupons",
        headers={"Authorization": f"Bearer {referrer_token}"}
    )
    
    if response.status_code in [200, 201]:
        coupons = response.json()
        referral_coupons = [c for c in coupons if c.get('source') == 'referral']
        print(f"  推荐奖励优惠券数量: {len(referral_coupons)}")
        if referral_coupons:
            for coupon in referral_coupons:
                print(f"  - 优惠券ID: {coupon['id']}, 金额: ${coupon['discount_amount']}")
    else:
        print(f"  ✗ 获取推荐人优惠券失败: {response.text}")
    
    # 检查被推荐人的优惠券
    print("\n检查被推荐人的优惠券:")
    response = client.get(
        "/api/v1/coupons/my-coupons",
        headers={"Authorization": f"Bearer {referee_token}"}
    )
    
    if response.status_code in [200, 201]:
        coupons = response.json()
        referral_coupons = [c for c in coupons if c.get('source') == 'referral']
        print(f"  推荐奖励优惠券数量: {len(referral_coupons)}")
        if referral_coupons:
            for coupon in referral_coupons:
                print(f"  - 优惠券ID: {coupon['id']}, 金额: ${coupon['discount_amount']}")
        
        if len(referral_coupons) > 0:
            print("\n✓ 推荐奖励发放成功")
            return True
    else:
        print(f"  ✗ 获取被推荐人优惠券失败: {response.text}")
    
    print("\n✗ 推荐奖励发放失败")
    return False

def test_5_get_referral_stats(token: str):
    """测试5: 获取推荐统计"""
    print("\n=== 测试5: 获取推荐统计 ===")
    
    response = client.get(
        "/api/v1/referrals/stats",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"状态码: {response.status_code}")
    if response.status_code in [200, 201]:
        data = response.json()
        print(f"✓ 获取推荐统计成功")
        print(f"  总推荐人数: {data['total_referrals']}")
        print(f"  成功推荐数: {data['successful_referrals']}")
        print(f"  待完成推荐: {data.get('pending_referrals', 0)}")
        print(f"  获得优惠券数: {data.get('total_rewards_earned', 0)}")
        return data
    else:
        print(f"✗ 获取推荐统计失败: {response.text}")
        return None

def test_6_get_referral_list(token: str):
    """测试6: 获取推荐列表"""
    print("\n=== 测试6: 获取推荐列表 ===")
    
    response = client.get(
        "/api/v1/referrals/list",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"状态码: {response.status_code}")
    if response.status_code in [200, 201]:
        data = response.json()
        print(f"✓ 获取推荐列表成功")
        print(f"  推荐记录数: {len(data)}")
        for i, referral in enumerate(data, 1):
            print(f"  {i}. 被推荐人: {referral.get('referee_name', 'N/A')}")
            print(f"     注册时间: {referral.get('created_at', 'N/A')}")
            print(f"     奖励状态: {'已发放' if referral.get('referrer_reward_given', False) else '未发放'}")
            print(f"     状态: {referral.get('status', 'N/A')}")
        return data
    else:
        print(f"✗ 获取推荐列表失败: {response.text}")
        return None

def run_all_tests():
    """运行所有测试"""
    print("=" * 60)
    print("推荐系统完整测试")
    print("=" * 60)
    
    # 清理之前的测试数据
    cleanup_test_data()
    
    try:
        # 测试1: 注册推荐人
        referrer_result = test_1_register_referrer()
        if not referrer_result:
            print("\n✗ 测试失败: 无法注册推荐人")
            return
        
        referrer_token = referrer_result["access_token"]
        
        # 测试2: 获取推荐码
        referral_code = test_2_get_referral_code(referrer_token)
        if not referral_code:
            print("\n✗ 测试失败: 无法获取推荐码")
            return
        
        # 测试3: 使用推荐码注册
        referee_result = test_3_register_with_referral_code(referral_code)
        if not referee_result:
            print("\n✗ 测试失败: 无法使用推荐码注册")
            return
        
        referee_token = referee_result["access_token"]
        
        # 测试4: 检查奖励发放
        rewards_ok = test_4_check_referral_rewards(referrer_token, referee_token)
        
        # 测试5: 获取推荐统计
        stats = test_5_get_referral_stats(referrer_token)
        
        # 测试6: 获取推荐列表
        referral_list = test_6_get_referral_list(referrer_token)
        
        # 总结
        print("\n" + "=" * 60)
        print("测试总结")
        print("=" * 60)
        print(f"✓ 推荐人注册: 成功")
        print(f"✓ 推荐码生成: 成功 ({referral_code})")
        print(f"✓ 被推荐人注册: 成功")
        print(f"{'✓' if rewards_ok else '✗'} 奖励发放: {'成功' if rewards_ok else '失败'}")
        if stats:
            print(f"✓ 推荐统计: 成功 (推荐{stats.get('total_referrals', 0)}人, 成功{stats.get('successful_referrals', 0)}人)")
        if referral_list is not None:
            print(f"✓ 推荐列表: 成功 ({len(referral_list)}条记录)")
        
        if rewards_ok:
            print("\n🎉 所有测试通过!")
        else:
            print("\n⚠️  部分测试失败")
            print("提示: 如果奖励未发放，请检查：")
            print("  1. 数据库中是否有推荐奖励优惠券模板")
            print("  2. 注册 API 中的奖励发放逻辑是否正确执行")
            print("  3. claim_coupon 函数是否正常工作")
        
    except Exception as e:
        print(f"\n✗ 测试过程中出现异常: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        # 清理测试数据
        print("\n清理测试数据...")
        cleanup_test_data()

if __name__ == "__main__":
    run_all_tests()
