# 预约系统增强功能文档

## 概述

预约系统增强功能为用户提供了更完善的预约管理体验，包括取消预约、改期预约和编辑备注等功能。

---

## 功能特性

### 1. 预约取消（带取消原因）

用户可以取消pending或confirmed状态的预约，并可选填写取消原因。

**特性：**
- ✅ 支持取消pending和confirmed状态的预约
- ✅ 可选填写取消原因
- ✅ 记录取消时间和取消人
- ✅ 不支持取消已完成或已取消的预约
- ✅ 发送通知给店铺管理员

**限制：**
- ❌ 已完成的预约不能取消
- ❌ 已取消的预约不能再次取消

---

### 2. 预约改期

用户可以将预约改期到新的日期和时间。

**特性：**
- ✅ 支持改期pending和confirmed状态的预约
- ✅ 自动检测时间冲突
- ✅ 保存原始预约时间（首次改期时）
- ✅ 记录改期次数
- ✅ 改期后状态重置为pending（需要重新确认）
- ✅ 发送通知给店铺管理员

**限制：**
- ❌ 已完成的预约不能改期
- ❌ 已取消的预约不能改期
- ❌ 新时间不能与现有预约冲突

---

### 3. 编辑预约备注

用户可以随时编辑预约备注，添加特殊要求或说明。

**特性：**
- ✅ 支持编辑pending、confirmed和completed状态的预约备注
- ✅ 实时更新
- ✅ 无字数限制

**限制：**
- ❌ 已取消的预约不能编辑备注

---

## 数据库设计

### Appointment模型新增字段

```python
class Appointment(Base):
    # ... 原有字段 ...
    
    # 备注字段
    notes = Column(Text)  # 用户备注
    
    # 取消相关字段
    cancel_reason = Column(Text)  # 取消原因
    cancelled_at = Column(DateTime(timezone=True))  # 取消时间
    cancelled_by = Column(Integer)  # 取消人ID（用户或管理员）
    
    # 改期相关字段
    original_date = Column(Date)  # 原始预约日期（用于改期记录）
    original_time = Column(Time)  # 原始预约时间（用于改期记录）
    reschedule_count = Column(Integer, default=0)  # 改期次数
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

---

## API端点

### 1. 取消预约

**端点：** `POST /api/v1/appointments/{appointment_id}/cancel`

**请求体：**
```json
{
  "cancel_reason": "有事无法前往"  // 可选
}
```

**响应：**
```json
{
  "id": 1,
  "user_id": 1,
  "store_id": 4,
  "service_id": 1,
  "appointment_date": "2026-01-10",
  "appointment_time": "10:00:00",
  "status": "cancelled",
  "cancel_reason": "有事无法前往",
  "cancelled_at": "2026-01-04T18:30:00Z",
  "cancelled_by": 1,
  "created_at": "2026-01-04T10:00:00Z",
  "updated_at": "2026-01-04T18:30:00Z"
}
```

**错误响应：**
- `404`: 预约不存在
- `403`: 无权取消此预约
- `400`: 预约已取消或已完成

---

### 2. 改期预约

**端点：** `POST /api/v1/appointments/{appointment_id}/reschedule`

**请求体：**
```json
{
  "new_date": "2026-01-15",
  "new_time": "14:00"
}
```

**响应：**
```json
{
  "id": 1,
  "user_id": 1,
  "store_id": 4,
  "service_id": 1,
  "appointment_date": "2026-01-15",
  "appointment_time": "14:00:00",
  "status": "pending",
  "original_date": "2026-01-10",
  "original_time": "10:00:00",
  "reschedule_count": 1,
  "created_at": "2026-01-04T10:00:00Z",
  "updated_at": "2026-01-04T18:35:00Z"
}
```

**错误响应：**
- `404`: 预约不存在
- `403`: 无权改期此预约
- `400`: 预约已取消、已完成或新时间冲突

---

### 3. 更新预约备注

**端点：** `PATCH /api/v1/appointments/{appointment_id}/notes`

**请求体：**
```json
{
  "notes": "请使用天然指甲油，我对化学成分过敏"
}
```

**响应：**
```json
{
  "id": 1,
  "user_id": 1,
  "store_id": 4,
  "service_id": 1,
  "appointment_date": "2026-01-15",
  "appointment_time": "14:00:00",
  "status": "pending",
  "notes": "请使用天然指甲油，我对化学成分过敏",
  "created_at": "2026-01-04T10:00:00Z",
  "updated_at": "2026-01-04T18:40:00Z"
}
```

**错误响应：**
- `404`: 预约不存在
- `403`: 无权更新此预约

---

## 前端实现

### 1. API服务层

**文件：** `frontend/src/api/appointments.ts`

```typescript
/**
 * 取消预约（带取消原因）
 */
export const cancelAppointment = async (
  appointmentId: number,
  cancelReason?: string
): Promise<Appointment> => {
  return apiClient.post(
    `/api/v1/appointments/${appointmentId}/cancel`,
    { cancel_reason: cancelReason },
    true
  );
};

