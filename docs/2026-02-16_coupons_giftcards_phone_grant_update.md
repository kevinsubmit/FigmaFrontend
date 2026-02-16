# 2026-02-16 优惠券与礼品卡发放能力更新（中文）

## 本次目标
- 后台支持按手机号发放优惠券/礼品卡，兼容未注册手机号。
- 完善 Coupons 管理：模板创建、模板编辑、状态开关、单发/批量发放、待领取管理。
- H5 端优化优惠券展示，避免重复文案。

## 主要功能更新

### 1. Coupons：按手机号发放（兼容未注册）
- `POST /api/v1/coupons/grant`
- 结果分两类：
  - `granted`：手机号已注册，直接发放到账户。
  - `pending_claim`：手机号未注册，写入待领取并发送短信提示。

### 2. Coupons：批量发放
- `POST /api/v1/coupons/grant/batch`
- 入参：`coupon_id + phones[]`
- 返回：总数、成功数、待领取数、失败数及逐条结果。
- 后台页面新增失败明细表，展示手机号/状态/失败原因/SMS结果。

### 3. Coupons：待领取管理
- `GET /api/v1/coupons/pending-grants`
- `POST /api/v1/coupons/pending-grants/{grant_id}/revoke`
- 后台页面可查看并撤销待领取记录。

### 4. 注册/登录自动领取待领取券
- 用户注册成功后自动领取该手机号对应的待领取券。
- 用户登录时也会自动补领一次。

### 5. Coupons 模板管理增强（Description 可填可改）
- 新增模板创建区：支持填写 `Description`。
- 模板列表新增编辑功能，支持修改：
  - `name/type/category/discount/min/max/valid_days/description/is_active`
- 列表支持行内 `Active/Inactive` 一键切换。

### 6. 路由冲突修复
- 优惠券详情路径调整为：`GET /api/v1/coupons/id/{coupon_id}`
- 避免与 `/pending-grants` 等固定路径冲突导致 422。

### 7. Gift Cards：按手机号发放指定金额
- 后台 Gift Cards 页面新增发放表单：手机号 + 金额 + 可选留言。
- 调用 `POST /api/v1/gift-cards/purchase` 完成发放。

### 8. 审计日志落库
- 新增/补齐以下操作日志：
  - `coupon.template.create`
  - `coupon.template.update`
  - `coupon.grant.phone`
  - `coupon.grant.batch`
  - `gift_card.issue.phone`
  - `gift_card.purchase`

### 9. H5 优惠券页面优化
- `My Coupons` 去除重复文案显示（避免 `$5 OFF` 重复两行）。

## 数据库变更
- 新增表：`coupon_phone_grants`
- 迁移文件：
  - `20260214_130000_add_appointment_settlement_fields.py`
  - `20260214_140000_add_appointment_settlement_events.py`
  - `20260216_220000_add_coupon_phone_grants.py`

## 运营使用建议
1. 发固定金额给单个手机号：用 `Quick Create & Grant`。
2. 给一批手机号发已有模板：用 `Batch Grant`。
3. 给手机号发礼品卡：在 Gift Cards 页面使用 `Issue Gift Card to Phone`。
4. 先关注 Pending 列表，跟进未注册手机号的领取状态。
