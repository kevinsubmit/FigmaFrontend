# API接口文档

## 概述

本文档提供美甲预约平台的完整API接口说明，包括认证、用户管理、店铺管理、预约管理、积分优惠券、通知、推荐等所有功能模块的API端点。

## 基本信息

### 基础URL

```
开发环境: http://localhost:8000
生产环境: https://api.yourdomain.com
```

### 认证方式

所有需要认证的API使用JWT Bearer Token认证：

```
Authorization: Bearer {access_token}
```

### 响应格式

所有API响应均为JSON格式：

**成功响应**：
```json
{
  "data": {...},
  "message": "Success"
}
```

**错误响应**：
```json
{
  "detail": "Error message"
}
```

### HTTP状态码

| 状态码 | 说明 |
|-------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 204 | 删除成功（无内容） |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

## API模块

### 1. 认证模块 (Auth)

#### 1.1 发送验证码

```
POST /api/v1/auth/send-verification-code
```

**请求体**：
```json
{
  "phone": "1234567890",
  "purpose": "register"
}
```

**响应**：
```json
{
  "message": "Verification code sent successfully"
}
```

#### 1.2 用户注册

```
POST /api/v1/auth/register
```

**请求体**：
```json
{
  "phone": "1234567890",
  "username": "John Doe",
  "password": "password123",
  "verification_code": "123456",
  "referral_code": "ABC123"
}
```

**响应**：
```json
{
  "id": 1,
  "phone": "1234567890",
  "username": "John Doe",
  "email": null,
  "is_active": true,
  "created_at": "2026-01-05T10:00:00"
}
```

#### 1.3 用户登录

```
POST /api/v1/auth/login
```

**请求体**：
```json
{
  "phone": "1234567890",
  "password": "password123"
}
```

**响应**：
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "phone": "1234567890",
    "username": "John Doe"
  }
}
```

#### 1.4 获取当前用户信息

```
GET /api/v1/auth/me
Authorization: Bearer {token}
```

**响应**：
```json
{
  "id": 1,
  "phone": "1234567890",
  "username": "John Doe",
  "email": "john@example.com",
  "is_active": true,
  "created_at": "2026-01-05T10:00:00"
}
```

#### 1.5 上传头像

```
POST /api/v1/auth/me/avatar
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**请求体**：
- `file`: 图片文件（jpg/png/webp，<=5MB）

### 2. 用户模块 (Users)

#### 2.1 获取用户列表

```
GET /api/v1/users/
Authorization: Bearer {admin_token}
```

**查询参数**：
- `skip`: 跳过的记录数（默认0）
- `limit`: 返回的记录数（默认100）

#### 2.2 获取用户详情

```
GET /api/v1/users/{user_id}
Authorization: Bearer {token}
```

#### 2.3 更新用户信息

```
PUT /api/v1/users/{user_id}
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "username": "New Name",
  "email": "newemail@example.com"
}
```

### 3. 店铺模块 (Stores)

#### 3.1 获取店铺列表

```
GET /api/v1/stores/
```

**查询参数**：
- `skip`: 跳过的记录数（默认0）
- `limit`: 返回的记录数（默认100）
- `search`: 搜索关键词（可选）

**响应**：
```json
[
  {
    "id": 1,
    "name": "Nail Salon",
    "address": "123 Main St",
    "phone": "1234567890",
    "rating": 4.5,
    "review_count": 120,
    "latitude": 40.7128,
    "longitude": -74.0060,
    "created_at": "2026-01-01T00:00:00"
  }
]
```

#### 3.2 获取店铺详情

```
GET /api/v1/stores/{store_id}
```

**响应**：
```json
{
  "id": 1,
  "name": "Nail Salon",
  "description": "Best nail salon in town",
  "address": "123 Main St",
  "phone": "1234567890",
  "email": "info@nailsalon.com",
  "rating": 4.5,
  "review_count": 120,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "hours": [...],
  "services": [...],
  "portfolio": [...],
  "created_at": "2026-01-01T00:00:00"
}
```

