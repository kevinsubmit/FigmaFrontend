-- Add referral system fields to backend_users table
ALTER TABLE backend_users 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10) UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(10),
ADD INDEX IF NOT EXISTS idx_referral_code (referral_code),
ADD INDEX IF NOT EXISTS idx_referred_by_code (referred_by_code);

-- Create referrals table if not exists
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='推荐关系表';
