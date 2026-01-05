# 积分和优惠券系统文档

## 概述

积分和优惠券系统是美甲预约平台的用户激励和营销功能，通过消费积分和优惠券奖励提升用户粘性和复购率。系统支持积分获取、兑换、优惠券领取、使用等完整流程，并与预约订单系统深度集成。

## 功能特点

### 核心功能

1. **积分系统**：消费获得积分，积分可兑换优惠券
2. **优惠券系统**：多种类型优惠券，支持领取、兑换、使用
3. **积分明细**：完整的积分获取和消费记录
4. **优惠券管理**：查看可用、已使用、已过期优惠券
5. **自动过期**：优惠券到期自动标记为过期
6. **多种来源**：系统发放、积分兑换、推荐好友、活动赠送

### 业务规则

#### 积分规则

| 规则项 | 说明 |
|-------|------|
| 获取比例 | 消费1美金 = 1积分 |
| 获取时机 | 订单完成后自动发放 |
| 有效期 | 永久有效 |
| 使用范围 | 兑换优惠券 |
| 兑换比例 | 100积分 = $5优惠券 |

#### 优惠券规则

| 规则项 | 说明 |
|-------|------|
| 类型 | 固定金额券、折扣券 |
| 分类 | 普通券、新人券、生日券、推荐券 |
| 来源 | 系统发放、积分兑换、推荐好友、活动赠送 |
| 有效期 | 领取后N天内有效（可配置） |
| 使用限制 | 最低消费金额、最大折扣金额 |
| 状态 | 未使用、已使用、已过期 |

## 技术实现

### 数据库设计

#### 1. UserPoints表（用户积分）

```sql
CREATE TABLE user_points (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE COMMENT '用户ID',
    total_points INT DEFAULT 0 COMMENT '累计获得积分',
    available_points INT DEFAULT 0 COMMENT '可用积分',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES backend_users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);
```

**字段说明**：
- `user_id`: 用户ID（唯一）
- `total_points`: 累计获得的总积分
- `available_points`: 当前可用积分（总积分 - 已使用积分）

#### 2. PointTransactions表（积分明细）

```sql
CREATE TABLE point_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_points_id INT NOT NULL COMMENT '用户积分ID',
    amount INT NOT NULL COMMENT '积分数量',
    type VARCHAR(20) NOT NULL COMMENT '交易类型',
    reason VARCHAR(255) COMMENT '原因',
    description TEXT COMMENT '描述',
    reference_type VARCHAR(50) COMMENT '关联类型',
    reference_id INT COMMENT '关联ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_points_id) REFERENCES user_points(id) ON DELETE CASCADE,
    INDEX idx_user_points_id (user_points_id),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at)
);
```

**字段说明**：
- `amount`: 积分数量（正数为获得，负数为消费）
- `type`: 交易类型（earn获得/spend消费）
- `reason`: 交易原因
- `reference_type`: 关联类型（如appointment）
- `reference_id`: 关联ID

#### 3. Coupons表（优惠券模板）

```sql
CREATE TABLE coupons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT '优惠券名称',
    description TEXT COMMENT '描述',
    type VARCHAR(20) NOT NULL COMMENT '类型',
    category VARCHAR(20) NOT NULL COMMENT '分类',
    discount_value FLOAT NOT NULL COMMENT '折扣值',
    min_amount FLOAT DEFAULT 0 COMMENT '最低消费金额',
    max_discount FLOAT COMMENT '最大折扣金额',
    valid_days INT NOT NULL COMMENT '有效天数',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    total_quantity INT COMMENT '总数量',
    claimed_quantity INT DEFAULT 0 COMMENT '已领取数量',
    points_required INT COMMENT '兑换所需积分',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active),
    INDEX idx_category (category)
);
```

**字段说明**：
- `type`: 类型（fixed_amount固定金额/percentage百分比）
- `category`: 分类（normal普通/newcomer新人/birthday生日/referral推荐/activity活动）
- `discount_value`: 折扣值（固定金额为美元数，百分比为0-100）
- `min_amount`: 最低消费金额
- `max_discount`: 最大折扣金额（仅百分比券）
- `valid_days`: 有效天数（从领取日期开始计算）
- `points_required`: 兑换所需积分（null表示不可兑换）

