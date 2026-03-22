# Backend Smoke 覆盖清单

更新时间：2026-03-21

## 当前入口

- 统一执行入口：`backend/run_regression_smokes.py`
- CI 工作流：`.github/workflows/backend-payment-regression.yml`
- 当前 CI 实际覆盖：`13` 条真实链路 smoke

执行命令：

```bash
cd backend
python run_regression_smokes.py
```

## 已纳入统一 runner / CI 的 smoke

### 1. payment

脚本：`backend/test_payment_regression.py`

覆盖：

- 用户注册 / 登录
- 优惠券创建 / 领取
- 礼品卡自购
- 预约创建 / 确认
- 结算：`coupon + gift card + cash split`
- 部分退款 / 全额退款
- 积分、优惠券、礼品卡回滚校验

对应主模块：

- `auth`
- `coupons`
- `gift_cards`
- `appointments`
- `points`

### 2. group-split

脚本：`backend/test_group_split_regression.py`

覆盖：

- 团单创建
- 未注册 guest / 已注册 guest 混合入组
- admin 确认预约
- 双技师 split
- host 结算
- 团单 payload / owner 归属 / split 平衡 / 积分副作用

对应主模块：

- `appointments/groups`
- `appointments/splits`
- `appointments/guest-owner`
- `appointments/settle`

### 3. upload-notification

脚本：`backend/test_upload_notification_regression.py`

覆盖：

- 头像上传
- 图片上传
- `/uploads/...` 公开访问
- 创建预约触发管理员通知
- 管理员确认预约触发顾客通知
- 通知列表 / 详情 / 未读数 / 全部已读 / 单条已读

对应主模块：

- `auth/me/avatar`
- `upload/images`
- `notifications`
- `appointments/confirm`

### 4. device-push-admin

脚本：`backend/test_device_push_admin_regression.py`

覆盖：

- device token 注册 / 归一化 / upsert
- 通知偏好关闭导致 token 失活
- 重新开启后第二 token 注册 / 注销
- super admin `test push / single push / batch push(store_id)`

对应主模块：

- `notifications/devices/register`
- `notifications/devices/unregister`
- `notifications/preferences`
- `notifications/admin/*`

### 5. coupon-referral

脚本：`backend/test_coupon_referral_regression.py`

覆盖：

- admin 创建 referral reward coupon
- admin 按手机号发 pending coupon grant
- 未注册手机号出现在 pending grants
- referee 带 referral code 注册
- 注册后自动 claim pending grant
- referrer / referee 双方收到 referral coupon
- referral stats / list / reward 状态

对应主模块：

- `coupons/grant`
- `coupons/pending-grants`
- `auth/register`
- `referrals/*`

### 6. reschedule-cancel

脚本：`backend/test_reschedule_cancel_regression.py`

覆盖：

- 用户改期
- 用户取消
- 管理员取消
- 改期次数 / 原始时间保留
- 管理员 / 顾客通知副作用

对应主模块：

- `appointments/reschedule`
- `appointments/cancel`
- `notifications`

### 7. gift-card-transfer

脚本：`backend/test_gift_card_transfer_regression.py`

覆盖：

- 礼品卡自购
- 已持有礼品卡转赠
- 错误手机号用户 claim 被拒绝
- 正确 recipient claim
- 转赠后 revoke
- transfer status 查询
- 礼品卡 summary 联动
- `gift_card_transactions` 关键事件序列

对应主模块：

- `gift_cards/purchase`
- `gift_cards/{id}/transfer`
- `gift_cards/claim`
- `gift_cards/{id}/revoke`
- `gift_cards/{id}/transfer-status`
- `gift_cards/summary`

### 8. complete-no-show

脚本：`backend/test_complete_no_show_regression.py`

覆盖：

- 预约确认后完成
- 完成后积分发放
- 完成后顾客通知
- 已完成预约不能再标记 no-show
- 已确认预约标记 no-show
- no-show 风控事件和风控状态回写
- no-show 后顾客通知
- 已取消预约不能再完成

对应主模块：

- `appointments/{id}/complete`
- `appointments/{id}/no-show`
- `points`
- `notifications`
- `risk/users`

### 9. availability-constraints

脚本：`backend/test_store_availability_constraints_regression.py`

覆盖：

