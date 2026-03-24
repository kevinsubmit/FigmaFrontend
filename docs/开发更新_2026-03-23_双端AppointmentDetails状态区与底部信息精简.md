# 双端 Appointment Details 状态区与底部信息精简

本次更新覆盖 iOS 与 Android 的 `Appointment Details` 页面。

## 变更内容

### 1. 顶部 Status 区域精简
- 去掉店名
- 去掉服务名
- 仅保留 `STATUS` 标题和当前状态标签

### 2. 页面底部信息精简
- 去掉 `Notes` 区域下面的金额展示
- 去掉 `Notes` 区域下面的时长（duration）展示

## 修改文件

### Android
- `android-app/app/src/main/java/com/nailsdash/android/ui/screen/AppointmentDetailScreen.kt`

### iOS
- `ios-app/NailsDashIOS/Sources/Features/Appointments/MyAppointmentsView.swift`

## 验证
- Android: `./gradlew :app:assembleDebug -x lint`
- iOS: `xcodebuild -project ios-app/NailsDashIOS.xcodeproj -scheme NailsDashIOS -configuration Debug -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build`

结果：通过。
