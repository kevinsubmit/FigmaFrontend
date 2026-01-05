"""
添加推荐系统字段到数据库
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy import text

def migrate():
    """执行数据库迁移"""
    print("开始添加推荐系统字段...")
    
    with engine.connect() as conn:
        try:
            # 添加referral_code字段
            print("1. 添加referral_code字段...")
            try:
                conn.execute(text("""
                    ALTER TABLE backend_users 
                    ADD COLUMN referral_code VARCHAR(10) UNIQUE
                """))
                conn.execute(text("""
                    CREATE INDEX idx_referral_code ON backend_users(referral_code)
                """))
                print("   ✓ referral_code字段添加成功")
            except Exception as e:
                if "Duplicate column name" in str(e) or "already exists" in str(e):
                    print("   - referral_code字段已存在")
                else:
                    print(f"   ✗ 添加referral_code字段失败: {e}")
            
            # 添加referred_by_code字段
            print("2. 添加referred_by_code字段...")
            try:
                conn.execute(text("""
                    ALTER TABLE backend_users 
                    ADD COLUMN referred_by_code VARCHAR(10)
                """))
                conn.execute(text("""
                    CREATE INDEX idx_referred_by_code ON backend_users(referred_by_code)
                """))
                print("   ✓ referred_by_code字段添加成功")
            except Exception as e:
                if "Duplicate column name" in str(e) or "already exists" in str(e):
                    print("   - referred_by_code字段已存在")
                else:
                    print(f"   ✗ 添加referred_by_code字段失败: {e}")
            
            # 创建referrals表
            print("3. 创建referrals表...")
            try:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS referrals (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        referrer_id INT NOT NULL COMMENT '推荐人ID',
                        referee_id INT NOT NULL COMMENT '被推荐人ID',
                        referral_code VARCHAR(10) NOT NULL COMMENT '使用的推荐码',
                        reward_given BOOLEAN DEFAULT FALSE COMMENT '奖励是否已发放',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        FOREIGN KEY (referrer_id) REFERENCES backend_users(id) ON DELETE CASCADE,
                        FOREIGN KEY (referee_id) REFERENCES backend_users(id) ON DELETE CASCADE,
                        INDEX idx_referrer_id (referrer_id),
                        INDEX idx_referee_id (referee_id),
                        INDEX idx_referral_code (referral_code)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='推荐关系表'
                """))
                print("   ✓ referrals表创建成功")
            except Exception as e:
                if "already exists" in str(e):
                    print("   - referrals表已存在")
                else:
                    print(f"   ✗ 创建referrals表失败: {e}")
            
            conn.commit()
            print("\n✅ 推荐系统字段迁移完成!")
            
        except Exception as e:
            conn.rollback()
            print(f"\n❌ 迁移失败: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    migrate()
