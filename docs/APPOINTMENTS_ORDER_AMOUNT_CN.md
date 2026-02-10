# 预约订单金额（后台）说明

## 功能范围

- 后台 `appointments` 页面展示订单金额（`Amount` 列）。
- 右侧 `Appointment Detail` 支持修改订单金额。
- 店铺管理员只能修改自己店铺的预约订单金额；超管可修改任意店铺。

## 数据字段

- 新增数据库字段：`appointments.order_amount`（`Float`，可空）
- 兼容策略：若 `order_amount` 为空，前端展示回退到 `service_price`。

## 接口

- 新增接口：`PATCH /api/v1/appointments/{appointment_id}/amount`
- 请求体：
  - `order_amount: float`
- 约束：
  - 金额不得小于 `0`
  - 必须是超管或已审核通过的店铺管理员
  - 店铺管理员仅允许修改自己店铺的预约

## 业务影响

- 在“完成预约”时，优惠券适配金额与积分奖励金额将优先使用 `order_amount`。
- 若未设置 `order_amount`，继续回退使用服务价格 `service_price`。

## 审计日志

- 修改金额会记录审计日志：`appointment.amount.update`。
