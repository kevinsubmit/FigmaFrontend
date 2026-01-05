# 预约提醒和通知系统文档

## 概述

预约提醒和通知系统是美甲预约平台的核心功能之一，负责在关键时刻向用户和店铺管理员发送通知，提升用户体验和预约管理效率。系统支持多种通知类型，包括预约创建、确认、取消、提醒等，并提供定时任务自动发送预约提醒。

## 功能特点

### 核心功能

1. **实时通知推送**：预约状态变更时立即通知相关用户
2. **定时提醒**：预约前24小时和1小时自动发送提醒
3. **通知管理**：用户可查看、标记已读、删除通知
4. **未读数量提示**：实时显示未读通知数量
5. **多种通知类型**：支持预约创建、确认、取消、完成、提醒等多种场景

### 通知类型

系统支持以下通知类型：

| 通知类型 | 英文标识 | 触发时机 | 接收者 |
|---------|---------|---------|--------|
| 预约创建 | APPOINTMENT_CREATED | 用户创建预约时 | 店铺管理员 |
| 预约确认 | APPOINTMENT_CONFIRMED | 管理员确认预约时 | 用户 |
| 预约取消 | APPOINTMENT_CANCELLED | 任一方取消预约时 | 对方 |
| 预约完成 | APPOINTMENT_COMPLETED | 预约服务完成时 | 用户 |
| 预约提醒 | APPOINTMENT_REMINDER | 预约前24h/1h | 用户 |
| 系统通知 | SYSTEM | 系统公告或重要消息 | 所有用户 |

## 技术实现

### 数据库设计

#### Notification表

```sql
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '接收通知的用户ID',
    type VARCHAR(50) NOT NULL COMMENT '通知类型',
    title VARCHAR(255) NOT NULL COMMENT '通知标题',
    message TEXT NOT NULL COMMENT '通知内容',
    is_read BOOLEAN DEFAULT FALSE COMMENT '是否已读',
    appointment_id INT COMMENT '关联的预约ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP COMMENT '已读时间',
    FOREIGN KEY (user_id) REFERENCES backend_users(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
);
```

**字段说明**：
- `user_id`: 接收通知的用户ID
- `type`: 通知类型（枚举值）
- `title`: 通知标题
- `message`: 通知详细内容
- `is_read`: 是否已读
- `appointment_id`: 关联的预约ID（可选）
- `read_at`: 已读时间

### 后端API

#### 1. 获取通知列表

```
GET /api/v1/notifications/
Authorization: Bearer {token}
```

**查询参数**：
- `skip`: 跳过的记录数（默认0）
- `limit`: 返回的记录数（默认100，最大100）
- `unread_only`: 只返回未读通知（默认false）

**响应**：
```json
[
  {
    "id": 1,
    "user_id": 123,
    "type": "APPOINTMENT_CONFIRMED",
    "title": "Appointment Confirmed",
    "message": "Your appointment for Manicure at Nail Salon on 2026-01-10 at 14:00 has been confirmed.",
    "is_read": false,
    "appointment_id": 456,
    "created_at": "2026-01-05T10:30:00",
    "read_at": null
  }
]
```

#### 2. 获取未读通知数量

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

#### 3. 获取单个通知详情

```
GET /api/v1/notifications/{notification_id}
Authorization: Bearer {token}
```

**响应**：
```json
{
  "id": 1,
  "user_id": 123,
  "type": "APPOINTMENT_CONFIRMED",
  "title": "Appointment Confirmed",
  "message": "Your appointment for Manicure at Nail Salon on 2026-01-10 at 14:00 has been confirmed.",
  "is_read": false,
  "appointment_id": 456,
  "created_at": "2026-01-05T10:30:00",
  "read_at": null
}
```

#### 4. 标记通知为已读

```
PATCH /api/v1/notifications/{notification_id}/read
Authorization: Bearer {token}
```

**响应**：
```json
{
  "id": 1,
  "is_read": true,
  "read_at": "2026-01-05T11:00:00"
}
```

#### 5. 标记所有通知为已读

```
POST /api/v1/notifications/mark-all-read
Authorization: Bearer {token}
```

**响应**：
```json
{
  "message": "All notifications marked as read",
  "marked_count": 5
}
```

#### 6. 删除通知

```
DELETE /api/v1/notifications/{notification_id}
Authorization: Bearer {token}
```

