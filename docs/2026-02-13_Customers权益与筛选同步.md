# 2026-02-13 Customers权益与筛选同步

## 背景
后台管理 `Customers` 详情抽屉需要展示用户权益相关信息：
- 积分（Points）
- 积分明细变化（Point Transactions）
- 优惠券（Coupons）
- 礼品卡（Gift Cards）

并支持筛选、刷新后保留筛选状态，以及后端版本未升级时的前端兼容提示。

## 后端改动
文件：`backend/app/api/v1/endpoints/customers.py`

新增接口：
- `GET /api/v1/customers/admin/{customer_id}/rewards`

返回结构：
- `points`: `total_points`, `available_points`
- `point_transactions`: 最近积分明细
- `coupons`: 用户优惠券列表
- `gift_cards`: 用户礼卡列表

支持筛选参数：
- `point_type`: `earn` / `spend`
- `coupon_status`: `available` / `used` / `expired`
- `coupon_validity`: `valid` / `expired`
- `gift_card_status`: `active` / `pending_transfer` / `expired` / `revoked`

## 前端改动
文件：
- `admin-dashboard/src/api/customers.ts`
- `admin-dashboard/src/pages/Customers.tsx`

### 1) Customers详情新增权益区块
- Points 区块：总积分、可用积分、积分明细
- Coupons 区块：券名称、状态、有效期
- Gift Cards 区块：卡号、余额、状态、有效期

### 2) 筛选改为服务端过滤
筛选变化后，前端重新请求 `/rewards` 接口，并携带对应筛选参数。

### 3) URL Query 同步
新增 URL 参数同步：
- `customer_id`
- `pt`（积分类型）
- `cs`（优惠券状态）
- `cv`（优惠券有效性）
- `gs`（礼卡状态）

效果：
- 刷新页面后可恢复筛选状态
- 带 `customer_id` 访问时自动打开对应客户详情

### 4) 旧后端兼容
当后端尚未提供 `/rewards`（返回 404）时：
- 页面不再中断
- 显示友好提示（后端版本未升级）
- 权益区块显示空数据占位

## 部署/运行注意
如果前端出现：
- `GET /api/v1/customers/admin/{id}/rewards 404`

说明后端仍在运行旧代码，需要：
1. 停止旧后端进程
2. 使用当前代码重新启动后端
3. 通过 `/api/openapi.json` 确认已存在 `/api/v1/customers/admin/{customer_id}/rewards`

建议启动命令：
```bash
cd /Users/fengliangli/code/FigmaFrontend/backend
python3.11 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
