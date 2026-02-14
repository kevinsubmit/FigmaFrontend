# 2026-02-14 预约完成时间 completed_at

## 需求
当后台点击 `Complete`（完成订单）时，需要记录订单完成时间，并以点击当下时间为准。

## 实现内容

### 1. 数据库
- 新增字段：`appointments.completed_at`（可空，带索引）
- 新增 Alembic 迁移：
  - `backend/alembic/versions/20260214_110000_add_completed_at_to_appointments.py`

### 2. 后端模型与返回
- `backend/app/models/appointment.py`
  - 增加 `completed_at` 字段。
- `backend/app/schemas/appointment.py`
  - `AppointmentUpdate` 增加 `completed_at`
  - `Appointment` 响应增加 `completed_at`

### 3. 完成逻辑写入完成时间
- `backend/app/api/v1/endpoints/appointments.py`
  - `PUT /appointments/{id}/status` 当状态改为 `completed` 时写入 `completed_at=datetime.utcnow()`。
  - `PATCH /appointments/{id}/complete` 完成时写入 `completed_at=datetime.utcnow()`。
  - 团单主单状态自动推导为 `completed` 时，也补写 `completed_at`（避免漏记）。

### 4. 后台展示
- `admin-dashboard/src/api/appointments.ts`
  - Appointment 类型增加 `completed_at`。
- `admin-dashboard/src/pages/AppointmentsList.tsx`
  - 预约详情侧边栏增加 `Completed At` 展示。

## 验证结果
- 数据迁移执行成功：`alembic upgrade head`
- 后端语法检查通过
- 前端构建通过：`npm run build`
- 后端重启后接口生效

## 注意
- `completed_at` 使用 UTC 存储；前端按既有时间格式化逻辑展示（美东时区显示策略保持不变）。