/**
 * 改期预约
 */
export const rescheduleAppointment = async (
  appointmentId: number,
  newDate: string,
  newTime: string
): Promise<Appointment> => {
  return apiClient.post(
    `/api/v1/appointments/${appointmentId}/reschedule`,
    { new_date: newDate, new_time: newTime },
    true
  );
};

/**
 * 更新预约备注
 */
export const updateAppointmentNotes = async (
  appointmentId: number,
  notes: string
): Promise<Appointment> => {
  return apiClient.patch(
    `/api/v1/appointments/${appointmentId}/notes`,
    { notes },
    true
  );
};
```

---

### 2. 预约详情对话框组件

**文件：** `frontend/src/components/AppointmentDetailsDialog.tsx`

**功能：**
- ✅ 显示预约详细信息
- ✅ 取消预约（带取消原因输入）
- ✅ 改期预约（选择新日期和时间）
- ✅ 编辑备注
- ✅ 权限控制（根据预约状态显示/隐藏按钮）

**使用示例：**
```tsx
<AppointmentDetailsDialog
  appointment={selectedAppointment}
  onClose={() => setShowDetailsDialog(false)}
  onUpdate={() => loadAppointments()}
/>
```

---

### 3. 预约列表页面集成

**文件：** `frontend/src/components/Appointments.tsx`

**更新：**
- ✅ 点击预约卡片打开详情对话框
- ✅ 集成AppointmentDetailsDialog组件
- ✅ 自动刷新预约列表

---

## 用户流程

### 取消预约流程

1. 用户进入"我的预约"页面
2. 点击要取消的预约
3. 在详情对话框中点击"Cancel Appointment"按钮
4. 弹出取消确认对话框
5. 可选填写取消原因
6. 点击"Cancel Appointment"确认
7. 系统取消预约并发送通知
8. 预约状态更新为"cancelled"

---

### 改期预约流程

1. 用户进入"我的预约"页面
2. 点击要改期的预约
3. 在详情对话框中点击"Reschedule"按钮
4. 弹出改期对话框
5. 选择新的日期和时间
6. 点击"Reschedule"确认
7. 系统检查时间冲突
8. 如无冲突，更新预约时间
9. 预约状态重置为"pending"
10. 发送通知给店铺管理员

---

### 编辑备注流程

1. 用户进入"我的预约"页面
2. 点击要编辑的预约
3. 在详情对话框中点击"Edit Notes"按钮
4. 弹出备注编辑对话框
5. 输入或修改备注内容
6. 点击"Save Notes"保存
7. 系统更新备注
8. 显示成功提示

---

## 权限控制

### 取消预约权限

| 预约状态 | 用户是否可取消 | 说明 |
|---------|--------------|------|
| pending | ✅ 是 | 可以取消 |
| confirmed | ✅ 是 | 可以取消 |
| completed | ❌ 否 | 已完成不能取消 |
| cancelled | ❌ 否 | 已取消不能再次取消 |

---

### 改期预约权限

| 预约状态 | 用户是否可改期 | 说明 |
|---------|--------------|------|
| pending | ✅ 是 | 可以改期 |
| confirmed | ✅ 是 | 可以改期 |
| completed | ❌ 否 | 已完成不能改期 |
| cancelled | ❌ 否 | 已取消不能改期 |

---

### 编辑备注权限

| 预约状态 | 用户是否可编辑 | 说明 |
|---------|--------------|------|
| pending | ✅ 是 | 可以编辑 |
| confirmed | ✅ 是 | 可以编辑 |
| completed | ✅ 是 | 可以编辑 |
| cancelled | ❌ 否 | 已取消不能编辑 |

---

## 通知系统

### 取消预约通知

**发送给：** 店铺管理员

**内容：**
- 用户姓名
- 预约服务
- 原预约时间
- 取消原因（如有）

---

### 改期预约通知

**发送给：** 店铺管理员

**内容：**
- 用户姓名
- 预约服务
- 原预约时间
- 新预约时间
- 改期次数

---

## 测试场景

### 1. 取消预约测试

**测试步骤：**
1. 创建一个pending状态的预约
2. 取消预约并填写原因
3. 验证预约状态变为cancelled
4. 验证取消原因、时间和人员记录正确
5. 验证通知发送成功

**预期结果：**
- ✅ 预约状态更新为cancelled
- ✅ 取消信息记录完整
- ✅ 通知发送成功

---

### 2. 改期预约测试

**测试步骤：**
1. 创建一个pending状态的预约
2. 改期到新的日期和时间
3. 验证原始时间保存正确
4. 验证新时间更新正确
5. 验证改期次数增加
6. 验证状态重置为pending
7. 验证通知发送成功

**预期结果：**
- ✅ 原始时间保存正确
- ✅ 新时间更新正确
- ✅ 改期次数+1
- ✅ 状态重置为pending
- ✅ 通知发送成功

---

### 3. 时间冲突测试

**测试步骤：**
1. 创建两个预约
2. 尝试将第二个预约改期到与第一个预约冲突的时间
3. 验证系统拒绝改期
4. 验证错误提示正确

**预期结果：**
- ✅ 系统检测到冲突
- ✅ 拒绝改期请求
- ✅ 返回清晰的错误提示

---

### 4. 编辑备注测试

**测试步骤：**
1. 创建一个预约
2. 添加备注
3. 验证备注保存成功
4. 修改备注
5. 验证备注更新成功

**预期结果：**
- ✅ 备注保存成功
- ✅ 备注更新成功
- ✅ 显示最新备注内容

---

## 技术实现细节

### 后端CRUD函数

**文件：** `backend/app/crud/appointment.py`

#### cancel_appointment_with_reason()
```python
def cancel_appointment_with_reason(
    db: Session,
    appointment_id: int,
    cancel_reason: Optional[str] = None,
    cancelled_by: Optional[int] = None
) -> Optional[Appointment]:
    """Cancel appointment with reason"""
    db_appointment = get_appointment(db, appointment_id)
    if not db_appointment:
        return None
    
    db_appointment.status = AppointmentStatus.CANCELLED
    db_appointment.cancel_reason = cancel_reason
    db_appointment.cancelled_at = datetime.now()
    db_appointment.cancelled_by = cancelled_by
    
    db.commit()
    db.refresh(db_appointment)
    return db_appointment