#### 3.3 创建店铺

```
POST /api/v1/stores/
Authorization: Bearer {admin_token}
```

**请求体**：
```json
{
  "name": "New Nail Salon",
  "description": "Description",
  "address": "456 Oak St",
  "phone": "0987654321",
  "email": "info@newsalon.com",
  "latitude": 40.7589,
  "longitude": -73.9851
}
```

#### 3.4 更新店铺信息

```
PUT /api/v1/stores/{store_id}
Authorization: Bearer {admin_token}
```

#### 3.5 删除店铺

```
DELETE /api/v1/stores/{store_id}
Authorization: Bearer {admin_token}
```

### 4. 服务模块 (Services)

#### 4.1 获取服务列表

```
GET /api/v1/services/
```

**查询参数**：
- `store_id`: 店铺ID（可选）
- `skip`: 跳过的记录数（默认0）
- `limit`: 返回的记录数（默认100）

**响应**：
```json
[
  {
    "id": 1,
    "store_id": 1,
    "name": "Manicure",
    "description": "Basic manicure service",
    "price": 25.00,
    "duration": 30,
    "is_active": true,
    "created_at": "2026-01-01T00:00:00"
  }
]
```

#### 4.2 获取服务详情

```
GET /api/v1/services/{service_id}
```

#### 4.3 创建服务

```
POST /api/v1/services/
Authorization: Bearer {admin_token}
```

**请求体**：
```json
{
  "store_id": 1,
  "name": "Pedicure",
  "description": "Relaxing pedicure service",
  "price": 35.00,
  "duration": 45,
  "is_active": true
}
```

### 5. 预约模块 (Appointments)

#### 5.1 创建预约

```
POST /api/v1/appointments/
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "store_id": 1,
  "service_id": 1,
  "technician_id": 1,
  "appointment_date": "2026-01-10",
  "appointment_time": "14:00:00",
  "notes": "Please use gentle products"
}
```

**响应**：
```json
{
  "id": 1,
  "order_number": "ORD260105000001",
  "user_id": 123,
  "store_id": 1,
  "service_id": 1,
  "technician_id": 1,
  "appointment_date": "2026-01-10",
  "appointment_time": "14:00:00",
  "status": "pending",
  "notes": "Please use gentle products",
  "created_at": "2026-01-05T10:00:00"
}
```

#### 5.2 获取我的预约列表

```
GET /api/v1/appointments/
Authorization: Bearer {token}
```

**查询参数**：
- `skip`: 跳过的记录数（默认0）
- `limit`: 返回的记录数（默认100）

**响应（包含店铺与服务摘要）**：
```json
[
  {
    "id": 1,
    "order_number": "ORD260105000001",
    "store_id": 1,
    "service_id": 1,
    "appointment_date": "2026-01-10",
    "appointment_time": "14:00:00",
    "status": "pending",
    "store_name": "Gilded Tips Studio",
    "service_name": "Luxury Pedicure",
    "service_price": 70.0,
    "service_duration": 70
  }
]
```

#### 5.3 获取预约详情

```
GET /api/v1/appointments/{appointment_id}
Authorization: Bearer {token}
```

#### 5.4 改期预约

```
POST /api/v1/appointments/{appointment_id}/reschedule
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "new_date": "2026-01-12",
  "new_time": "15:30:00"
}
```

#### 5.5 取消预约

```
POST /api/v1/appointments/{appointment_id}/cancel
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "cancel_reason": "Schedule conflict"
}
```

#### 5.6 更新预约备注

```
PATCH /api/v1/appointments/{appointment_id}/notes
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "notes": "Please use gentle products"
}
```

#### 5.7 确认预约（门店管理员）

```
PATCH /api/v1/appointments/{appointment_id}/confirm
Authorization: Bearer {admin_token}
```

