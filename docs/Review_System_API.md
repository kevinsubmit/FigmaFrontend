# 店铺评价系统 API 文档

## 概述

店铺评价系统允许普通用户对已完成的预约进行评价，包括评分（1-5星）和评论。系统支持评价的创建、查看、编辑和删除功能。

## 数据模型

### Review（评价表）

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | Integer | 评价ID | 主键，自增 |
| user_id | Integer | 用户ID | 外键，关联backend_users表 |
| store_id | Integer | 店铺ID | 外键，关联stores表 |
| appointment_id | Integer | 预约ID | 外键，关联appointments表，唯一 |
| rating | Float | 评分 | 1.0-5.0 |
| comment | Text | 评论内容 | 可选 |
| created_at | DateTime | 创建时间 | 自动生成 |
| updated_at | DateTime | 更新时间 | 自动更新 |

### 约束条件

1. **一个预约只能评价一次**：`appointment_id` 字段设置为唯一约束
2. **只能评价已完成的预约**：预约状态必须为 `completed`
3. **只能评价自己的预约**：评价的用户ID必须与预约的用户ID一致

## API 端点

### 1. 创建评价

**POST** `/api/v1/reviews/`

创建一个新的评价。

#### 权限
- 需要认证
- 只能评价自己的已完成预约

#### 请求体
```json
{
  "appointment_id": 1,
  "rating": 4.5,
  "comment": "Great service! Highly recommended."
}
```

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| appointment_id | integer | 是 | 预约ID |
| rating | float | 是 | 评分（1.0-5.0） |
| comment | string | 否 | 评论内容 |

#### 响应
```json
{
  "id": 1,
  "user_id": 30001,
  "store_id": 4,
  "appointment_id": 1,
  "rating": 4.5,
  "comment": "Great service! Highly recommended.",
  "created_at": "2026-01-04T23:13:31",
  "updated_at": "2026-01-04T23:13:31",
  "user_name": "testuser123",
  "user_avatar": null
}
```

#### 错误响应

| 状态码 | 说明 |
|--------|------|
| 400 | 预约状态不是已完成，或预约已被评价 |
| 403 | 无权评价该预约（不是自己的预约） |
| 404 | 预约不存在 |

---

### 2. 获取店铺评价列表

**GET** `/api/v1/reviews/stores/{store_id}`

获取指定店铺的评价列表。

#### 权限
- 公开访问

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| store_id | integer | 店铺ID |

#### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| skip | integer | 0 | 跳过的记录数（分页） |
| limit | integer | 20 | 返回的记录数（分页） |

#### 响应
```json
[
  {
    "id": 1,
    "user_id": 30001,
    "store_id": 4,
    "appointment_id": 1,
    "rating": 4.5,
    "comment": "Great service!",
    "created_at": "2026-01-04T23:13:31",
    "updated_at": "2026-01-04T23:13:31",
    "user_name": "testuser123",
    "user_avatar": null
  }
]
```

---

### 3. 获取店铺评分统计

**GET** `/api/v1/reviews/stores/{store_id}/rating`

获取指定店铺的评分统计信息。

#### 权限
- 公开访问

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| store_id | integer | 店铺ID |

