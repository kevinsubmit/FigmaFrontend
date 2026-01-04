# 预约提醒系统文档

## 概述

预约提醒系统自动向用户发送预约提醒通知，减少爽约率，提升用户体验。

---

## 功能特性

### 1. 自动提醒创建
- 创建预约时自动生成2条提醒记录
- 24小时前提醒
- 1小时前提醒

### 2. 智能提醒管理
- 取消预约时自动取消提醒
- 改期预约时自动更新提醒时间
- 只为未来的预约创建提醒

### 3. 后台定时任务
- 每5分钟检查一次待发送的提醒
- 自动发送到期的提醒
- 记录发送状态和错误信息

---

## 数据库设计

### appointment_reminders表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| appointment_id | INT | 预约ID |
| user_id | INT | 用户ID |
| reminder_type | ENUM | 提醒类型：24_hours, 1_hour |
| status | ENUM | 状态：pending, sent, failed, cancelled |
| scheduled_time | DATETIME | 计划发送时间 |
| sent_at | DATETIME | 实际发送时间 |
| error_message | VARCHAR(500) | 错误信息 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

**索引：**
- appointment_id
- user_id
- reminder_type
- status
- scheduled_time

---

## 核心服务

### 1. ReminderScheduler (调度器)

**位置：** `app/services/scheduler.py`

**功能：**
- 后台定时任务
- 每5分钟检查一次待发送的提醒
- 应用启动时自动启动
- 应用关闭时自动停止

**配置：**
```python
# 修改检查间隔（分钟）
reminder_scheduler = ReminderScheduler(interval_minutes=5)
```

### 2. ReminderService (提醒服务)

**位置：** `app/services/reminder_service.py`

**核心函数：**

#### process_pending_reminders()
处理所有待发送的提醒

**返回值：**
```python
{
    "total": 10,      # 总数
    "sent": 8,        # 成功发送
    "failed": 2,      # 发送失败
    "errors": [...]   # 错误列表
}
```

#### create_reminders_on_appointment_creation()
创建预约时自动创建提醒

**参数：**
- db: 数据库会话
- appointment_id: 预约ID
- user_id: 用户ID
- appointment_date: 预约日期
- appointment_time: 预约时间

#### handle_appointment_cancellation()
取消预约时自动取消提醒

**参数：**
- db: 数据库会话
- appointment_id: 预约ID

**返回值：** 取消的提醒数量

#### handle_appointment_reschedule()
改期预约时自动更新提醒

**参数：**
- db: 数据库会话
- appointment_id: 预约ID
- user_id: 用户ID
- new_appointment_date: 新预约日期
- new_appointment_time: 新预约时间

**返回值：** 新创建的提醒列表

---

## API集成

### 创建预约时

```python
# app/api/v1/endpoints/appointments.py

@router.post("/", response_model=Appointment)
def create_appointment(...):
    # 创建预约
    db_appointment = crud_appointment.create_appointment(...)
    
    # 发送通知
    notification_service.notify_appointment_created(db, db_appointment)
    
    # 创建提醒 ✅
    reminder_service.create_reminders_on_appointment_creation(
        db,
        db_appointment.id,
        user_id,
        db_appointment.appointment_date,
        db_appointment.appointment_time
    )
    
    return db_appointment
```

### 取消预约时

```python
@router.post("/{appointment_id}/cancel", response_model=Appointment)
def cancel_appointment(...):
    # 取消预约
    cancelled_appointment = crud_appointment.cancel_appointment_with_reason(...)
    
    # 发送通知
    notification_service.notify_appointment_cancelled(...)
    
    # 取消提醒 ✅
    reminder_service.handle_appointment_cancellation(db, appointment_id)
    
    return cancelled_appointment
```

### 改期预约时

```python
@router.post("/{appointment_id}/reschedule", response_model=Appointment)
def reschedule_appointment(...):
    # 改期预约
    rescheduled_appointment = crud_appointment.reschedule_appointment(...)
    
    # 发送通知
    notification_service.notify_appointment_rescheduled(...)
    
    # 更新提醒 ✅
    reminder_service.handle_appointment_reschedule(
        db,
        appointment_id,
        current_user.id,
        reschedule_data.new_date,
        reschedule_data.new_time
    )
    
    return rescheduled_appointment
```

---

## 提醒内容模板

### 24小时前提醒

**标题：** Appointment Reminder - Tomorrow

**内容：** Hi {username}! Your appointment at {store_name} is tomorrow at {time}. Service: {service_name}. See you soon!

**示例：** Hi testuser123! Your appointment at Luxury Nails Spa is tomorrow at 02:00 PM. Service: Classic Manicure. See you soon!

### 1小时前提醒

**标题：** Appointment Reminder - In 1 Hour