#### 5.8 完成预约（门店管理员）

```
PATCH /api/v1/appointments/{appointment_id}/complete
Authorization: Bearer {admin_token}
```

**请求体（可选）**：
```json
{
  "user_coupon_id": 123
}
```

### 6. 积分模块 (Points)

#### 6.1 获取积分余额

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

#### 6.2 获取积分明细

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
    "amount": 50,
    "type": "earn",
    "reason": "Order completed",
    "description": "Completed appointment #456",
    "created_at": "2026-01-05T10:30:00"
  }
]
```

### 7. 优惠券模块 (Coupons)

#### 7.1 获取可领取优惠券列表

```
GET /api/v1/coupons/available
```

#### 7.2 获取可兑换优惠券列表

```
GET /api/v1/coupons/exchangeable
```

#### 7.3 获取我的优惠券

```
GET /api/v1/coupons/my-coupons
Authorization: Bearer {token}
```

**查询参数**：
- `status`: 状态筛选（available/used/expired）

#### 7.4 领取优惠券

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

#### 7.4.1 管理员发券（按手机号）

```
POST /api/v1/coupons/grant
Authorization: Bearer {admin_token}
```

**请求体**：
```json
{
  "phone": "4151234567",
  "coupon_id": 1
}
```

#### 7.5 积分兑换优惠券

```
POST /api/v1/coupons/exchange/{coupon_id}
Authorization: Bearer {token}
```

#### 7.6 获取优惠券详情

```
GET /api/v1/coupons/{coupon_id}
```

### 8. 礼品卡模块 (Gift Cards)

#### 8.1 获取礼品卡汇总

```
GET /api/v1/gift-cards/summary
Authorization: Bearer {token}
```

#### 8.2 获取我的礼品卡列表

```
GET /api/v1/gift-cards/my-cards
Authorization: Bearer {token}
```

#### 8.3 购买礼品卡（可赠送）

```
POST /api/v1/gift-cards/purchase
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "amount": 50,
  "recipient_phone": "4151234567",
  "message": "Enjoy your nails!"
}
```

**说明**：
- `recipient_phone` 为空表示购买给自己。
- 默认赠送领取有效期 30 天，未领取可撤销。

#### 8.4 领取礼品卡

```
POST /api/v1/gift-cards/claim
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "claim_code": "GC8D9K2A3"
}
```

#### 8.5 撤销赠送（未领取）

```
POST /api/v1/gift-cards/{gift_card_id}/revoke
Authorization: Bearer {token}
```

#### 8.6 赠送已有礼品卡（整卡）

```
POST /api/v1/gift-cards/{gift_card_id}/transfer
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "recipient_phone": "4151234567",
  "message": "Enjoy your nails!"
}
```

#### 8.7 查询赠送状态

```
GET /api/v1/gift-cards/{gift_card_id}/transfer-status
Authorization: Bearer {token}
```

### 9. 通知模块 (Notifications)

**通知类型**：
- `appointment_created`：用户创建预约（通知门店管理员）
- `appointment_confirmed`：门店确认预约（通知用户）
- `appointment_cancelled`：取消预约（按取消方通知对应用户/门店管理员）
- `appointment_completed`：预约完成（通知用户）
- `appointment_reminder`：预约提醒（24h/1h，通知用户）
- `coupon_granted`：管理员发券（通知用户）
- `points_earned`：积分到账（订单完成后通知用户）
- `gift_card_sent`：礼品卡赠送成功（通知发送者）
- `gift_card_received`：礼品卡收到/领取（通知接收者）
- `gift_card_claimed`：礼品卡被领取（通知发送者）
- `gift_card_expiring`：礼品卡即将过期（pending_transfer 且 48h 内，通知发送者）

#### 8.1 获取通知列表

```
GET /api/v1/notifications/
Authorization: Bearer {token}
```

**查询参数**：
- `skip`: 跳过的记录数（默认0）
- `limit`: 返回的记录数（默认100）
- `unread_only`: 只返回未读（true/false）

#### 8.2 获取未读通知数量

```
GET /api/v1/notifications/unread-count
Authorization: Bearer {token}
```

**响应**：
```json
{
  "unread_count": 5
}
```

#### 8.3 标记通知为已读

```
PATCH /api/v1/notifications/{notification_id}/read
Authorization: Bearer {token}
```

#### 8.4 标记所有通知为已读

```
POST /api/v1/notifications/mark-all-read
Authorization: Bearer {token}
```

#### 8.5 删除通知

```
DELETE /api/v1/notifications/{notification_id}
Authorization: Bearer {token}
```

### 10. 推荐模块 (Referrals)

#### 9.1 获取我的推荐码

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

#### 9.2 获取推荐统计

```
GET /api/v1/referrals/stats
Authorization: Bearer {token}
```

**响应**：
```json
{
  "total_referrals": 10,
  "successful_referrals": 8,
  "total_rewards": 80.00
}
```

#### 9.3 获取推荐列表

```
GET /api/v1/referrals/list
Authorization: Bearer {token}
```

**查询参数**：
- `skip`: 跳过的记录数（默认0）
- `limit`: 返回的记录数（默认100）

**响应**：
```json
[
  {
    "id": 1,
    "referred_user_id": 456,
    "referred_username": "Jane Doe",
    "status": "rewarded",
    "reward_amount": 10.00,
    "created_at": "2026-01-05T10:00:00"
  }
]
```

### 11. 评价模块 (Reviews)

#### 10.1 创建评价

```
POST /api/v1/reviews/
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "store_id": 1,
  "appointment_id": 123,
  "rating": 5,
  "comment": "Excellent service!",
  "images": ["url1", "url2"]
}
```

#### 10.2 获取店铺评价列表

```
GET /api/v1/reviews/store/{store_id}
```

**查询参数**：
- `skip`: 跳过的记录数（默认0）
- `limit`: 返回的记录数（默认20）

#### 10.3 获取我的评价列表

```
GET /api/v1/reviews/my-reviews
Authorization: Bearer {token}
```

#### 10.4 更新评价

```
PUT /api/v1/reviews/{review_id}
Authorization: Bearer {token}
```

#### 10.5 删除评价

```
DELETE /api/v1/reviews/{review_id}
Authorization: Bearer {token}
```

### 12. 店铺营业时间模块 (Store Hours)

#### 11.1 获取店铺营业时间

```
GET /api/v1/store-hours/store/{store_id}
```

**响应**：
```json
[
  {
    "id": 1,
    "store_id": 1,
    "day_of_week": 1,
    "open_time": "09:00:00",
    "close_time": "18:00:00",
    "is_closed": false
  }
]
```

#### 11.2 设置店铺营业时间

```
POST /api/v1/store-hours/
Authorization: Bearer {admin_token}
```

**请求体**：
```json
{
  "store_id": 1,
  "day_of_week": 1,
  "open_time": "09:00:00",
  "close_time": "18:00:00",
  "is_closed": false
}
```

### 13. 店铺节假日模块 (Store Holidays)

#### 12.1 获取店铺节假日列表

```
GET /api/v1/store-holidays/store/{store_id}
```

**响应**：
```json
[
  {
    "id": 1,
    "store_id": 1,
    "holiday_date": "2026-01-01",
    "reason": "New Year's Day",
    "is_closed": true
  }
]
```

#### 12.2 创建节假日

```
POST /api/v1/store-holidays/
Authorization: Bearer {admin_token}
```

**请求体**：
```json
{
  "store_id": 1,
  "holiday_date": "2026-12-25",
  "reason": "Christmas",
  "is_closed": true
}
```

### 14. 店铺作品集模块 (Store Portfolio)

#### 13.1 获取店铺作品集

```
GET /api/v1/store-portfolio/store/{store_id}
```

**响应**：
```json
[
  {
    "id": 1,
    "store_id": 1,
    "image_url": "https://example.com/image1.jpg",
    "title": "French Manicure",
    "description": "Classic french manicure style",
    "created_at": "2026-01-01T00:00:00"
  }
]
```

#### 13.2 上传作品

```
POST /api/v1/store-portfolio/
Authorization: Bearer {admin_token}
```

**请求体**：
```json
{
  "store_id": 1,
  "image_url": "https://example.com/new-image.jpg",
  "title": "Gel Nails",
  "description": "Beautiful gel nail design"
}
```

#### 13.3 删除作品

```
DELETE /api/v1/store-portfolio/{portfolio_id}
Authorization: Bearer {admin_token}
```

### 15. 技师模块 (Technicians)

#### 14.1 获取店铺技师列表

```
GET /api/v1/technicians?store_id={store_id}
```

**响应**：
```json
[
  {
    "id": 1,
    "store_id": 1,
    "name": "Alice Smith",
    "specialties": "Manicure, Pedicure",
    "rating": 4.8,
    "created_at": "2026-01-01T00:00:00"
  }
]
```

#### 14.2 获取技师详情

```
GET /api/v1/technicians/{technician_id}
```

#### 14.3 获取技师可用时段

```
GET /api/v1/technicians/{technician_id}/available-slots?date=YYYY-MM-DD&service_id=1
```

**响应**：
```json
[
  {
    "start_time": "10:00",
    "end_time": "11:10",
    "duration_minutes": 70
  }
]
```

#### 14.3 创建技师

```
POST /api/v1/technicians/
Authorization: Bearer {admin_token}
```

**请求体**：
```json
{
  "store_id": 1,
  "name": "Bob Johnson",
  "specialty": "Nail Art",
  "is_active": true
}
```

### 16. Pin内容模块 (Pins)

#### 15.1 获取Pin列表

```
GET /api/v1/pins?skip=0&limit=20&tag=French&search=gold
```

#### 15.2 获取Pin详情

```
GET /api/v1/pins/{pin_id}
```

#### 15.3 收藏Pin

```
POST /api/v1/pins/{pin_id}/favorite
Authorization: Bearer {token}
```

#### 15.4 取消收藏Pin

```
DELETE /api/v1/pins/{pin_id}/favorite
Authorization: Bearer {token}
```

#### 15.5 判断Pin是否收藏

```
GET /api/v1/pins/{pin_id}/is-favorited
Authorization: Bearer {token}
```

#### 15.6 获取我的收藏Pin

```
GET /api/v1/pins/favorites/my-favorites
Authorization: Bearer {token}
```

#### 15.7 获取收藏Pin数量

```
GET /api/v1/pins/favorites/count
Authorization: Bearer {token}
```

### 17. 文件上传模块 (Upload)

#### 15.1 上传文件

```
POST /api/v1/upload/
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**请求体**：
```
file: <binary_file_data>
```

