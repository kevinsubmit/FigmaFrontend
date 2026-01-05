# 推荐好友系统文档

## 概述

推荐好友系统是美甲预约平台的用户增长功能，允许用户通过分享推荐码邀请好友注册，注册成功后双方都能获得$10优惠券奖励。

## 功能特点

### 核心功能

1. **推荐码生成**：每个用户拥有唯一的6位字母数字混合推荐码
2. **推荐奖励**：注册成功时，推荐人和被推荐人各获得$10优惠券
3. **推荐统计**：实时显示推荐人数、成功推荐数、获得奖励数量
4. **推荐列表**：查看所有推荐记录，包括被推荐人信息和奖励状态
5. **分享功能**：支持复制推荐码和分享链接

### 奖励规则

- **奖励时机**：被推荐人注册成功时立即发放
- **奖励内容**：双方各获得1张$10固定金额优惠券
- **优惠券有效期**：90天
- **使用限制**：无最低消费限制，可用于任何预约订单

## 技术实现

### 数据库设计

#### 1. User表扩展

```sql
ALTER TABLE backend_users 
ADD COLUMN referral_code VARCHAR(10) UNIQUE,
ADD COLUMN referred_by_code VARCHAR(10),
ADD INDEX idx_referral_code (referral_code),
ADD INDEX idx_referred_by_code (referred_by_code);
```

**字段说明**：
- `referral_code`: 用户的推荐码（唯一）
- `referred_by_code`: 被谁推荐（记录推荐码）

#### 2. Referrals表

```sql
CREATE TABLE referrals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    referrer_id INT NOT NULL COMMENT '推荐人ID',
    referee_id INT NOT NULL COMMENT '被推荐人ID',
    referral_code VARCHAR(10) NOT NULL COMMENT '使用的推荐码',
    status VARCHAR(20) DEFAULT 'pending' COMMENT '状态',
    referrer_reward_given BOOLEAN DEFAULT FALSE COMMENT '推荐人奖励是否已发放',
    referrer_coupon_id INT COMMENT '推荐人获得的优惠券ID',
    referee_reward_given BOOLEAN DEFAULT FALSE COMMENT '被推荐人奖励是否已发放',
    referee_coupon_id INT COMMENT '被推荐人获得的优惠券ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rewarded_at TIMESTAMP COMMENT '奖励发放时间',
    FOREIGN KEY (referrer_id) REFERENCES backend_users(id) ON DELETE CASCADE,
    FOREIGN KEY (referee_id) REFERENCES backend_users(id) ON DELETE CASCADE,
    INDEX idx_referrer_id (referrer_id),
    INDEX idx_referee_id (referee_id),
    INDEX idx_referral_code (referral_code)
);
```

**字段说明**：
- `status`: 推荐状态（pending/rewarded/failed）
- `referrer_reward_given`: 推荐人奖励是否已发放
- `referee_reward_given`: 被推荐人奖励是否已发放
- `referrer_coupon_id`: 推荐人获得的优惠券ID
- `referee_coupon_id`: 被推荐人获得的优惠券ID

### 后端API

#### 1. 获取推荐码

```
GET /api/v1/referrals/my-code
Authorization: Bearer {token}
```

**响应**：
```json
{
  "referral_code": "ABC123"
}
```

#### 2. 获取推荐统计

```
GET /api/v1/referrals/stats
Authorization: Bearer {token}
```

**响应**：
```json
{
  "total_referrals": 5,
  "successful_referrals": 4,
  "pending_referrals": 1,
  "total_rewards_earned": 4
}
```

#### 3. 获取推荐列表

```
GET /api/v1/referrals/list
Authorization: Bearer {token}
```

**响应**：
```json
[
  {
    "id": 1,
    "referee_name": "张三",
    "referee_phone": "155****0001",
    "status": "rewarded",
    "created_at": "2026-01-05T10:30:00",
    "rewarded_at": "2026-01-05T10:30:05",
    "referrer_reward_given": true
  }
]
```

#### 4. 注册接口（支持推荐码）

```
POST /api/v1/auth/register
```

**请求体**：
```json
{
  "phone": "15550000100",
  "username": "testuser",
  "full_name": "测试用户",
  "password": "Password123",
  "verification_code": "123456",
  "referral_code": "ABC123"  // 可选
}
```

**注册流程**：
1. 验证手机号和验证码
2. 检查推荐码是否有效（如果提供）
3. 创建用户账号
4. 如果有推荐码：
   - 创建推荐关系记录
   - 查找$10推荐奖励优惠券模板
   - 发放优惠券给推荐人
   - 发放优惠券给被推荐人
   - 更新推荐关系状态为已奖励

### 前端实现

#### 1. 推荐页面 (ReferralPage.tsx)

**功能模块**：
- 推荐码显示和复制
- 分享链接生成和复制
- 推荐统计展示
- 推荐列表展示

**关键代码**：
```typescript
// 复制推荐码
const handleCopyCode = () => {
  navigator.clipboard.writeText(referralCode);
  showToast('推荐码已复制');
};

// 生成分享链接
const shareLink = `${window.location.origin}/register?ref=${referralCode}`;

// 复制分享链接
const handleCopyLink = () => {
  navigator.clipboard.writeText(shareLink);
  showToast('分享链接已复制');
};
```

