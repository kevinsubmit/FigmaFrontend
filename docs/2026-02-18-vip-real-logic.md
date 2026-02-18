# VIP 等级改造说明（2026-02-18）

## 目标
- 把 H5 端 Profile/Settings 的 VIP 等级从前端写死改为后端实时计算。

## 后端改动
- 新增接口：
  - `GET /api/v1/vip/levels`：返回 VIP 等级配置
  - `GET /api/v1/vip/status`：返回当前登录用户的 VIP 实时状态
- 计算口径（基于 `appointments`）：
  - 仅统计 `status = completed` 的订单
  - 消费金额优先取 `final_paid_amount`，若为 0 则回退到 `order_amount`
  - 访问次数为 completed 订单数量
  - 等级取“同时满足 `min_spend` + `min_visits`”的最高档

## 前端改动
- 新增 `vip.service.ts` 对接后端 VIP 接口。
- `Profile` 页面：
  - VIP 等级、权益、升档进度改为后端返回实时数据。
- `Settings` 页面：
  - `VIP Membership` 右侧徽标改为实时等级（如 `VIP 2`）。

## 影响说明
- 未登录时不会请求 VIP 状态。
- 若 VIP 接口异常，页面保留安全兜底，不影响其他资料展示。
