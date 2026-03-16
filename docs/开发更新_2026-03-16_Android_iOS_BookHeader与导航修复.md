# 开发更新 2026-03-16：Android + iOS Book Header 与导航修复

## 本次目标
- 修复 Android 底部导航在 `Home -> 图片详情 -> Book -> Home` 路径下回不到 Home 的问题。
- 调整 Book 主入口与店铺详情页视觉，使其与 iOS 更一致。
- 同步 iOS/Android 预约弹窗头部布局。
- 修复 Android Profile 顶部头像长期 loading 的问题。

## 主要改动

### 1) Android 底部导航 Home 回跳修复
- 文件：`android-app/app/src/main/java/com/nailsdash/android/ui/NailsDashApp.kt`
- 变更：`Home` tab 点击时优先 `popBackStack("home", false)`，确保从 Book 或深层页面可以稳定回到 Home 根页。

### 2) Book 主入口去除左上角返回按钮
- 文件：
  - `android-app/app/src/main/java/com/nailsdash/android/ui/screen/StoresScreen.kt`
  - `android-app/app/src/main/java/com/nailsdash/android/ui/NailsDashApp.kt`
- 变更：为 `StoresScreen` 增加 `showBackButton` 开关，并在 Book 主 tab 入口设置为 `false`。

### 3) Android 店铺详情页背景与 Tab 字号对齐
- 文件：`android-app/app/src/main/java/com/nailsdash/android/ui/screen/BookFlowScreens.kt`
- 变更：
  - 店铺详情页根容器背景统一黑色（与 iOS `pageBackground` 对齐）。
  - `SERVICES / REVIEWS / PORTFOLIO / DETAILS` 标签字号下调，改善小屏可读性与单行稳定性。

### 4) Android Profile 头像加载修复
- 文件：`android-app/app/src/main/java/com/nailsdash/android/ui/screen/ProfileScreen.kt`
- 变更：头像渲染从 `rememberAsyncImagePainter` 切换为 `SubcomposeAsyncImage` 的状态驱动渲染，明确处理 `loading/success/error`，失败回退首字母头像，避免无限转圈。

### 5) 预约弹窗头部布局（iOS + Android 同步）
- 文件：
  - `ios-app/NailsDashIOS/Sources/Features/Appointments/BookAppointmentView.swift`
  - `android-app/app/src/main/java/com/nailsdash/android/ui/screen/BookFlowScreens.kt`
- 变更：
  - 第一排：左侧 `SERVICE SELECTION`，右侧 `NO DEPOSIT NEEDED`。
  - 第二排：金额单独一行并右对齐。
  - Android 端额外收窄 `NO DEPOSIT NEEDED` 徽章宽度并确保文案居中。

## 影响范围
- Android：Home / Book / Store Detail / Profile / Book Services Bottom Sheet。
- iOS：Book Services Bottom Sheet 头部布局。

## 回归建议
- Android 真机路径验证：`Home图片详情 -> Book -> Home`。
- Android Profile 顶部头像：正常加载与失败回退。
- iOS/Android 预约弹窗头部：两排布局、金额位置与对齐方式。
