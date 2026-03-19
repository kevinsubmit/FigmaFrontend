# 开发更新 2026-03-18：三端 Profile 摘要回退与 Android Book Header 贴顶

## 背景

- 线上/本地环境中 `GET /api/v1/profile/summary` 尚未稳定可用，Android `Profile` 页面出现 `notice: not found`，并导致 `points / coupons / gift cards / orders / reviews / favorites` 等摘要数据异常回落为 `0`。
- Android `Book` 页顶部 `STEP 01 / Choose a salon` 与店铺详情页顶部 `STEP 02 / Book Services` 视觉上距离顶部过远，与 iOS 不一致。

## 本次改动

### 1. Android `ProfileCenter` 回退到老接口聚合

- 不再通过 `/profile/summary` 读取 `ProfileCenter` 首页摘要。
- 主摘要改为并发聚合以下老接口：
  - `/notifications/stats/unread-count`
  - `/points/balance`
  - `/pins/favorites/count`
  - `/vip/status`
- 次摘要改为并发聚合以下老接口：
  - `/coupons/my-coupons?status=available`
  - `/gift-cards/summary`
  - `/reviews/my-reviews`
- 保留 `gift-cards/summary` 的 Retrofit DTO 与仓储缓存，便于礼品卡余额继续走轻量接口。

涉及文件：

- `android-app/app/src/main/java/com/nailsdash/android/data/model/ProfileModels.kt`
- `android-app/app/src/main/java/com/nailsdash/android/data/network/NailsDashApi.kt`
- `android-app/app/src/main/java/com/nailsdash/android/data/repository/ProfileRepository.kt`

### 2. iOS `ProfileCenter` 回退到老接口聚合

- `ProfileCenterSummaryService` 不再调用 `/profile/summary`。
- 主摘要改为并发读取未读数、积分、收藏数、VIP。
- 次摘要改为并发读取 coupons、gift cards summary、reviews。
- 在 `ProfileRewardsService` 中补充：
  - 未读数缓存
  - gift card summary 缓存
- 移除与 `profileSummaryCache` 的耦合，避免写操作错误清空无效缓存。

涉及文件：

- `ios-app/NailsDashIOS/Sources/Features/Profile/ProfileCenterView.swift`
- `ios-app/NailsDashIOS/Sources/Features/Profile/ProfileRewardsModels.swift`
- `ios-app/NailsDashIOS/Sources/Features/Profile/ProfileRewardsService.swift`

### 3. H5 `Profile` 首页回退到老接口

- `frontend/src/components/Profile.tsx` 恢复为 `Promise.allSettled(...)` 老接口组合加载：
  - unread count
  - points balance
  - my coupons
  - my appointments
  - my reviews
  - favorite pins count
  - gift cards summary
  - vip status
- 不再优先请求 `/profile/summary`，避免首页摘要直接报错或展示为 `0`。

涉及文件：

- `frontend/src/components/Profile.tsx`

### 4. Android `Book` 顶部 Header 贴顶

- `StoresScreen` 与 `BookFlowScreens` 的 `Scaffold` 内容不再使用顶部 `innerPadding`，仅保留底部 `innerPadding`。
- 这样 `STEP 01 / Choose a salon`、`STEP 02 / Book Services` 会贴近页面顶部，更接近 iOS 视觉层级。
- 同时保留与 iOS 对齐的标题字号、间距、返回按钮尺寸。

涉及文件：

- `android-app/app/src/main/java/com/nailsdash/android/ui/screen/StoresScreen.kt`
- `android-app/app/src/main/java/com/nailsdash/android/ui/screen/BookFlowScreens.kt`

## 验证

已完成以下验证：

```bash
cd android-app && ./gradlew :app:assembleDebug -x lint
```

```bash
xcodebuild -project ios-app/NailsDashIOS.xcodeproj \
  -scheme NailsDashIOS \
  -configuration Debug \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO build
```

```bash
cd frontend && npm run build
```

均已通过。

## 备注

- 后端 `/api/v1/profile/summary` 接口本次未删除，仅客户端 `ProfileCenter` 暂停使用。
- 本次提交未包含 `.idea/` 与 `android-app/.idea/misc.xml` 等本地 IDE 环境文件。