#### 4. UserCoupons表（用户优惠券）

```sql
CREATE TABLE user_coupons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '用户ID',
    coupon_id INT NOT NULL COMMENT '优惠券模板ID',
    status VARCHAR(20) DEFAULT 'available' COMMENT '状态',
    source VARCHAR(50) NOT NULL COMMENT '来源',
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '获得时间',
    expires_at TIMESTAMP NOT NULL COMMENT '过期时间',
    used_at TIMESTAMP COMMENT '使用时间',
    appointment_id INT COMMENT '使用的预约ID',
    FOREIGN KEY (user_id) REFERENCES backend_users(id) ON DELETE CASCADE,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at)
);
```

**字段说明**：
- `status`: 状态（available可用/used已使用/expired已过期）
- `source`: 来源（system系统发放/points积分兑换/referral推荐好友/activity活动）
- `obtained_at`: 获得时间
- `expires_at`: 过期时间（obtained_at + valid_days）
- `used_at`: 使用时间
- `appointment_id`: 使用的预约ID

### 后端API

#### 积分系统API

##### 1. 获取积分余额

```
GET /api/v1/points/balance
Authorization: Bearer {token}
```

**响应**：
```json
{
  "total_points": 500,
  "available_points": 300
}
```

##### 2. 获取积分明细

```
GET /api/v1/points/transactions
Authorization: Bearer {token}
```

**查询参数**：
- `skip`: 跳过的记录数（默认0）
- `limit`: 返回的记录数（默认50）

**响应**：
```json
[
  {
    "id": 1,
    "user_points_id": 10,
    "amount": 50,
    "type": "earn",
    "reason": "Order completed",
    "description": "Completed appointment #456",
    "reference_type": "appointment",
    "reference_id": 456,
    "created_at": "2026-01-05T10:30:00"
  },
  {
    "id": 2,
    "amount": -100,
    "type": "spend",
    "reason": "Coupon exchange",
    "description": "Exchanged for $5 coupon",
    "created_at": "2026-01-04T15:20:00"
  }
]
```

##### 3. 测试积分发放（仅测试用）

```
POST /api/v1/points/test-award
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "amount": 50.0
}
```

**响应**：
```json
{
  "message": "Points awarded successfully",
  "points_earned": 50,
  "new_balance": 350
}
```

#### 优惠券系统API

##### 1. 获取可领取优惠券列表

```
GET /api/v1/coupons/available
```

**查询参数**：
- `skip`: 跳过的记录数（默认0）
- `limit`: 返回的记录数（默认50）

**响应**：
```json
[
  {
    "id": 1,
    "name": "Welcome Coupon $10 Off",
    "description": "New user welcome coupon",
    "type": "fixed_amount",
    "category": "newcomer",
    "discount_value": 10.0,
    "min_amount": 0.0,
    "max_discount": null,
    "valid_days": 30,
    "is_active": true,
    "total_quantity": 1000,
    "claimed_quantity": 523,
    "points_required": null,
    "created_at": "2026-01-01T00:00:00"
  }
]
```

##### 2. 获取可兑换优惠券列表

```
GET /api/v1/coupons/exchangeable
```

**响应**：
```json
[
  {
    "id": 2,
    "name": "$5 Off Coupon",
    "description": "Exchange with 100 points",
    "type": "fixed_amount",
    "category": "normal",
    "discount_value": 5.0,
    "min_amount": 0.0,
    "valid_days": 30,
    "points_required": 100
  }
]
```

##### 3. 获取我的优惠券

```
GET /api/v1/coupons/my-coupons
Authorization: Bearer {token}
```

**查询参数**：
- `status`: 筛选状态（available/used/expired，可选）
- `skip`: 跳过的记录数（默认0）
- `limit`: 返回的记录数（默认50）

**响应**：
```json
[
  {
    "id": 1,
    "user_id": 123,
    "coupon_id": 1,
    "coupon_name": "Welcome Coupon $10 Off",
    "coupon_type": "fixed_amount",
    "coupon_category": "newcomer",
    "discount_value": 10.0,
    "min_amount": 0.0,
    "status": "available",
    "source": "system",
    "obtained_at": "2026-01-05T10:00:00",
    "expires_at": "2026-02-04T10:00:00",
    "used_at": null,
    "appointment_id": null
  }
]
```

