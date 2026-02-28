# 2026-02-27 iOS 登录 401 提示与 Book Services 轮播点修复

## 本次目标
1. 修复 iOS 首次登录输错密码时，错误提示被误显示为 `Session expired, please sign in again.` 的问题。
2. 修复店铺详情（STEP 02 Book Services）顶部轮播图分页点位置，改为图片底部居中显示。

## 问题原因
- iOS 网络层对所有 `401` 统一触发全局 `apiUnauthorized` 事件。
- `AppState` 监听到该事件后会执行 `forceLogout(message: sessionExpiredMessage)`。
- 导致登录接口（`/auth/login`）密码错误这种“未建立会话”场景，也被误判为“会话过期”。

## 代码调整
### 1) 登录 401 不再触发全局登出
- 文件：`ios-app/NailsDashIOS/Sources/Core/Network/APIClient.swift`
- 调整：新增 `shouldPostUnauthorizedNotification(path:method:)`。
- 规则：以下认证入口接口命中 `401` 时，不触发 `apiUnauthorized`：
  - `POST /auth/login`
  - `POST /auth/register`
  - `POST /auth/send-verification-code`
  - `POST /auth/verify-code`
  - `POST /auth/reset-password`
- 其他业务接口 `401` 行为不变，仍触发全局登录失效处理。

### 2) STEP 02 顶部轮播点改到底部居中
- 文件：`ios-app/NailsDashIOS/Sources/Features/Stores/StoreDetailView.swift`
- 调整：分页点容器使用底部对齐布局，移除右侧偏移，保留底部间距。
- 结果：分页点稳定位于轮播图底部中间，和 H5 视觉要求一致。

## 验证结果
- iOS 编译通过（`xcodebuild`）。
- 首次登录输错密码：不再出现 `Session expired...`，改为登录失败提示。
- STEP 02 轮播图分页点：显示在图片底部中间。

## 影响范围
- 仅 iOS 客户端。
- 无后端接口变更，无数据库变更。
