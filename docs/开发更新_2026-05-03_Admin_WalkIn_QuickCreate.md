# 开发更新（2026-05-03）：后台 Walk-in Quick Create

## 本次目标

为后台管理系统补一条独立的前台建单链路，让没有提前预约、直接进店的客户可以被快速录入系统，并继续复用现有 `appointment / settlement / complete / refund` 流程。

## 设计结论

- 不复用用户端 `POST /appointments`
- 单独提供 admin-only walk-in 接口
- 预约来源新增 `booking_source`
- walk-in 默认创建为 `confirmed`
- 店铺管理员只能为自己门店建单，超管可跨店
- 新手机号支持自动创建轻量客户档案

## 后端改动

### 1. appointments 新增来源字段

- 新增列：`booking_source`
- 默认值：`customer_app`
- walk-in 取值：`admin_walk_in`

迁移文件：
- `backend/alembic/versions/20260503_000100_add_appointment_booking_source.py`

### 2. 新增后台 walk-in 接口

- `GET /api/v1/appointments/admin/walk-in/customer-search`
- `POST /api/v1/appointments/admin/walk-in`

行为：
- 手机号精确搜索老客
- 找不到则自动创建轻量客户
- 创建预约时打标：
  - `status=confirmed`
  - `booking_source=admin_walk_in`
  - `booked_by_user_id=<当前管理员>`
- 默认 `skip_notifications=true`，避免前台现场录入时误发客户通知

## 后台管理系统改动

### Appointments 页面新增 `New Walk-in`

位置：
- `Appointments` 页面右上角

交互：
1. 输入手机号并搜索客户
2. 老客显示摘要信息
3. 新客补姓名
4. 选择门店 / 服务 / 技师 / 日期 / 时间
5. 保存为 walk-in appointment

文件：
- `admin-dashboard/src/components/WalkInQuickCreateDrawer.tsx`
- `admin-dashboard/src/pages/AppointmentsList.tsx`
- `admin-dashboard/src/api/appointments.ts`

## 回归

新增 admin smoke：
- `backend/test_walk_in_regression.py`

覆盖：
- 新手机号搜索为空
- walk-in 创建成功
- 自动创建轻量客户
- `booking_source=admin_walk_in`
- `booked_by_user_id` 正确落库
- 同手机号再次搜索能命中新客户

并接入：
- `backend/run_admin_regression_smokes.py`

## 当前边界

v1 只解决“快速录入”。

未包含：
- 候位队列
- 电话预约来源
- 到店 check-in 独立状态
- 复杂通知策略
- 前台批量建单

## 影响

上线后可以明确区分：
- 客户自助预约
- H5 预约
- 后台 walk-in 建单

后续报表可以直接按 `booking_source` 做来源拆分。