##### 4. 领取优惠券

```
POST /api/v1/coupons/claim
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "coupon_id": 1
}
```

**响应**：
```json
{
  "id": 10,
  "coupon_name": "Welcome Coupon $10 Off",
  "status": "available",
  "obtained_at": "2026-01-05T11:00:00",
  "expires_at": "2026-02-04T11:00:00"
}
```

##### 5. 积分兑换优惠券

```
POST /api/v1/coupons/exchange/{coupon_id}
Authorization: Bearer {token}
```

**响应**：
```json
{
  "id": 11,
  "coupon_name": "$5 Off Coupon",
  "status": "available",
  "source": "points",
  "obtained_at": "2026-01-05T11:30:00",
  "expires_at": "2026-02-04T11:30:00",
  "points_spent": 100
}
```

##### 6. 获取优惠券详情

```
GET /api/v1/coupons/{coupon_id}
```

**响应**：
```json
{
  "id": 1,
  "name": "Welcome Coupon $10 Off",
  "description": "New user welcome coupon",
  "type": "fixed_amount",
  "category": "newcomer",
  "discount_value": 10.0,
  "min_amount": 0.0,
  "valid_days": 30,
  "is_active": true
}
```

##### 7. 创建优惠券（管理员）

```
POST /api/v1/coupons/create
Authorization: Bearer {admin_token}
```

**请求体**：
```json
{
  "name": "Summer Sale 20% Off",
  "description": "Summer promotion coupon",
  "type": "percentage",
  "category": "activity",
  "discount_value": 20.0,
  "min_amount": 50.0,
  "max_discount": 20.0,
  "valid_days": 7,
  "is_active": true,
  "total_quantity": 500,
  "points_required": null
}
```

### 核心业务逻辑

#### 1. 积分发放（订单完成时）

```python
def award_points_for_appointment(db: Session, appointment_id: int):
    """订单完成后发放积分"""
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id
    ).first()
    
    if not appointment or appointment.status != 'completed':
        return
    
    # 计算积分：1美金 = 1积分
    points = int(appointment.total_price)
    
    # 获取或创建用户积分记录
    user_points = db.query(UserPoints).filter(
        UserPoints.user_id == appointment.user_id
    ).first()
    
    if not user_points:
        user_points = UserPoints(user_id=appointment.user_id)
        db.add(user_points)
        db.flush()
    
    # 创建积分交易记录
    transaction = PointTransaction(
        user_points_id=user_points.id,
        amount=points,
        type='earn',
        reason='Order completed',
        description=f"Completed appointment #{appointment_id}",
        reference_type='appointment',
        reference_id=appointment_id
    )
    db.add(transaction)
    
    # 更新用户积分
    user_points.total_points += points
    user_points.available_points += points
    
    db.commit()
```

#### 2. 积分兑换优惠券

```python
def exchange_coupon(db: Session, user_id: int, coupon_id: int):
    """使用积分兑换优惠券"""
    # 检查优惠券
    coupon = db.query(Coupon).filter(
        Coupon.id == coupon_id,
        Coupon.is_active == True
    ).first()
    
    if not coupon or not coupon.points_required:
        raise ValueError("Coupon not available for exchange")
    
    # 检查用户积分
    user_points = db.query(UserPoints).filter(
        UserPoints.user_id == user_id
    ).first()
    
    if not user_points or user_points.available_points < coupon.points_required:
        raise ValueError("Insufficient points")
    
    # 扣除积分
    user_points.available_points -= coupon.points_required
    
    # 创建积分消费记录
    transaction = PointTransaction(
        user_points_id=user_points.id,
        amount=-coupon.points_required,
        type='spend',
        reason='Coupon exchange',
        description=f"Exchanged for {coupon.name}",
        reference_type='coupon',
        reference_id=coupon_id
    )
    db.add(transaction)
    
    # 创建用户优惠券
    expires_at = datetime.now() + timedelta(days=coupon.valid_days)
    user_coupon = UserCoupon(
        user_id=user_id,
        coupon_id=coupon_id,
        status='available',
        source='points',
        expires_at=expires_at
    )
    db.add(user_coupon)
    
    # 更新优惠券领取数量
    coupon.claimed_quantity += 1
    
    db.commit()
    return user_coupon
```

