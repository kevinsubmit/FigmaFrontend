# 开发更新 2026-03-18：双端 Appointment 详情与预约列表对齐

## 本次范围

- iOS `Appointment Details` 弹窗主界面按 Android 当前版本重排
- iOS / Android `Appointment Details` 的 `Open in Maps` 调整为整行可点
- Android 店铺详情页顶部收藏按钮补齐和图片详情页一致的顶部 toast 提示
- Android `Appointments` 列表卡片向 iOS 结构对齐，补齐完整地址与服务元信息布局
- Android `Appointment Details` 底部操作区补齐 `Close`，并将 `Reschedule` 调整为黄色实心按钮

## 代码变更

### iOS

- `ios-app/NailsDashIOS/Sources/Features/Appointments/MyAppointmentsView.swift`
  - `AppointmentDetailView` 内容结构调整为：
    - `Status`
    - `Date / Time / Technician / Order`
    - `Location + Open in Maps`
    - `Notes`
    - `Cancel Reason`
    - `Price / Duration chips`
  - 底部操作区调整为：
    - 顶部说明文案
    - 第一行 `Reschedule` / `Cancel`
    - 第二行 `Close`
  - `Open in Maps` 改为整块按钮可点击，不再只有文字区域生效
  - 详情页状态色、店铺名/服务名兜底、金额格式与 Android 对齐

### Android

- `android-app/app/src/main/java/com/nailsdash/android/ui/screen/AppointmentDetailScreen.kt`
  - `Open in Maps` 改为全宽按钮
  - 底部操作区新增 `Close`
  - `Reschedule` 改为黄色实心按钮

- `android-app/app/src/main/java/com/nailsdash/android/ui/screen/BookFlowScreens.kt`
  - 店铺详情页顶部收藏按钮补齐非阻塞 toast
  - 提示文案与图片详情页保持一致：
    - `Added to favorites.`
    - `Removed from favorites.`
    - `Please sign in to save favorites.`

- `android-app/app/src/main/java/com/nailsdash/android/ui/state/BookFlowViewModels.kt`
  - 店铺详情收藏切换改为 `suspend` 返回结果
  - UI 层可根据真实收藏状态决定是否弹成功/失败 toast
  - 补齐“already in favorites / not in favorites”兼容恢复逻辑

- `android-app/app/src/main/java/com/nailsdash/android/ui/screen/AppointmentsScreen.kt`
  - 预约列表地址改为整段展示并保持可点打开地图
  - 服务名下方的金额 / 时长 / 技师收为同一行
  - 技师图标统一改为人头
  - 布局结构向 iOS 对齐

- `android-app/app/src/main/java/com/nailsdash/android/ui/state/AppointmentsViewModel.kt`
  - 预约列表的店铺地址 enrichment 改为优先使用店铺详情 `formattedAddress`
  - 补齐 zip code
  - 避免不完整的预约接口地址覆盖完整店铺详情地址

## 验证

- Android
  - `JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home' ./gradlew :app:assembleDebug -x lint`
  - 结果：`BUILD SUCCESSFUL`

- iOS
  - `xcodebuild -project /Users/fengliangli/code/FigmaFrontend/ios-app/NailsDashIOS.xcodeproj -scheme NailsDashIOS -configuration Debug -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build`
  - 结果：`BUILD SUCCEEDED`

## 备注

- 本次未纳入 `.idea/` 和 `android-app/.idea/misc.xml` 这类本地 IDE 文件
