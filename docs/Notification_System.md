# 预约通知系统 API 文档

## 概述

预约通知系统为用户和店铺管理员提供实时的预约状态更新通知。系统在预约状态变更时自动发送通知，提升用户体验和沟通效率。

## 通知类型

| 类型 | 说明 | 接收者 |
|------|------|--------|
| `appointment_created` | 新预约创建 | 店铺管理员 |
| `appointment_confirmed` | 预约已确认 | 客户 |
| `appointment_cancelled` | 预约已取消 | 客户/店铺管理员 |
| `appointment_completed` | 预约已完成 | 客户 |
| `appointment_reminder` | 预约提醒 | 客户 |

## 通知触发场景

### 1. 预约创建
- **触发时机**：客户创建新预约时
- **接收者**：店铺管理员
- **通知内容**：客户姓名、服务名称、预约日期时间
- **目的**：提醒管理员及时确认预约

### 2. 预约确认
- **触发时机**：店铺管理员确认预约时
- **接收者**：客户
- **通知内容**：服务名称、店铺名称、预约日期时间
- **目的**：告知客户预约已确认

### 3. 预约取消
- **触发时机**：预约被取消时
- **接收者**：
  - 管理员取消：通知客户
  - 客户取消：通知店铺管理员
- **通知内容**：服务名称、店铺名称、预约日期时间、取消原因
- **目的**：及时通知相关方预约变更

### 4. 预约完成
- **触发时机**：店铺管理员标记预约完成时
- **接收者**：客户
- **通知内容**：服务名称、店铺名称、感谢信息
- **目的**：确认服务完成，提升客户满意度

## API 端点

### 1. 获取通知列表

```http
GET /api/v1/notifications
```

**权限**：需要登录

**查询参数**：
- `skip` (int, optional): 跳过的记录数，默认 0
- `limit` (int, optional): 返回的最大记录数，默认 100
- `is_read` (bool, optional): 筛选已读/未读通知

**响应示例**：
```json
[
  {
    "id": 1,
    "user_id": 120002,
    "type": "appointment_confirmed",
    "title": "Appointment Confirmed",
    "message": "Your appointment for Classic Manicure at Luxury Nails Spa on 2026-01-24 at 17:00 has been confirmed.",
    "appointment_id": 60003,
    "is_read": false,
    "created_at": "2026-01-04T17:35:22",
    "read_at": null
  }
]
```

### 2. 获取通知详情

```http
GET /api/v1/notifications/{notification_id}
```

**权限**：需要登录，只能查看自己的通知

**路径参数**：
- `notification_id` (int): 通知ID

**响应示例**：
```json
{
  "id": 1,
  "user_id": 120002,
  "type": "appointment_confirmed",
  "title": "Appointment Confirmed",
  "message": "Your appointment for Classic Manicure at Luxury Nails Spa on 2026-01-24 at 17:00 has been confirmed.",
  "appointment_id": 60003,
  "is_read": false,
  "created_at": "2026-01-04T17:35:22",
  "read_at": null
}
```

### 3. 标记通知为已读

```http
PATCH /api/v1/notifications/{notification_id}/read
```

**权限**：需要登录，只能标记自己的通知

**路径参数**：
- `notification_id` (int): 通知ID

**响应示例**：
```json
{
  "id": 1,
  "user_id": 120002,
  "type": "appointment_confirmed",
  "title": "Appointment Confirmed",
  "message": "Your appointment for Classic Manicure at Luxury Nails Spa on 2026-01-24 at 17:00 has been confirmed.",
  "appointment_id": 60003,
  "is_read": true,
  "created_at": "2026-01-04T17:35:22",
  "read_at": "2026-01-04T17:40:15"
}
```

### 4. 获取未读通知数量

```http
GET /api/v1/notifications/unread/count
```

**权限**：需要登录

**响应示例**：
```json
{
  "unread_count": 3
}
```

### 5. 删除通知

```http
DELETE /api/v1/notifications/{notification_id}
```

**权限**：需要登录，只能删除自己的通知

**路径参数**：
- `notification_id` (int): 通知ID

**响应**：
```json
{
  "message": "Notification deleted successfully"
}
```

## 数据模型

### Notification