#### 3. 优惠券过期检查

```python
def check_and_expire_coupons(db: Session):
    """检查并标记过期优惠券"""
    now = datetime.now()
    
    expired_coupons = db.query(UserCoupon).filter(
        UserCoupon.status == 'available',
        UserCoupon.expires_at < now
    ).all()
    
    for coupon in expired_coupons:
        coupon.status = 'expired'
    
    db.commit()
    return len(expired_coupons)
```

### 前端实现

#### 1. MyPoints页面

**位置**：`frontend/src/components/MyPoints.tsx`

**功能模块**：
- 积分余额显示（可用积分/累计积分）
- 积分明细列表
- 积分兑换入口

**关键代码**：
```typescript
// 获取积分余额
const fetchPointsBalance = async () => {
  const response = await pointsService.getBalance();
  setPointsBalance(response);
};

// 获取积分明细
const fetchTransactions = async () => {
  const response = await pointsService.getTransactions();
  setTransactions(response);
};

// 格式化交易类型
const formatTransactionType = (type: string) => {
  switch (type) {
    case 'earn': return '获得';
    case 'spend': return '消费';
    default: return type;
  }
};

// 格式化积分显示
const formatPoints = (amount: number, type: string) => {
  if (type === 'earn') {
    return `+${amount}`;
  } else {
    return amount.toString();
  }
};
```

#### 2. MyCoupons页面

**位置**：`frontend/src/components/MyCoupons.tsx`

**功能模块**：
- 优惠券列表展示（可用/已使用/已过期）
- 优惠券详情查看
- 积分兑换优惠券
- 领取优惠券

**关键代码**：
```typescript
// 获取我的优惠券
const fetchMyCoupons = async () => {
  const response = await couponsService.getMyCoupons(activeTab);
  setCoupons(response);
};

// 获取可兑换优惠券
const fetchExchangeableCoupons = async () => {
  const response = await couponsService.getExchangeableCoupons();
  setExchangeableCoupons(response);
};

// 兑换优惠券
const handleExchange = async (couponId: number, pointsRequired: number) => {
  if (pointsBalance < pointsRequired) {
    showToast('积分不足！');
    return;
  }
  
  try {
    await couponsService.exchangeCoupon(couponId);
    showToast('兑换成功！');
    fetchMyCoupons();
    fetchPointsBalance();
  } catch (error) {
    showToast('兑换失败：' + error.message);
  }
};

// 计算剩余天数
const getDaysRemaining = (expiresAt: string) => {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
};

// 获取优惠券渐变色
const getCouponGradient = (category: string) => {
  switch (category) {
    case 'newcomer':
      return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    case 'birthday':
      return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    case 'referral':
      return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
    case 'activity':
      return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
    default:
      return 'linear-gradient(135deg, #D4AF37 0%, #C5A028 100%)';
  }
};
```

#### 3. Profile页面集成

**位置**：`frontend/src/components/Profile.tsx`

**功能**：
- 显示积分余额
- 显示可用优惠券数量
- 提供积分和优惠券入口

**关键代码**：
```typescript
// 获取用户统计
const fetchUserStats = async () => {
  try {
    const [points, coupons] = await Promise.all([
      pointsService.getBalance(),
      couponsService.getMyCoupons('available')
    ]);
    
    setPointsBalance(points.available_points);
    setAvailableCoupons(coupons.length);
  } catch (error) {
    console.error('Failed to fetch user stats:', error);
  }
};

// 定期刷新
useEffect(() => {
  fetchUserStats();
  const interval = setInterval(fetchUserStats, 60000); // 每分钟
  return () => clearInterval(interval);
}, []);
```

## UI设计

### 设计风格

- **配色**：黑色背景 + 金色主题（#D4AF37）
- **积分卡片**：金色渐变背景，突出显示积分数量
- **优惠券卡片**：不同分类不同渐变色
  - 新人券：紫蓝渐变（#667eea → #764ba2）
  - 生日券：粉红渐变（#f093fb → #f5576c）
  - 推荐券：青蓝渐变（#4facfe → #00f2fe）
  - 活动券：橙黄渐变（#fa709a → #fee140）
  - 普通券：金色渐变（#D4AF37 → #C5A028）

### 用户体验