**响应**：
```
HTTP 204 No Content
```

### 通知服务模块

#### notification_service.py

通知服务模块提供了创建各种类型通知的便捷函数：

**核心函数**：

1. **create_notification()** - 创建通知的基础函数
   ```python
   def create_notification(
       db: Session,
       user_id: int,
       notification_type: NotificationType,
       title: str,
       message: str,
       appointment_id: Optional[int] = None
   ) -> Notification
   ```

2. **notify_appointment_created()** - 预约创建通知
   - 触发时机：用户创建新预约
   - 接收者：店铺管理员
   - 内容：包含客户姓名、服务名称、预约时间

3. **notify_appointment_confirmed()** - 预约确认通知
   - 触发时机：管理员确认预约
   - 接收者：预约用户
   - 内容：包含服务名称、店铺名称、预约时间

4. **notify_appointment_cancelled()** - 预约取消通知
   - 触发时机：任一方取消预约
   - 接收者：对方用户
   - 内容：包含取消原因、预约详情

5. **notify_appointment_completed()** - 预约完成通知
   - 触发时机：服务完成
   - 接收者：预约用户
   - 内容：包含服务详情、邀请评价

6. **send_appointment_reminder()** - 预约提醒
   - 触发时机：预约前24小时/1小时
   - 接收者：预约用户
   - 内容：包含预约时间、地点、服务详情

### 定时任务调度器

#### scheduler.py

使用异步后台调度器实现定时任务，自动发送预约提醒：

**主要功能**：

1. **check_and_send_reminders()** - 检查并发送提醒
   - 运行频率：每5分钟执行一次
   - 检查逻辑：
     - 查找24小时内的预约（未发送24小时提醒）
     - 查找1小时内的预约（未发送1小时提醒）
     - 发送相应的提醒通知
     - 更新提醒发送状态

2. **启动调度器**
   ```python
   from app.services.scheduler import start_scheduler
   
   # 在应用启动时调用（已集成到main.py）
   @app.on_event("startup")
   async def startup_event():
       await start_scheduler()
   ```

3. **停止调度器**
   ```python
   @app.on_event("shutdown")
   async def shutdown_event():
       await stop_scheduler()
   ```

**提醒时间窗口**：
- 24小时提醒：预约前23.5-24.5小时（±30分钟窗口）
- 1小时提醒：预约前55分钟-1小时5分钟（±5分钟窗口）

### 前端实现

#### Notifications组件

**位置**：`frontend/src/components/Notifications.tsx`

**功能模块**：
- 通知列表展示（全部/未读筛选）
- 未读数量显示
- 标记已读功能
- 删除通知功能
- 自动刷新
- 相对时间显示（Just now, 5m ago, 2h ago, 3d ago）
- 不同类型图标（Calendar, Clock, Bell）

**关键代码**：
```typescript
// 获取通知列表
const fetchNotifications = async () => {
  const response = await notificationService.getNotifications(
    0, 
    100, 
    showUnreadOnly
  );
  setNotifications(response);
};

// 获取未读数量
const fetchUnreadCount = async () => {
  const response = await notificationService.getUnreadCount();
  setUnreadCount(response.unread_count);
};

// 标记为已读
const handleMarkAsRead = async (id: number) => {
  await notificationService.markAsRead(id);
  fetchNotifications();
  fetchUnreadCount();
};

// 删除通知
const handleDelete = async (id: number) => {
  await notificationService.deleteNotification(id);
  fetchNotifications();
};

// 标记所有为已读
const handleMarkAllAsRead = async () => {
  await notificationService.markAllAsRead();
  fetchNotifications();
  fetchUnreadCount();
};

// 相对时间格式化
const formatRelativeTime = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};
```

#### Profile页面集成

**位置**：`frontend/src/components/Profile.tsx`

**功能**：
- 通知图标按钮（Bell icon）
- 动态未读数量徽章（显示数字，超过99显示99+）
- 每30秒自动轮询更新未读数量
- 点击跳转到通知页面

**关键代码**：
```typescript
// 获取未读数量
const fetchUnreadCount = async () => {
  try {
    const response = await notificationsService.getUnreadCount();
    setUnreadCount(response.unread_count);
  } catch (error) {
    console.error('Failed to fetch unread count:', error);
  }
};

// 定时轮询
useEffect(() => {
  fetchUnreadCount();
  const interval = setInterval(fetchUnreadCount, 30000); // 每30秒
  return () => clearInterval(interval);
}, []);
```

