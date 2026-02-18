# 2026-02-18 功能更新说明（中文）

## 一、店铺封锁时段（Blocked Time）

### 1. 功能目标
- 店铺管理员可在后台设置某天某时间段不可预约（例如明天 10:00-11:00）。
- 超管也可设置（可选择目标店铺）。

### 2. 后端实现
- 新增数据表：`store_blocked_slots`
  - 字段：`store_id`、`blocked_date`、`start_time`、`end_time`、`reason`、`status`、`created_by` 等
- 新增接口（`stores`）：
  - `GET /api/v1/stores/{store_id}/blocked-slots`（管理端查询）
  - `POST /api/v1/stores/{store_id}/blocked-slots`（新增）
  - `PATCH /api/v1/stores/{store_id}/blocked-slots/{slot_id}`（更新）
  - `DELETE /api/v1/stores/{store_id}/blocked-slots/{slot_id}`（删除）
  - `GET /api/v1/stores/{store_id}/blocked-slots/public?date=YYYY-MM-DD`（H5 公开查询）
- 权限：
  - 超管可管理任意店铺
  - 店铺管理员仅可管理自己店铺
- 预约拦截：
  - 创建预约、团单、改期时，若命中封锁时段，后端拒绝并返回明确提示
  - 技师可用时段接口已纳入店铺封锁过滤

### 3. 前端实现
- 后台 `Appointments` 页面新增 `Blocked Time` 管理卡片
  - 店铺管理员：直接对自己店铺操作
  - 超管：先选店铺，再新增/删除时段
- H5 预约页读取 `blocked-slots/public` 并过滤可选时间

## 二、Dashboard 实时通知按角色隔离

### 1. 功能目标
- 超管查看所有店铺实时通知
- 店铺管理员仅查看自己店铺实时通知

### 2. 实现
- 新增接口：`GET /api/v1/dashboard/realtime-notifications`
- 数据来源：最近预约创建记录
- Dashboard 页面已改为真实接口数据，替换原静态示例文案

## 三、Coupons / Gift Cards 超管权限收口

### 1. 功能目标
- 店铺管理员看不到 `Coupons`、`Gift Cards` 页面和入口
- 只有超管可见并可访问

### 2. 实现
- More 菜单：仅超管显示入口
- 路由保护：新增 `requireSuperAdmin`，对 `/admin/coupons`、`/admin/gift-cards` 强制超管校验
- 防止手动输入 URL 越权访问