**响应**：
```json
{
  "url": "https://storage.example.com/files/abc123.jpg",
  "filename": "image.jpg",
  "size": 102400
}
```

### 18. 促销活动模块 (Promotions)

#### 18.1 获取促销列表

```
GET /api/v1/promotions?skip=0&limit=50&store_id=1&scope=store&active_only=true&include_platform=true
```

#### 18.2 获取促销详情

```
GET /api/v1/promotions/{promotion_id}
```

#### 18.3 创建促销（管理员）

```
POST /api/v1/promotions/
Authorization: Bearer {admin_token}
```

**请求体**：
```json
{
  "scope": "store",
  "store_id": 1,
  "title": "Holiday Deals",
  "type": "holiday",
  "discount_type": "percentage",
  "discount_value": 20,
  "rules": "Valid for select services",
  "start_at": "2026-11-20T00:00:00Z",
  "end_at": "2026-11-30T23:59:59Z",
  "is_active": true,
  "service_rules": [
    {
      "service_id": 3,
      "min_price": 30,
      "max_price": 120
    }
  ]
}
```

#### 18.4 更新促销（管理员）

```
PUT /api/v1/promotions/{promotion_id}
Authorization: Bearer {admin_token}
```

**请求体（示例）**：
```json
{
  "title": "Holiday Deals - Updated",
  "discount_value": 25,
  "service_rules": [
    {
      "service_id": 3,
      "min_price": 40,
      "max_price": 150
    }
  ]
}
```