## UI设计

### 设计风格

- **配色**：黑色背景 + 金色主题（#D4AF37）
- **未读通知**：金色背景（bg-[#D4AF37]/10）和金色边框
- **已读通知**：深色背景（bg-white/5）和灰色边框
- **交互**：平滑过渡动画和hover效果

### 用户体验

- 清晰的视觉层次（未读通知更突出）
- 相对时间显示（更友好的时间格式）
- 快速操作按钮（标记已读、删除）
- 空状态友好提示
- 加载状态显示
- 未读数量徽章（超过99显示99+）

## 使用流程

### 用户端流程

1. **接收通知**
   - 用户创建预约后，店铺管理员立即收到通知
   - 管理员确认预约后，用户立即收到通知
   - 预约前24小时和1小时，用户收到提醒

2. **查看通知**
   - 点击顶部通知图标（显示未读数量）
   - 进入通知列表页面
   - 未读通知以金色背景突出显示
   - 点击通知查看详情并自动标记为已读

3. **管理通知**
   - 单个通知可标记为已读或删除
   - 可一键标记所有通知为已读
   - 可筛选只显示未读通知
   - 通知按时间倒序排列

### 店铺管理员流程

1. **接收预约通知**
   - 用户创建预约时立即收到通知
   - 通知包含客户信息、服务详情、预约时间

2. **处理预约**
   - 查看通知详情
   - 在预约管理页面确认或取消预约
   - 确认/取消后，用户会收到相应通知

## 通知场景示例

### 场景1：用户创建预约

**流程**：
1. 用户在店铺详情页选择服务和时间，创建预约
2. 系统调用`notify_appointment_created()`
3. 店铺管理员收到通知："John Doe has booked Manicure on 2026-01-10 at 14:00. Please confirm the appointment."
4. 管理员在通知中心查看并处理

### 场景2：管理员确认预约

**流程**：
1. 管理员在预约管理页面确认预约
2. 系统调用`notify_appointment_confirmed()`
3. 用户收到通知："Your appointment for Manicure at Nail Salon on 2026-01-10 at 14:00 has been confirmed."
4. 用户查看通知，了解预约已确认

### 场景3：预约前24小时提醒

**流程**：
1. 定时任务每5分钟运行一次
2. 检查24小时内的预约（未发送提醒）
3. 调用`send_appointment_reminder()`发送提醒
4. 用户收到通知："Reminder: You have an appointment for Manicure at Nail Salon tomorrow at 14:00."
5. 更新`reminder_24h_sent`为True

### 场景4：预约前1小时提醒

**流程**：
1. 定时任务检查1小时内的预约
2. 发送紧急提醒
3. 用户收到通知："Reminder: Your appointment for Manicure at Nail Salon is in 1 hour at 14:00."
4. 更新`reminder_1h_sent`为True

### 场景5：预约取消

**流程**：
1. 用户或管理员取消预约
2. 系统调用`notify_appointment_cancelled()`
3. 对方收到通知："Your appointment for Manicure at Nail Salon on 2026-01-10 at 14:00 has been cancelled."
4. 双方都了解预约已取消

## 配置说明

### 定时任务配置

在`scheduler.py`中配置定时任务：

```python
import asyncio
from datetime import datetime, timedelta

async def scheduler_loop():
    """调度器主循环"""
    while True:
        try:
            await check_and_send_reminders()
        except Exception as e:
            print(f"Error in scheduler: {e}")
        
        # 每5分钟执行一次
        await asyncio.sleep(300)
```

### 提醒时间配置

在`reminder_service.py`中可以调整提醒时间窗口：

```python
# 24小时提醒窗口
reminder_24h_start = now + timedelta(hours=23, minutes=30)
reminder_24h_end = now + timedelta(hours=24, minutes=30)

# 1小时提醒窗口
reminder_1h_start = now + timedelta(minutes=55)
reminder_1h_end = now + timedelta(hours=1, minutes=5)
```

### 轮询频率配置

在`Profile.tsx`中可以调整未读数量轮询频率：

```typescript
// 每30秒轮询一次
const interval = setInterval(fetchUnreadCount, 30000);
```

## 测试结果

### 测试环境

- 后端：FastAPI + SQLAlchemy + MySQL + asyncio
- 前端：React + TypeScript + Ionic
- 测试工具：Pytest + TestClient

### 测试用例

#### 1. 通知创建测试
✅ **通过** - 预约状态变更时正确创建通知

#### 2. 通知查询测试
✅ **通过** - 用户只能查看自己的通知

#### 3. 未读数量测试
✅ **通过** - 未读数量统计准确

#### 4. 标记已读测试
✅ **通过** - 标记已读后`is_read`更新为True，`read_at`记录时间

#### 5. 标记所有已读测试
✅ **通过** - 批量标记所有未读通知为已读

#### 6. 删除通知测试
✅ **通过** - 删除通知后无法再查询到

#### 7. 定时提醒测试
✅ **通过** - 定时任务正确识别需要提醒的预约并发送通知

#### 8. 前端展示测试
✅ **通过** - 通知列表正确展示，未读数量实时更新

### 测试脚本

单元测试位于：
- `/backend/tests/test_notification_system.py` - API端点测试
- `/backend/tests/test_notifications_simple.py` - CRUD操作测试

运行测试：
```bash
cd /home/ubuntu/FigmaFrontend/backend
pytest tests/test_notification*.py -v
```

## 注意事项

### 1. 通知权限

- 用户只能查看、操作自己的通知
- 管理员不能查看其他管理员的通知
- 系统通知可以发送给所有用户

### 2. 定时任务

- 定时任务在应用启动时自动启动
- 应用关闭时自动停止
- 确保服务器时区设置正确
- 生产环境建议使用专门的任务队列（如Celery）

### 3. 性能优化

- 通知列表支持分页，避免一次加载过多数据
- 使用索引优化查询性能（user_id, is_read, created_at）
- 考虑定期清理过期通知（如30天前的已读通知）
- 前端使用轮询而非WebSocket，避免连接管理复杂性

### 4. 扩展性

- 通知类型可以轻松扩展
- 可以添加邮件、短信等多渠道通知
- 可以集成WebSocket实现实时推送（替代轮询）
- 可以添加通知模板管理

## 系统架构

```
用户操作
    ↓
前端组件 (Notifications.tsx)
    ↓
通知服务 (notifications.service.ts)
    ↓
API端点 (/api/v1/notifications)
    ↓
CRUD操作 (notification.py)
    ↓
数据库 (notifications表)

定时任务流程:
调度器 (scheduler.py)
    ↓
提醒服务 (reminder_service.py)
    ↓
通知服务 (notification_service.py)
    ↓
创建通知 → 用户收到提醒
```

## 未来优化

### 1. 功能扩展

- [ ] WebSocket实时推送（替代轮询）
- [ ] 邮件通知
- [ ] 短信通知
- [ ] 推送通知（PWA）
- [ ] 通知偏好设置（用户可选择接收哪些类型的通知）
- [ ] 通知模板管理
- [ ] 批量通知发送
- [ ] 通知分组（按日期或类型）

### 2. 性能优化

- [ ] 通知缓存（Redis）
- [ ] 异步通知发送
- [ ] 消息队列集成（Celery + Redis）
- [ ] 定期清理过期通知
- [ ] 数据库分区（按时间）

### 3. 用户体验

- [ ] 通知搜索和筛选
- [ ] 通知优先级
- [ ] 通知预览
- [ ] 声音和震动提醒
- [ ] 通知聚合（相同类型合并）
- [ ] 富文本通知内容
- [ ] 通知附件支持

## 相关文档

- [推荐好友系统文档](./REFERRAL_SYSTEM.md)
- [积分和优惠券系统文档](./POINTS_COUPONS_SYSTEM.md)
- [预约管理系统文档](./APPOINTMENT_SYSTEM.md)
- [API接口文档](./API_DOCUMENTATION.md)

## 更新日志

### 2026-01-05
- ✅ 完成通知系统后端开发
- ✅ 完成定时任务调度器（异步后台调度）
- ✅ 完成前端通知组件（金色主题UI）
- ✅ 完成Profile页面未读数量显示和轮询
- ✅ 完成功能测试
- ✅ 编写完整系统文档

---

**文档版本**: 1.0  
**最后更新**: 2026-01-05  
**维护者**: Manus AI