**内容：** Hi {username}! Your appointment at {store_name} is in 1 hour at {time}. Service: {service_name}. See you soon!

**示例：** Hi testuser123! Your appointment at Luxury Nails Spa is in 1 hour at 02:00 PM. Service: Classic Manicure. See you soon!

---

## 通知类型

提醒通知使用 `APPOINTMENT_REMINDER` 类型：

```python
class NotificationType(str, enum.Enum):
    APPOINTMENT_REMINDER = "appointment_reminder"
```

用户可以在通知列表中查看提醒通知。

---

## 监控和日志

### 日志级别

- **INFO**: 正常操作（调度器启动/停止、提醒处理统计）
- **ERROR**: 错误情况（提醒发送失败、数据查询失败）

### 关键日志

```
# 调度器启动
Reminder scheduler started (checking every 5 minutes)

# 提醒检查
Checking for pending reminders at 2026-01-04 18:46:18

# 提醒处理统计
Reminder processing complete: 8 sent, 2 failed

# 提醒发送成功
Reminder notification sent for appointment 120001

# 提醒发送失败
Error sending reminder notification: User 1 not found
```

### 查看日志

```bash
# 实时查看日志
tail -f backend/backend.log | grep -i reminder

# 查看最近的提醒日志
grep -i reminder backend/backend.log | tail -50
```

---

## 数据库查询

### 查看待发送的提醒

```sql
SELECT * FROM appointment_reminders 
WHERE status = 'pending' 
AND scheduled_time <= NOW()
ORDER BY scheduled_time;
```

### 查看某个预约的提醒

```sql
SELECT * FROM appointment_reminders 
WHERE appointment_id = 120001;
```

### 查看提醒发送统计

```sql
SELECT 
    status,
    COUNT(*) as count
FROM appointment_reminders
GROUP BY status;
```

### 查看失败的提醒

```sql
SELECT 
    ar.*,
    a.appointment_date,
    a.appointment_time,
    u.username
FROM appointment_reminders ar
JOIN appointments a ON ar.appointment_id = a.id
JOIN backend_users u ON ar.user_id = u.id
WHERE ar.status = 'failed'
ORDER BY ar.created_at DESC;
```

---

## 故障排查

### 问题1：提醒没有发送

**可能原因：**
1. 调度器未启动
2. scheduled_time在未来
3. 预约已取消

**解决方法：**
```bash
# 检查调度器是否运行
grep "Reminder scheduler started" backend/backend.log

# 手动触发提醒处理
python3 -c "
from app.db.session import SessionLocal
from app.services.reminder_service import process_pending_reminders
db = SessionLocal()
stats = process_pending_reminders(db)
print(stats)
db.close()
"
```

### 问题2：提醒发送失败

**可能原因：**
1. 用户不存在
2. 预约不存在
3. 数据库连接失败

**解决方法：**
```sql
-- 查看失败原因
SELECT id, error_message 
FROM appointment_reminders 
WHERE status = 'failed';

-- 重置失败的提醒
UPDATE appointment_reminders 
SET status = 'pending' 
WHERE status = 'failed' 
AND scheduled_time <= NOW();
```

### 问题3：重复发送提醒

**可能原因：**
1. 状态未正确更新
2. 多个调度器实例

**解决方法：**
```sql
-- 检查重复的提醒
SELECT appointment_id, reminder_type, COUNT(*) 
FROM appointment_reminders 
WHERE status = 'sent'
GROUP BY appointment_id, reminder_type 
HAVING COUNT(*) > 1;

-- 确保只有一个服务器实例运行
ps aux | grep uvicorn
```

---

## 性能优化

### 1. 数据库索引

已创建的索引：
- `idx_appointment_id`
- `idx_user_id`
- `idx_reminder_type`
- `idx_status`
- `idx_scheduled_time`

### 2. 批量处理

调度器每次处理所有到期的提醒，避免频繁的数据库查询。

### 3. 错误处理

单个提醒发送失败不会影响其他提醒的处理。

---

## 未来增强

### 1. 多渠道通知
- 短信提醒
- 邮件提醒
- 推送通知（PWA）

### 2. 自定义提醒时间
- 用户可以选择提醒时间
- 支持多个提醒时间点

### 3. 提醒偏好设置
- 用户可以关闭提醒
- 选择提醒渠道

### 4. 提醒统计
- 提醒送达率
- 用户响应率
- 爽约率对比

---

## 总结

预约提醒系统已成功集成到NailsDash平台，具备以下特点：

✅ **自动化** - 无需手动干预，自动创建和发送提醒
✅ **智能化** - 根据预约状态自动管理提醒
✅ **可靠性** - 完善的错误处理和日志记录
✅ **可扩展** - 易于添加新的提醒类型和渠道

提醒系统将有效减少爽约率，提升用户体验和店铺运营效率。