#### 2. 注册页面 (Register.tsx)

**推荐码输入框**：
- 位置：在密码确认后，注册按钮前
- 标记：可选字段
- 功能：支持URL参数`?ref=XXX`自动填充

**关键代码**：
```typescript
// 从URL参数读取推荐码
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const refCode = params.get('ref');
  if (refCode) {
    setReferralCode(refCode.toUpperCase());
  }
}, []);

// 推荐码输入框
<input
  type="text"
  value={referralCode}
  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
  placeholder="输入推荐码获得$10优惠券"
  className="..."
  maxLength={10}
/>
```

#### 3. 个人中心入口 (Profile.tsx)

在个人中心页面添加"推荐好友"入口，点击跳转到推荐页面。

## 使用流程

### 推荐人流程

1. **获取推荐码**
   - 登录账号
   - 进入个人中心
   - 点击"推荐好友"
   - 系统自动生成或显示已有推荐码

2. **分享推荐码**
   - 复制推荐码直接分享给好友
   - 或复制分享链接发送给好友
   - 好友通过链接注册时自动填充推荐码

3. **查看推荐记录**
   - 在推荐页面查看推荐统计
   - 查看推荐列表，了解每个好友的注册状态
   - 查看获得的奖励数量

### 被推荐人流程

1. **获取推荐码**
   - 从推荐人处获得推荐码或分享链接

2. **注册账号**
   - 访问注册页面（或通过分享链接）
   - 填写注册信息（全名、手机号、验证码、密码）
   - 在推荐码输入框填写推荐码（如通过链接则自动填充）
   - 完成注册

3. **获得奖励**
   - 注册成功后自动获得$10优惠券
   - 在"我的优惠券"页面查看

## 测试结果

### 测试环境

- 后端：FastAPI + SQLAlchemy + MySQL
- 前端：React + TypeScript + Ionic
- 测试工具：Python TestClient

### 测试用例

#### 1. 推荐码生成测试
✅ **通过** - 用户注册后能自动生成6位字母数字混合推荐码

#### 2. 推荐关系记录测试
✅ **通过** - 使用推荐码注册后，系统正确记录推荐关系

#### 3. 推荐统计测试
✅ **通过** - 推荐统计API返回准确数据
- 总推荐人数: 1
- 成功推荐数: 1
- 待完成推荐: 0
- 获得优惠券数: 1

#### 4. 推荐列表测试
✅ **通过** - 推荐列表显示完整信息
- 被推荐人姓名
- 注册时间
- 奖励状态：已发放
- 状态：rewarded

#### 5. 奖励发放测试
✅ **通过** - 注册成功时系统自动发放奖励
- 推荐关系状态更新为"rewarded"
- 推荐统计显示"成功推荐数: 1"
- 优惠券已发放到双方账户

### 测试脚本

完整测试脚本位于：`/backend/test_referral_system.py`

运行测试：
```bash
cd /home/ubuntu/FigmaFrontend/backend
python3 test_referral_system.py
```

## 注意事项

### 1. 推荐码格式

- 长度：6位
- 字符：大写字母和数字混合
- 唯一性：每个用户的推荐码全局唯一

### 2. 奖励发放

- **时机**：被推荐人注册成功时立即发放
- **条件**：推荐码必须有效且存在
- **失败处理**：如果优惠券模板不存在，注册仍然成功，但不发放奖励

### 3. 优惠券模板

系统需要预先创建推荐奖励优惠券模板：
- 类型：固定金额（FIXED_AMOUNT）
- 金额：$10.0
- 分类：推荐奖励（REFERRAL）
- 有效期：90天
- 状态：激活

创建脚本：`/backend/create_referral_coupon.py`

### 4. 数据库迁移

推荐系统需要以下数据库变更：
1. User表添加推荐码字段
2. 创建Referrals表
3. 创建推荐奖励优惠券模板

迁移脚本：`/backend/migrate_referral_fields.py`

## 未来优化

### 1. 功能扩展

- [ ] 推荐排行榜
- [ ] 推荐活动（限时双倍奖励）
- [ ] 推荐码自定义
- [ ] 推荐分享海报生成
- [ ] 社交媒体分享集成

### 2. 性能优化

- [ ] 推荐统计数据缓存
- [ ] 推荐列表分页加载
- [ ] 异步奖励发放

### 3. 数据分析

- [ ] 推荐转化率分析
- [ ] 推荐渠道效果分析
- [ ] 用户推荐行为分析

## 相关文档

- [积分和优惠券系统文档](./POINTS_COUPONS_SYSTEM.md)
- [用户认证系统文档](./AUTH_SYSTEM_COMPLETE.md)
- [API接口文档](./BACKEND_API_SUMMARY.md)

## 更新日志

### 2026-01-05
- ✅ 完成推荐系统后端开发
- ✅ 完成推荐系统前端开发
- ✅ 完成功能测试
- ✅ 编写系统文档

---

**文档版本**: 1.0  
**最后更新**: 2026-01-05  
**维护者**: Manus AI