## 错误处理

### 常见错误码

| 错误码 | 说明 | 示例 |
|-------|------|------|
| 400 | 请求参数错误 | 缺少必填字段、格式错误 |
| 401 | 未认证 | Token无效或过期 |
| 403 | 无权限 | 非管理员访问管理接口 |
| 404 | 资源不存在 | 用户ID不存在 |
| 409 | 冲突 | 手机号已注册 |
| 422 | 验证错误 | 数据验证失败 |
| 500 | 服务器错误 | 内部错误 |

### 错误响应示例

```json
{
  "detail": "User not found"
}
```

```json
{
  "detail": [
    {
      "loc": ["body", "phone"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

## 分页

所有列表API支持分页，使用以下查询参数：

- `skip`: 跳过的记录数（默认0）
- `limit`: 返回的记录数（默认值因接口而异）

**示例**：
```
GET /api/v1/stores/?skip=20&limit=10
```

## 搜索和筛选

部分API支持搜索和筛选：

**店铺搜索**：
```
GET /api/v1/stores/?search=nail
```

**预约状态筛选**：
```
GET /api/v1/appointments/my-appointments?status=confirmed
```

**优惠券状态筛选**：
```
GET /api/v1/coupons/my-coupons?status=available
```

## 速率限制

为保护API服务，实施以下速率限制：

| 端点类型 | 限制 |
|---------|------|
| 认证端点 | 10次/分钟 |
| 读取端点 | 100次/分钟 |
| 写入端点 | 30次/分钟 |
| 上传端点 | 10次/分钟 |

超过限制将返回429状态码。

## 数据格式

### 日期时间格式

所有日期时间使用ISO 8601格式：

```
2026-01-05T10:30:00
```

### 日期格式

```
2026-01-05
```

### 时间格式

```
14:30:00
```

### 金额格式

金额使用浮点数，单位为美元：

```json
{
  "price": 25.50
}
```

## 最佳实践

### 1. 认证Token管理

- Token有效期为24小时
- 在Token过期前刷新
- 安全存储Token，不要暴露在URL中

### 2. 错误处理

- 始终检查HTTP状态码
- 解析错误响应中的detail字段
- 实现重试机制（指数退避）

### 3. 性能优化

- 使用分页避免一次加载大量数据
- 缓存不常变化的数据（如店铺信息）
- 使用条件请求（If-Modified-Since）

### 4. 安全建议

- 使用HTTPS
- 不要在客户端存储敏感信息
- 验证用户输入
- 实施CSRF保护

## 版本控制

当前API版本：**v1**

API版本在URL中指定：`/api/v1/...`

## 更新日志

### 2026-01-05
- ✅ 完成所有核心模块API
- ✅ 添加认证、用户、店铺、预约模块
- ✅ 添加积分、优惠券、通知、推荐模块
- ✅ 添加评价、营业时间、节假日、作品集模块
- ✅ 添加技师、文件上传模块

## 相关文档

- [通知系统文档](./NOTIFICATION_SYSTEM.md)
- [积分和优惠券系统文档](./POINTS_COUPONS_SYSTEM.md)
- [推荐好友系统文档](./REFERRAL_SYSTEM.md)
- [系统架构文档](./SYSTEM_ARCHITECTURE.md)

---

**文档版本**: 1.0  
**最后更新**: 2026-01-05  
**维护者**: Manus AI