#### 响应
```json
{
  "store_id": 4,
  "average_rating": 4.55,
  "total_reviews": 2,
  "rating_distribution": {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 2,
    "5": 0
  }
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| store_id | integer | 店铺ID |
| average_rating | float | 平均评分（保留2位小数） |
| total_reviews | integer | 总评价数 |
| rating_distribution | object | 评分分布（1-5星的数量） |

---

### 4. 获取当前用户的评价列表

**GET** `/api/v1/reviews/my-reviews`

获取当前登录用户的所有评价。

#### 权限
- 需要认证

#### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| skip | integer | 0 | 跳过的记录数（分页） |
| limit | integer | 20 | 返回的记录数（分页） |

#### 响应
```json
[
  {
    "id": 1,
    "user_id": 30001,
    "store_id": 4,
    "appointment_id": 1,
    "rating": 4.5,
    "comment": "Great service!",
    "created_at": "2026-01-04T23:13:31",
    "updated_at": "2026-01-04T23:13:31",
    "user_name": "testuser123",
    "user_avatar": null
  }
]
```

---

### 5. 更新评价

**PUT** `/api/v1/reviews/{review_id}`

更新指定的评价。

#### 权限
- 需要认证
- 只能更新自己的评价

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| review_id | integer | 评价ID |

#### 请求体
```json
{
  "appointment_id": 1,
  "rating": 5.0,
  "comment": "Updated: Excellent service!"
}
```

#### 响应
```json
{
  "id": 1,
  "user_id": 30001,
  "store_id": 4,
  "appointment_id": 1,
  "rating": 5.0,
  "comment": "Updated: Excellent service!",
  "created_at": "2026-01-04T23:13:31",
  "updated_at": "2026-01-04T23:20:15",
  "user_name": "testuser123",
  "user_avatar": null
}
```

#### 错误响应

| 状态码 | 说明 |
|--------|------|
| 403 | 无权更新该评价（不是自己的评价） |
| 404 | 评价不存在 |

---

### 6. 删除评价

**DELETE** `/api/v1/reviews/{review_id}`

删除指定的评价。

#### 权限
- 需要认证
- 只能删除自己的评价

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| review_id | integer | 评价ID |

#### 响应
- 状态码：204 No Content
- 无响应体

#### 错误响应

| 状态码 | 说明 |
|--------|------|
| 403 | 无权删除该评价（不是自己的评价） |
| 404 | 评价不存在 |

---

## 前端集成

### API 服务层

前端API服务位于 `/frontend/src/api/reviews.ts`，提供以下函数：

```typescript
// 创建评价
createReview(data: CreateReviewData, token: string): Promise<Review>

// 获取店铺评价列表
getStoreReviews(storeId: number, skip?: number, limit?: number): Promise<Review[]>

// 获取店铺评分统计
getStoreRating(storeId: number): Promise<StoreRating>

// 获取当前用户的评价列表
getMyReviews(token: string, skip?: number, limit?: number): Promise<Review[]>

// 更新评价
updateReview(reviewId: number, data: CreateReviewData, token: string): Promise<Review>

// 删除评价
deleteReview(reviewId: number, token: string): Promise<void>
```

### UI 组件

1. **ReviewForm** (`/frontend/src/components/ReviewForm.tsx`)
   - 评价表单组件
   - 支持创建和编辑模式
   - 星级评分选择
   - 评论内容输入

2. **StoreReviews** (`/frontend/src/components/StoreReviews.tsx`)
   - 店铺评价展示组件
   - 评分统计卡片
   - 评价列表

3. **MyReviews** (`/frontend/src/components/MyReviews.tsx`)
   - 我的评价页面
   - 查看、编辑、删除评价

4. **Appointments** (`/frontend/src/components/Appointments.tsx`)
   - 我的预约页面
   - 已完成的预约显示"Review"按钮

### 路由配置

- `/my-reviews` - 我的评价页面
- 在个人中心（Profile）页面添加"My Reviews"快捷入口

---

## 测试数据

系统已创建以下测试数据：

1. **已完成的预约**：9个
2. **测试评价**：3条
   - Store 4: 2条评价（平均评分4.55）
   - Store 6: 1条评价（评分4.9）

---

## 使用流程

### 用户评价流程

1. 用户完成预约（预约状态变为 `completed`）
2. 在"我的预约"页面，已完成的预约显示"Review"按钮
3. 点击"Review"按钮，打开评价表单
4. 选择星级评分（1-5星）
5. 输入评论内容（可选）
6. 提交评价
7. 评价成功后，可以在"我的评价"页面查看、编辑或删除

### 查看店铺评价

1. 在店铺详情页，切换到"Reviews"标签
2. 查看评分统计（平均评分、总评价数、评分分布）
3. 浏览评价列表（用户名、评分、评论、日期）

---

## 注意事项

1. **评价唯一性**：每个预约只能评价一次，重复评价会返回400错误
2. **预约状态检查**：只能评价状态为 `completed` 的预约
3. **权限控制**：用户只能评价、编辑、删除自己的评价
4. **评分范围**：评分必须在1.0-5.0之间
5. **用户信息**：评价响应中包含用户名和头像，便于前端展示