```

#### reschedule_appointment()
```python
def reschedule_appointment(
    db: Session,
    appointment_id: int,
    new_date: date,
    new_time: time
) -> Optional[Appointment]:
    """Reschedule appointment to a new date/time"""
    db_appointment = get_appointment(db, appointment_id)
    if not db_appointment:
        return None
    
    # Save original date/time if this is the first reschedule
    if db_appointment.reschedule_count == 0:
        db_appointment.original_date = db_appointment.appointment_date
        db_appointment.original_time = db_appointment.appointment_time
    
    # Update to new date/time
    db_appointment.appointment_date = new_date
    db_appointment.appointment_time = new_time
    db_appointment.reschedule_count += 1
    
    # Reset status to pending (needs confirmation again)
    db_appointment.status = AppointmentStatus.PENDING
    
    db.commit()
    db.refresh(db_appointment)
    return db_appointment
```

---

## 性能优化

### 1. 数据库索引

```sql
-- 预约日期索引（用于查询和冲突检测）
CREATE INDEX idx_appointment_date ON appointments(appointment_date);

-- 用户ID索引（用于查询用户预约）
CREATE INDEX idx_user_id ON appointments(user_id);

-- 状态索引（用于筛选活跃预约）
CREATE INDEX idx_status ON appointments(status);
```

---

### 2. 缓存策略

- ✅ 用户预约列表缓存（5分钟）
- ✅ 店铺信息缓存（30分钟）
- ✅ 服务信息缓存（30分钟）

---

## 后续优化建议

### 1. 预约提醒功能

**时机：**
- 预约前24小时提醒
- 预约前1小时提醒

**渠道：**
- 推送通知
- 邮件通知
- 短信通知（可选）

---

### 2. 取消政策

**建议：**
- 预约前24小时可免费取消
- 预约前24小时内取消收取部分费用
- 无故爽约记录到用户信用

---

### 3. 改期限制

**建议：**
- 每个预约最多改期3次
- 预约前24小时内不能改期
- 改期次数过多影响用户信用

---

### 4. 自动取消

**场景：**
- 预约时间过后30分钟未到店自动取消
- 长时间pending状态自动取消

---

## 常见问题

### Q1: 取消预约后能恢复吗？

**A:** 目前不支持恢复已取消的预约，用户需要重新创建预约。后续可以考虑添加"撤销取消"功能（限时）。

---

### Q2: 改期后需要重新确认吗？

**A:** 是的，改期后预约状态会重置为pending，需要店铺管理员重新确认。

---

### Q3: 可以改期多少次？

**A:** 目前没有改期次数限制，但系统会记录改期次数。建议后续添加限制（如最多3次）。

---

### Q4: 取消原因是必填的吗？

**A:** 不是必填的，用户可以选择不填写取消原因。

---

### Q5: 改期时如何检测冲突？

**A:** 系统会检查：
1. 用户在新时间是否有其他预约
2. 技师在新时间是否有其他预约
3. 考虑服务时长，检查时间段是否重叠

---

## 版本历史

- **v1.0** (2026-01-04): 初始版本
  - 取消预约功能（带取消原因）
  - 改期预约功能
  - 编辑备注功能
  - 权限控制
  - 通知系统集成

---

## 技术支持

如有问题或建议，请查看：
- 后端代码：`backend/app/api/v1/endpoints/appointments.py`
- 前端代码：`frontend/src/components/AppointmentDetailsDialog.tsx`
- CRUD函数：`backend/app/crud/appointment.py`
