# 开发更新：预约风控与爽约处理（2026-02-08）

## 本次目标
在不影响现有预约主流程的前提下，先落地以下能力：
1. 预约接口增加基础风控拦截（频率限制、日预约上限、临时限制）
2. 后台增加风控管理页（超管可查看/手动限制）
3. 后台预约详情支持标记 `No Show`（爽约）
4. 风控事件留痕，支持后续审计与策略迭代

## 后端变更

### 1) 新增风控数据模型
- `backend/app/models/risk.py`
  - `UserRiskState`：用户聚合风险状态
  - `RiskEvent`：风控事件流水

- `backend/alembic/versions/20260208_183000_add_risk_control_tables.py`
  - 新增表：`user_risk_states`、`risk_events`
  - 增加常用查询索引（用户、事件类型、创建时间、IP）

### 2) 新增风控服务
- `backend/app/services/risk_service.py`
  - `evaluate_booking_request(...)`：预约前校验
    - 用户维度限流（1分钟/1小时）
    - IP 维度限流（1分钟/1小时）
    - 同用户单日预约上限
    - 受限用户（`restricted_until`）直接拒绝
  - `log_risk_event(...)`：写入风险事件
  - `refresh_user_risk_state(...)`：按近7天取消/近30天爽约刷新风险等级
  - `restrict_user(...)` / `unrestrict_user(...)` / `set_user_risk_level(...)`

### 3) 预约接口接入风控
- `backend/app/api/v1/endpoints/appointments.py`
  - 创建预约前调用风控评估，命中策略返回 4xx
  - 创建成功记录 `appointment_created`
  - 拦截记录 `booking_blocked`
  - 取消预约/后台取消后刷新用户风险状态

### 4) 新增 No Show 接口
- `POST /api/v1/appointments/{appointment_id}/no-show`
  - 仅门店管理员/超管可操作
  - 当前状态体系下以 `cancelled + cancel_reason='No show'` 落库
  - 记录 `appointment_no_show` 风险事件并刷新风险状态
  - 触发取消通知与提醒清理

### 5) 新增风控管理接口
- `backend/app/api/v1/endpoints/risk.py`
  - `GET /api/v1/risk/users`：查询用户风险状态
  - `PATCH /api/v1/risk/users/{user_id}`：
    - `restrict_24h`
    - `unrestrict`
    - `set_level`

- `backend/app/api/v1/api.py`
  - 注册路由：`/api/v1/risk`

## 管理后台变更

### 1) 新增 Risk Control 页面
- `admin-dashboard/src/pages/RiskControl.tsx`
  - 支持按用户名/手机号搜索
  - 支持风险等级过滤、仅看受限用户
  - 支持 `Restrict 24h` / `Unrestrict`

- `admin-dashboard/src/api/risk.ts`
  - 对应风险查询与操作 API 封装

### 2) 页面入口与路由
- `admin-dashboard/src/App.tsx`
  - 新增路由：`/admin/risk-control`

- `admin-dashboard/src/pages/More.tsx`
  - 超管菜单新增 `Risk Control`

### 3) 预约详情新增 No Show 按钮
- `admin-dashboard/src/pages/AppointmentsList.tsx`
- `admin-dashboard/src/api/appointments.ts`
  - 新增 `markAppointmentNoShow(id)` 调用

## H5 修复（本批次同步）
- `frontend/src/components/StoreDetails.tsx`
  - 用户修改预约日期/时间后，自动清除旧的 past-time 错误提示，避免误导

## 验证情况
- 后端关键文件已通过 `py_compile`
- 管理后台 `npm run build` 通过
- Alembic 迁移已执行通过（新增风控表）

## 当前已知边界
1. `No Show` 目前复用 `cancelled` 状态，通过 `cancel_reason='No show'` 区分。
2. 风控阈值为当前固定配置，后续建议抽到配置中心/环境变量。
3. 目前风控管理页以超管能力为主，后续可考虑细粒度权限（只读/可操作分离）。

