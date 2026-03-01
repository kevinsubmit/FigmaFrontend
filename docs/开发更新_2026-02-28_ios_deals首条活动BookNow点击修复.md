# 开发更新（2026-02-28）：iOS Deals 首条活动 Book Now 点击修复

## 问题现象
- iOS 前端 `Deals` 页面当活动列表有多条时，第一条活动（例如 `nice`）的 `Book Now` 点击无反应。
- 第二条及后续条目可正常跳转到店铺详情。

## 排查结论
- 后端活动数据与店铺配置正常：
  - 活动 `nice`（`id=2`）为 `store` 类型，`store_id=6`，状态有效。
  - 店铺详情与服务接口均返回 `200`。
  - 活动图片可访问（`200`）。
- 根因定位在 iOS 端列表项点击命中/导航触发链路，而非活动配置错误。

## 修复方案
文件：`ios-app/NailsDashIOS/Sources/Features/Home/HomeView.swift`

1. `Deals` CTA 跳转改为显式状态导航
- `NavigationLink` 改为 `Button + navigationDestination(isPresented:)`
- 新增状态：
  - `selectedStoreIDForNavigation`
  - `navigateToStoreDetail`
  - `navigateToStoresList`

2. 统一以活动 `store_id` 作为跳转依据
- 只要活动携带 `store_id`，即可直接跳转店铺详情。
- 不再依赖 `storesByID` 映射是否存在，避免边缘映射失配导致的“看起来不可点击”。

3. 修复列表层级与命中
- 活动卡装饰层（顶部线/边框）添加 `.allowsHitTesting(false)`。
- 活动卡增加 `.contentShape(...)`。
- 列表项按索引设置 `zIndex`，避免首条命中区域被后续卡片层级遮挡。

## 验证结果
- iOS 工程编译通过：`xcodebuild ... build` -> `BUILD SUCCEEDED`。
- 复测预期：活动列表首条/中间/末条 `Book Now` 均可正常跳转。

## 影响范围
- 仅 iOS `Deals` 页面点击与跳转链路。
- 不涉及后端接口和数据库结构变更。