- 店铺 blocked slot 创建
- blocked slot public 查询
- technician available-slots 与 blocked slot 联动
- store holiday 创建 / 查询 / available-slots 联动
- technician unavailable 创建 / 查询 / available-slots 联动
- 对应受限时段下单被拒绝
- 约束外时段仍可正常创建预约

对应主模块：

- `stores/{store_id}/blocked-slots*`
- `stores/holidays/*`
- `technicians/{technician_id}/unavailable*`
- `technicians/{technician_id}/available-slots`
- `appointments/create`

### 10. favorites

脚本：`backend/test_favorites_regression.py`

覆盖：

- pin 收藏添加 / 删除
- store 收藏添加 / 删除
- duplicate add 拒绝
- remove missing 拒绝
- `is-favorited` 联动
- `my-favorites` 联动
- `count` 联动

对应主模块：

- `pins/{pin_id}/favorite`
- `pins/{pin_id}/is-favorited`
- `pins/favorites/my-favorites`
- `pins/favorites/count`
- `stores/{store_id}/favorite`
- `stores/{store_id}/is-favorited`
- `stores/favorites/my-favorites`
- `stores/favorites/count`

### 11. technician-reassignment

脚本：`backend/test_technician_reassignment_regression.py`

覆盖：

- 非管理员改派被拒绝
- pending 预约绑定技师
- confirmed 预约改派技师
- completed 预约改派与解绑技师
- inactive 技师被拒绝
- 跨店技师被拒绝
- cancelled 预约禁止改派

对应主模块：

- `appointments/{appointment_id}/technician`
- `appointments/{appointment_id}/confirm`
- `appointments/{appointment_id}/complete`
- `appointments/{appointment_id}/cancel`

### 12. appointment-service-items

脚本：`backend/test_appointment_service_items_regression.py`

覆盖：

- 顾客读取/修改服务明细被拒绝
- `GET /services` 懒初始化 primary service item
- pending 预约新增服务明细
- confirmed 预约新增服务明细
- completed 预约删除非主服务明细
- primary service 删除被拒绝
- inactive service / 跨店 service 被拒绝
- settled / cancelled 后禁止继续增删
- `order_amount` 随服务明细汇总同步

对应主模块：

- `appointments/{appointment_id}/services`
- `appointments/{appointment_id}/confirm`
- `appointments/{appointment_id}/complete`
- `appointments/{appointment_id}/settle`
- `appointments/{appointment_id}/cancel`

### 13. home-search

脚本：`backend/test_home_search_regression.py`

覆盖：

- `pins/tags` 公共标签返回
- `pins/theme/public` 公共主题返回
- 未显式传 `tag` 时默认 feed 使用 active theme tag
- 显式传 `tag` 时返回对应分类 feed
- title search 大小写不敏感
- draft / deleted pins 不会泄漏到公共搜索结果

对应主模块：

- `GET /pins/tags`
- `GET /pins/theme/public`
- `GET /pins`

## 仓库里已有，但未纳入统一 runner / CI 的脚本

当前无。

## 当前未覆盖的高优先级链路

当前 `P1` 已清空。

## 当前未覆盖的中优先级链路

当前 `P2` 已清空。

## 当前未覆盖的低优先级链路

消费者侧 `P3` 当前无新增项。后台运营侧已拆分到独立 admin suite，见：

- `backend/run_admin_regression_smokes.py`
- `docs/开发更新_2026-03-22_Backend_AdminSmoke覆盖清单.md`

## 推荐的下一批实施顺序

1. 如需继续扩展后台链路，优先把 `admin-ops` 拆成更细的 admin smoke

## 当前结论

当前后端 smoke / CI 已经覆盖了最核心的 13 条消费者主链路：

- 预约创建与改期取消
- 团单与技师分账
- 支付结算与退款
- 上传与通知
- device token 与 admin push
- 优惠券待领取与 referral 奖励
- 礼品卡转赠 / 领取 / 撤销
- 预约完成 / no-show
- 可预约性约束
- 收藏链路
- 技师改派
- 预约服务明细增删汇总
- 首页 tags/theme/search

这套覆盖已经足以拦住“主链路直接坏掉”的大部分回归。

下一阶段如果继续扩展，建议在独立 admin suite 上继续细化，而不是再把后台链路混回 consumer suite。
