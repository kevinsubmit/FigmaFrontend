# 2026-02-27 iOS Step 02（Book Services）底部导航显示修复

## 背景
- 用户反馈：从 `STEP 01 Choose a salon` 进入 `STEP 02 Book Services` 后，底部标签导航栏仍然显示。
- 预期：`STEP 02` 作为二级页面，应隐藏底部导航栏。

## 根因
- `StoresListView` 在根层使用了：
  - `.toolbar(effectiveHideTabBar ? .hidden : .visible, for: .tabBar)`
- 当 `effectiveHideTabBar == false` 时，父层会强制 `visible`，可能覆盖子页面 `StoreDetailView` 的隐藏设置。

## 修复内容
文件：`ios-app/NailsDashIOS/Sources/Features/Stores/StoresListView.swift`

1. 调整父层 tabBar 策略：
- 从：`.toolbar(effectiveHideTabBar ? .hidden : .visible, for: .tabBar)`
- 改为：`.toolbar(effectiveHideTabBar ? .hidden : .automatic, for: .tabBar)`

2. 在进入 `StoreDetailView` 的跳转目标上显式隐藏 tabBar：
- `StoreDetailView(storeID: store.id)`
- 改为：`StoreDetailView(storeID: store.id).toolbar(.hidden, for: .tabBar)`

## 验证
- 本地编译：`BUILD SUCCEEDED`
- 验证路径：
  1. 进入 `STEP 01 Choose a salon`
  2. 点击店铺进入 `STEP 02 Book Services`
  3. 确认底部标签导航栏已隐藏

## 影响评估
- 仅 iOS 前端视图层改动，无接口、数据库、后端逻辑变更。
- 不影响主 Tab 首页的正常显示与切换。