- 清晰的视觉层次
- 直观的状态标识（可用/已使用/已过期）
- 快速操作按钮
- 空状态友好提示
- 加载状态显示
- 过期时间倒计时
- 票券样式设计（虚线分隔、圆形缺口）

## 使用流程

### 用户获取积分流程

1. **完成预约订单**
   - 用户完成预约服务
   - 店铺管理员标记订单为"已完成"
   - 系统自动计算积分（订单金额 × 1）

2. **查看积分**
   - 进入个人中心
   - 点击"我的积分"
   - 查看积分余额和明细

### 用户兑换优惠券流程

1. **查看可兑换优惠券**
   - 进入"我的优惠券"页面
   - 点击"兑换优惠券"标签
   - 查看可兑换的优惠券列表

2. **兑换优惠券**
   - 选择想要兑换的优惠券
   - 确认所需积分
   - 点击"兑换"按钮
   - 系统扣除积分，发放优惠券

3. **使用优惠券**
   - 在"我的优惠券"中查看可用优惠券
   - 预约时选择优惠券
   - 系统自动计算优惠后价格

### 用户领取优惠券流程

1. **查看可领取优惠券**
   - 系统推送优惠券通知
   - 或在优惠券页面查看

2. **领取优惠券**
   - 点击"立即领取"
   - 系统检查库存和领取条件
   - 领取成功后显示在"我的优惠券"中

## 业务场景示例

### 场景1：新用户注册领取优惠券

**流程**：
1. 用户完成注册
2. 系统自动发放新人优惠券（$10 Off）
3. 用户在"我的优惠券"中查看
4. 首次预约时使用优惠券

### 场景2：完成订单获得积分

**流程**：
1. 用户预约并完成服务（订单金额$50）
2. 店铺管理员标记订单为"已完成"
3. 系统调用`award_points_for_appointment()`
4. 自动发放50积分
5. 用户收到积分到账通知
6. 用户在"我的积分"中查看余额和明细

### 场景3：积分兑换优惠券

**流程**：
1. 用户累积了200积分
2. 进入"我的优惠券" → "兑换优惠券"
3. 查看可兑换列表（100积分 = $5优惠券）
4. 点击兑换，系统检查积分余额
5. 消费100积分，获得$5优惠券
6. 优惠券有效期30天
7. 下次预约时可使用

### 场景4：推荐好友获得优惠券

**流程**：
1. 用户分享推荐码给好友
2. 好友注册成功
3. 系统自动发放$10优惠券给双方
4. 优惠券显示在"我的优惠券"中
5. 来源标记为"推荐好友"

### 场景5：优惠券过期

**流程**：
1. 用户领取优惠券（有效期30天）
2. 30天内未使用
3. 系统定时任务检查过期优惠券
4. 自动标记为"已过期"
5. 在"已过期"标签中显示

## 配置说明

### 积分规则配置

在`points_service.py`或配置文件中设置：

```python
# 积分获取比例
POINTS_PER_DOLLAR = 1

# 积分兑换比例
POINTS_FOR_5_DOLLAR_COUPON = 100
```

### 优惠券模板配置

通过管理员API创建优惠券模板：

```python
# 固定金额券示例
{
    "name": "$10 Off Coupon",
    "description": "Get $10 off your next purchase",
    "type": "fixed_amount",
    "category": "normal",
    "discount_value": 10.0,
    "min_amount": 0.0,
    "valid_days": 30,
    "is_active": true,
    "total_quantity": 1000,
    "points_required": 200
}

# 百分比券示例
{
    "name": "20% Off Coupon",
    "description": "Get 20% off (up to $20)",
    "type": "percentage",
    "category": "activity",
    "discount_value": 20.0,
    "min_amount": 50.0,
    "max_discount": 20.0,
    "valid_days": 7,
    "is_active": true,
    "total_quantity": 500,
    "points_required": null
}
```

### 过期检查配置

在`scheduler.py`中配置定时任务：

```python
# 每天凌晨1点检查过期优惠券
scheduler.add_job(
    check_and_expire_coupons,
    CronTrigger(hour=1, minute=0),
    id='expire_coupons',
    replace_existing=True
)
```

## 测试结果

### 测试环境

- 后端：FastAPI + SQLAlchemy + MySQL
- 前端：React + TypeScript + Ionic
- 测试工具：Pytest + TestClient

