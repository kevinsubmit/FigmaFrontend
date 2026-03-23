# 三端 Transaction History 完成时间与 Android 时间统一

本次更新覆盖 Android、iOS、H5 三端的 `Transaction History / Order History` 展示，以及 Android 端通用时间格式统一。

## 变更内容

### 1. 三端 Completed Orders 列表改为显示完成时间
- 完成订单列表不再显示订单号
- 列表时间改为显示 `completed_at`
- 列表排序同步按完成时间倒序，而不是按预约时间

### 2. Android 时间展示统一到和 iOS 一致的解析策略
新增统一时间工具：
- `AppDateTimeFormatterCache`

统一规则：
- 服务端带时区时间戳：按原始时区解析，再转换到当前展示时区
- 服务端无时区时间戳：按 UTC 解析，再转换到当前展示时区
- 预约流程中的本地日期/时间字段：继续按预约原始日期和时间展示，不混入 UTC 转换

### 3. Android 同步修正的页面
- `Transaction History / Order History`
- `Notifications`
- `Deals`
- 店铺详情评论日期
- `Appointments` 列表与详情页日期/时间展示

## 主要文件

### Android
- `android-app/app/src/main/java/com/nailsdash/android/utils/AppDateTimeFormatterCache.kt`
- `android-app/app/src/main/java/com/nailsdash/android/ui/screen/ProfileDetailScreens.kt`
- `android-app/app/src/main/java/com/nailsdash/android/ui/state/ProfileViewModels.kt`
- `android-app/app/src/main/java/com/nailsdash/android/ui/screen/NotificationsScreen.kt`
- `android-app/app/src/main/java/com/nailsdash/android/ui/screen/DealsScreen.kt`
- `android-app/app/src/main/java/com/nailsdash/android/ui/screen/BookFlowScreens.kt`
- `android-app/app/src/main/java/com/nailsdash/android/ui/screen/AppointmentsScreen.kt`
- `android-app/app/src/main/java/com/nailsdash/android/ui/screen/AppointmentDetailScreen.kt`

### iOS
- `ios-app/NailsDashIOS/Sources/Features/Profile/OrderHistoryView.swift`
- `ios-app/NailsDashIOS/Sources/Features/Profile/ProfileRewardsViewModels.swift`

### H5
- `frontend/src/components/OrderHistory.tsx`

## 验证
- Android: `./gradlew :app:assembleDebug -x lint`
- iOS: `xcodebuild -project ios-app/NailsDashIOS.xcodeproj -scheme NailsDashIOS -configuration Debug -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build`
- H5: `npm run build`

结果：全部通过。
