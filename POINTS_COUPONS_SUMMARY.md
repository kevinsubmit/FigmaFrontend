# 积分和优惠券系统

## 📋 系统概述

完整的积分和优惠券管理系统,支持用户通过消费获得积分,使用积分兑换优惠券,以及优惠券的管理和使用。

---

## ✨ 核心功能

### 1. 积分系统

**积分获取规则**:
- 消费1美金 = 1积分
- 订单完成后自动发放积分

**积分使用**:
- 100积分 = 5美金优惠券
- 积分无有效期

**积分管理**:
- 积分余额查询
- 积分明细记录(获取/消费)
- 积分交易历史

### 2. 优惠券系统

**优惠券类型**:
1. **固定金额券** (Fixed Amount)
   - 普通券 (Normal)
   - 新人券 (Newcomer)
   - 生日券 (Birthday)
   
2. **折扣券** (Percentage)
   - 百分比折扣

**优惠券来源**:
- 系统发放 (System)
- 积分兑换 (Points)
- 推荐好友 (Referral)
- 活动赠送 (Activity)

**优惠券管理**:
- 优惠券列表(可用/已使用/已过期)
- 优惠券详情查看
- 自动过期检查
- 使用条件验证

---

## 🗄️ 数据库结构

### 1. user_points (用户积分表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| user_id | INTEGER | 用户ID(外键) |
| total_points | INTEGER | 累计获得积分 |
| available_points | INTEGER | 可用积分 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 2. point_transactions (积分明细表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| user_points_id | INTEGER | 用户积分ID(外键) |
| amount | INTEGER | 积分数量(正数=获得,负数=消费) |
| type | ENUM | 类型(earn/spend) |
| reason | VARCHAR(255) | 原因 |
| description | TEXT | 详细描述 |
| reference_type | VARCHAR(50) | 关联类型 |
| reference_id | INTEGER | 关联ID |
| created_at | DATETIME | 创建时间 |

### 3. coupons (优惠券模板表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| name | VARCHAR(255) | 优惠券名称 |
| description | TEXT | 描述 |
| type | ENUM | 类型(fixed_amount/percentage) |
| category | ENUM | 分类(normal/newcomer/birthday/referral/activity) |
| discount_value | FLOAT | 折扣值($5或10%) |
| min_amount | FLOAT | 最低消费金额 |
| max_discount | FLOAT | 最大折扣金额(百分比券) |
| valid_days | INTEGER | 有效天数 |
| is_active | BOOLEAN | 是否激活 |
| total_quantity | INTEGER | 总数量(null=无限) |
| claimed_quantity | INTEGER | 已领取数量 |
| points_required | INTEGER | 兑换所需积分(null=不可兑换) |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 4. user_coupons (用户优惠券表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| user_id | INTEGER | 用户ID(外键) |
| coupon_id | INTEGER | 优惠券ID(外键) |
| status | ENUM | 状态(available/used/expired) |
| source | VARCHAR(50) | 来源 |
| obtained_at | DATETIME | 获得时间 |
| expires_at | DATETIME | 过期时间 |
| used_at | DATETIME | 使用时间 |
| appointment_id | INTEGER | 使用的预约ID |

---

## 🔌 API端点

### 积分相关

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/points/balance` | 认证 | 获取积分余额 |
| GET | `/api/v1/points/transactions` | 认证 | 获取积分明细 |
| POST | `/api/v1/points/test-award` | 认证 | 测试发放积分 |

### 优惠券相关

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/coupons/available` | 公开 | 获取可用优惠券 |
| GET | `/api/v1/coupons/exchangeable` | 公开 | 获取可兑换优惠券 |
| GET | `/api/v1/coupons/my-coupons` | 认证 | 获取我的优惠券 |
| POST | `/api/v1/coupons/claim` | 认证 | 领取优惠券 |
| POST | `/api/v1/coupons/exchange/{coupon_id}` | 认证 | 积分兑换优惠券 |
| POST | `/api/v1/coupons/create` | 管理员 | 创建优惠券模板 |
| GET | `/api/v1/coupons/{coupon_id}` | 公开 | 获取优惠券详情 |

---

## 💻 前端组件

### 1. MyPoints 页面

**功能**:
- 显示积分余额(可用/累计)
- 显示积分明细列表
- 交易历史(获得/消费)
- 跳转到优惠券兑换

**路由**: `/my-points`

### 2. MyCoupons 页面

**功能**:
- 3个标签页(可用/已使用/已过期)
- 优惠券卡片展示
- 显示优惠券详情
- 使用按钮(可用券)
- 状态标识

**路由**: `/my-coupons`

### 3. 服务层

**points.service.ts**:
- `getBalance()` - 获取积分余额
- `getTransactions()` - 获取积分明细
- `testAwardPoints()` - 测试发放积分

**coupons.service.ts**:
- `getAvailableCoupons()` - 获取可用优惠券
- `getExchangeableCoupons()` - 获取可兑换优惠券
- `getMyCoupons()` - 获取我的优惠券
- `claimCoupon()` - 领取优惠券
- `exchangeCoupon()` - 积分兑换优惠券
- `getCouponDetails()` - 获取优惠券详情

---

## 🔄 业务流程

### 积分获取流程

```
1. 用户完成预约并支付
2. 系统计算消费金额
3. 按1美金=1积分计算
4. 调用 award_points_for_appointment()
5. 创建积分交易记录
6. 更新用户积分余额
7. 发送通知(可选)
```

### 积分兑换优惠券流程

```
1. 用户选择可兑换优惠券
2. 检查用户积分是否足够
3. 扣除所需积分
4. 创建用户优惠券记录
5. 计算过期时间
6. 更新优惠券领取数量
7. 返回用户优惠券信息
```

### 优惠券使用流程

```
1. 用户在预约时选择优惠券
2. 验证优惠券状态(可用)
3. 验证优惠券是否过期
4. 验证最低消费金额
5. 计算折扣金额
6. 标记优惠券为已使用
7. 关联预约ID
8. 更新使用时间
```

---

## 🎨 UI设计

### MyPoints 页面
- **配色**: 金色渐变背景(#D4AF37)
- **布局**: 顶部余额卡片 + 交易历史列表
- **图标**: 绿色(获得) / 红色(消费)
- **动画**: 淡入效果

### MyCoupons 页面
- **配色**: 根据分类不同渐变色
  - 新人券: 紫蓝渐变
  - 生日券: 粉红渐变
  - 推荐券: 绿青渐变
  - 活动券: 橙黄渐变
  - 普通券: 金色渐变
- **布局**: 优惠券卡片(左侧折扣+右侧过期时间)
- **装饰**: 虚线分隔 + 圆形缺口 + 票券图标

---

## 🔐 安全考虑

1. **积分操作**: 所有积分操作需要认证
2. **优惠券兑换**: 验证用户积分余额
3. **优惠券使用**: 验证所有权和状态
4. **数据库事务**: 使用事务保证数据一致性
5. **防止重复**: 优惠券使用后不可再次使用

---

## 📊 统计和监控

**可统计的数据**:
- 用户积分分布
- 积分获取/消费趋势
- 优惠券领取率
- 优惠券使用率
- 过期优惠券比例
- 热门优惠券排行

---

## 🚀 未来优化

1. **积分系统**:
   - 签到获得积分
   - 评价获得积分
   - 推荐好友获得积分
   - 积分等级制度

2. **优惠券系统**:
   - 优惠券分享功能
   - 优惠券组合使用
   - 限时优惠券
   - 地理位置限制

3. **管理后台**:
   - 批量发放优惠券
   - 优惠券使用统计
   - 积分调整工具
   - 用户积分排行榜

4. **通知系统**:
   - 积分获得通知
   - 优惠券即将过期提醒
   - 新优惠券上线通知

---

## 📝 使用说明

### 用户端

**查看积分**:
1. 进入Profile页面
2. 点击"My Points"
3. 查看积分余额和明细

**兑换优惠券**:
1. 进入MyPoints页面
2. 点击"Exchange for Coupons"
3. 选择想要的优惠券
4. 确认兑换

**使用优惠券**:
1. 进入MyCoupons页面
2. 查看可用优惠券
3. 在预约时选择优惠券
4. 系统自动计算折扣

### 管理员端

**创建优惠券**:
```bash
POST /api/v1/coupons/create
{
  "name": "New Year Special",
  "description": "$10 off for new year",
  "type": "fixed_amount",
  "category": "activity",
  "discount_value": 10.0,
  "min_amount": 50.0,
  "valid_days": 30,
  "is_active": true,
  "total_quantity": 1000,
  "points_required": 100
}
```

---

## 🐛 故障排查

**问题**: 积分未到账
- 检查订单状态是否为"completed"
- 查看point_transactions表
- 检查后端日志

**问题**: 优惠券无法使用
- 检查优惠券状态(available)
- 检查是否过期
- 检查最低消费金额

**问题**: 积分兑换失败
- 检查积分余额是否足够
- 检查优惠券是否还有库存
- 检查优惠券是否激活

---

## ✅ 测试清单

- [x] 积分获取(订单完成)
- [x] 积分查询
- [x] 积分明细
- [x] 积分兑换优惠券
- [x] 优惠券列表
- [x] 领取优惠券
- [x] 我的优惠券
- [x] 优惠券使用
- [x] 优惠券过期检查
- [x] 前端页面展示
- [x] API集成测试

---

## 📄 相关文件

**后端**:
- `app/models/user_points.py`
- `app/models/point_transaction.py`
- `app/models/coupon.py`
- `app/models/user_coupon.py`
- `app/schemas/points.py`
- `app/schemas/coupons.py`
- `app/crud/points.py`
- `app/crud/coupons.py`
- `app/api/v1/endpoints/points.py`
- `app/api/v1/endpoints/coupons.py`

**前端**:
- `frontend/src/services/points.service.ts`
- `frontend/src/services/coupons.service.ts`
- `frontend/src/components/MyPoints.tsx`
- `frontend/src/components/MyCoupons.tsx`

**测试**:
- `backend/test_points_coupons.py`

---

**开发完成时间**: 2025-01-04
**版本**: 1.0.0
