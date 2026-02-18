# 2026-02-17 Appointments 新客与技师预约标记

## 本次目标
在后台管理 Appointments 列表中，让运营一眼识别：
1. 新客订单（NEW）
2. 指定技师订单（Tech）

## 变更内容

### 1) 后端新增新客标识字段
文件：`backend/app/schemas/appointment.py`
- 在 `AppointmentWithDetails` 中新增字段：`is_new_customer`。

文件：`backend/app/api/v1/endpoints/appointments.py`
- 在 `/api/v1/appointments/admin` 返回数据时补充 `is_new_customer`。

### 2) 新客判定规则（按最新业务口径）
- 若该用户历史预约中存在任意一条 `completed` 订单：`is_new_customer=false`
- 若该用户历史没有 `completed` 订单：`is_new_customer=true`

> 说明：
> 该规则优先于“是否首单”概念，完全按“是否有过完成单”判定。

### 3) 前端列表展示标记
文件：`admin-dashboard/src/api/appointments.ts`
- `Appointment` 类型新增：`is_new_customer?: boolean | null`

文件：`admin-dashboard/src/pages/AppointmentsList.tsx`
- 左侧 Timeline 卡片右上角新增标签：
  - `New`：新客订单
  - `Tech`：该订单指定了技师（`technician_id` 有值）
- 右侧列表 `Customer` 单元格右上角同样展示 `New` / `Tech`。

## 使用说明
- 看到 `New`：表示该用户还没有任何完成订单。
- 看到 `Tech`：表示该订单下单时已指定技师，不是“Any”。

## 验证建议
1. 用一个无 completed 历史的用户下单，查看是否显示 `New`。
2. 将该用户任一订单改为 `completed`，刷新后该用户订单不再显示 `New`。
3. 指定技师下单与不指定技师下单对比，确认 `Tech` 标签差异。
