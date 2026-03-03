# 推送中心（后台管理）

## 1. 功能概述

后台新增 **Push Center（推送中心）**，用于由超管向 iOS 用户发送 APNs 推送。

支持两种方式：

- 单用户推送：指定 `user_id` 发送
- 批量推送：
  - 按用户 ID 列表发送
  - 按店铺发送（给该店铺有历史预约的用户发送）

## 2. 权限规则

- 仅 **超级管理员** 可访问
- 店铺管理员无入口、无接口权限

## 3. 后台页面入口

- 页面路径：`/admin/push-center`
- 页面入口：`More -> Push Center`

## 4. 后端接口

### 4.1 单用户推送

- `POST /api/v1/notifications/admin/send`

请求体：

```json
{
  "user_id": 123,
  "title": "NailsDash Notice",
  "message": "You have a new update from NailsDash."
}
```

响应示例：

```json
{
  "detail": "Push sent",
  "target_user_id": 123,
  "sent": 1,
  "failed": 0,
  "deactivated": 0
}
```

### 4.2 批量推送

- `POST /api/v1/notifications/admin/send-batch`

模式 A：按用户 ID 列表

```json
{
  "user_ids": [1, 2, 3],
  "title": "NailsDash Update",
  "message": "Please check your latest updates in NailsDash.",
  "max_users": 200
}
```

模式 B：按店铺用户

```json
{
  "store_id": 6,
  "title": "NailsDash Update",
  "message": "Please check your latest updates in NailsDash.",
  "max_users": 200
}
```

响应示例：

```json
{
  "detail": "Batch push processed",
  "target_user_count": 120,
  "sent_user_count": 95,
  "failed_user_count": 8,
  "skipped_user_count": 17,
  "sent": 130,
  "failed": 12,
  "deactivated": 3,
  "truncated": false
}
```

## 5. 统计字段说明

- `target_user_count`：本次实际处理的目标用户数
- `sent_user_count`：至少有 1 个 token 发送成功的用户数
- `failed_user_count`：token 发送失败的用户数
- `skipped_user_count`：无可用 token/未开启推送等被跳过的用户数
- `sent`：token 维度发送成功总数
- `failed`：token 维度发送失败总数
- `deactivated`：被 APNs 判定失效并已自动停用的 token 数
- `truncated`：目标用户超过 `max_users` 后是否被截断

## 6. 使用建议

- 运营群发前先用单用户发送自测
- 批量推送优先用 `max_users` 控制发送规模（例如先 50 再全量）
- 若 `sent=0`，优先检查：
  - 用户是否有有效 iOS 设备 token
  - 用户是否开启推送
  - 服务端 APNs 配置是否正确