### 测试用例

#### 1. 积分发放测试
✅ **通过** - 订单完成后正确发放积分

#### 2. 积分查询测试
✅ **通过** - 积分余额和明细查询准确

#### 3. 积分兑换测试
✅ **通过** - 积分兑换优惠券成功，积分正确扣除

#### 4. 优惠券领取测试
✅ **通过** - 优惠券领取成功，库存正确减少

#### 5. 优惠券使用测试
✅ **通过** - 优惠券使用后状态更新为"已使用"

#### 6. 优惠券过期测试
✅ **通过** - 过期优惠券自动标记为"已过期"

#### 7. 前端展示测试
✅ **通过** - 积分和优惠券列表正确展示，UI美观

### 测试脚本

单元测试位于：`/backend/tests/test_points_coupons.py`

运行测试：
```bash
cd /home/ubuntu/FigmaFrontend/backend
pytest tests/test_points_coupons.py -v
```

## 注意事项

### 1. 积分安全

- 积分只能通过订单完成获得，不能手动修改
- 积分兑换时检查余额，防止负数
- 积分明细完整记录，可追溯
- 使用数据库事务保证数据一致性

### 2. 优惠券限制

- 优惠券有数量限制，领取时检查库存
- 优惠券有有效期，过期自动失效
- 优惠券使用时检查状态和有效期
- 一个订单只能使用一张优惠券
- 优惠券不可转赠（绑定用户ID）

### 3. 性能优化

- 使用索引优化查询（user_id, status, expires_at）
- 积分余额冗余存储，避免频繁计算
- 优惠券过期检查使用定时任务，避免实时查询
- 考虑使用缓存存储热点数据

### 4. 扩展性

- 优惠券类型和分类可以扩展
- 积分规则可以配置化
- 支持多种优惠券来源
- 可以添加积分过期规则
- 可以添加积分等级制度

## 系统架构

```
订单完成
    ↓
积分发放服务 (points_service.py)
    ↓
创建积分记录 + 更新用户积分
    ↓
用户查看积分余额和明细

用户兑换优惠券
    ↓
优惠券服务 (coupons_service.py)
    ↓
检查积分余额 + 扣除积分
    ↓
创建用户优惠券 + 设置过期时间

定时任务
    ↓
检查过期优惠券
    ↓
标记为已过期
```

## 未来优化

### 1. 功能扩展

- [ ] 积分商城（更多兑换选项）
- [ ] 积分转赠（好友之间）
- [ ] 优惠券组合使用
- [ ] 优惠券分享
- [ ] 积分等级制度
- [ ] 会员专属优惠券
- [ ] 限时优惠券
- [ ] 优惠券抽奖
- [ ] 签到获得积分
- [ ] 评价获得积分

### 2. 性能优化

- [ ] 积分缓存（Redis）
- [ ] 优惠券库存缓存
- [ ] 异步积分发放
- [ ] 批量过期检查优化
- [ ] 数据库分区

### 3. 用户体验

- [ ] 积分获取动画
- [ ] 优惠券使用提醒
- [ ] 过期提醒通知
- [ ] 积分兑换推荐
- [ ] 优惠券使用指南
- [ ] 积分排行榜
- [ ] 优惠券使用预览

### 4. 营销功能

- [ ] 优惠券活动管理
- [ ] 定向发放优惠券
- [ ] 优惠券使用分析
- [ ] 积分营销活动
- [ ] 优惠券推送通知
- [ ] A/B测试支持

## 相关文档

- [推荐好友系统文档](./REFERRAL_SYSTEM.md)
- [通知系统文档](./NOTIFICATION_SYSTEM.md)
- [预约管理系统文档](./APPOINTMENT_SYSTEM.md)
- [API接口文档](./API_DOCUMENTATION.md)

## 更新日志

### 2026-01-05
- ✅ 完成积分系统后端开发
- ✅ 完成优惠券系统后端开发
- ✅ 完成前端积分和优惠券页面
- ✅ 完成UI设计（金色主题+渐变卡片）
- ✅ 完成功能测试
- ✅ 编写完整系统文档

---

**文档版本**: 1.0  
**最后更新**: 2026-01-05  
**维护者**: Manus AI