| 字段 | 类型 | 说明 |
|------|------|------|
| id | integer | 通知ID（主键） |
| user_id | integer | 接收通知的用户ID |
| type | string | 通知类型 |
| title | string | 通知标题 |
| message | text | 通知内容 |
| appointment_id | integer | 关联的预约ID（可选） |
| is_read | boolean | 是否已读 |
| created_at | datetime | 创建时间 |
| read_at | datetime | 阅读时间（可选） |

## 使用示例

### 客户查看通知

```python
import requests

# 登录
response = requests.post(
    "http://localhost:8000/api/v1/auth/login",
    json={"phone": "19900000002", "password": "user123456"}
)
token = response.json()["access_token"]

# 获取通知列表
response = requests.get(
    "http://localhost:8000/api/v1/notifications",
    headers={"Authorization": f"Bearer {token}"}
)
notifications = response.json()

# 获取未读数量
response = requests.get(
    "http://localhost:8000/api/v1/notifications/unread/count",
    headers={"Authorization": f"Bearer {token}"}
)
unread_count = response.json()["unread_count"]

# 标记为已读
notification_id = notifications[0]["id"]
response = requests.patch(
    f"http://localhost:8000/api/v1/notifications/{notification_id}/read",
    headers={"Authorization": f"Bearer {token}"}
)
```

### 店铺管理员查看新预约通知

```python
import requests

# 登录
response = requests.post(
    "http://localhost:8000/api/v1/auth/login",
    json={"phone": "19900000001", "password": "admin12345"}
)
token = response.json()["access_token"]

# 获取未读通知
response = requests.get(
    "http://localhost:8000/api/v1/notifications?is_read=false",
    headers={"Authorization": f"Bearer {token}"}
)
unread_notifications = response.json()

# 处理新预约通知
for notif in unread_notifications:
    if notif["type"] == "appointment_created":
        print(f"New appointment: {notif['message']}")
        appointment_id = notif["appointment_id"]
        
        # 确认预约
        requests.patch(
            f"http://localhost:8000/api/v1/appointments/{appointment_id}/confirm",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # 标记通知为已读
        requests.patch(
            f"http://localhost:8000/api/v1/notifications/{notif['id']}/read",
            headers={"Authorization": f"Bearer {token}"}
        )
```

## 最佳实践

### 1. 轮询vs WebSocket
- **当前实现**：客户端定期轮询 `/api/v1/notifications` 获取新通知
- **建议间隔**：30-60秒
- **未来改进**：可以使用 WebSocket 实现实时推送

### 2. 通知管理
- 定期清理已读的旧通知（如30天前的通知）
- 为重要通知（如预约取消）添加额外的提醒机制
- 考虑添加通知偏好设置，让用户选择接收哪些类型的通知

### 3. 性能优化
- 使用分页加载通知列表
- 缓存未读数量，减少数据库查询
- 为 `user_id` 和 `is_read` 字段添加索引

### 4. 用户体验
- 在UI中显示未读通知数量徽章
- 点击通知后自动跳转到相关预约详情
- 提供"全部标记为已读"功能

## 错误处理

### 常见错误码

| 状态码 | 说明 |
|--------|------|
| 401 | 未授权（未登录或token无效） |
| 403 | 禁止访问（尝试访问他人的通知） |
| 404 | 通知不存在 |
| 500 | 服务器内部错误 |

### 错误响应示例

```json
{
  "detail": "Notification not found"
}
```

## 未来扩展

### 1. 多渠道通知
- 邮件通知
- 短信通知
- 推送通知（移动应用）

### 2. 通知模板
- 支持自定义通知模板
- 多语言支持
- 富文本内容

### 3. 通知偏好
- 用户可以选择接收哪些类型的通知
- 设置通知接收时间段
- 选择通知渠道

### 4. 通知统计
- 通知发送成功率
- 通知阅读率
- 用户参与度分析

## 相关文档

- [预约系统增强 API 文档](./Appointment_System_Enhancements.md)
- [店铺营业时间管理 API 文档](./Store_Hours_Management.md)
- [美甲师休假管理 API 文档](./Technician_Unavailable_Management.md)

## 更新日志

### v1.0.0 (2026-01-04)
- ✅ 实现基础通知系统
- ✅ 支持5种通知类型
- ✅ 与预约流程完整集成
- ✅ 提供完整的CRUD API
