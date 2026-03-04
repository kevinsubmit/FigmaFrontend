# 开发更新（2026-03-03）：iOS 时间统一 ET 与 My Reviews 店铺名修复

## 本次目标
- iOS 端 `My Reviews` 页面不再显示店铺 ID，改为显示店铺名称。
- iOS 与后端预约时间逻辑继续收口：统一按美国东部时间（ET）解释与展示。
- 后端 `reschedule/create` 增加营业时间校验，禁止超营业时间或停业日预约。

## 主要改动

### 1) iOS：My Reviews 显示店铺名，不显示店铺 ID
- 文件：
  - `ios-app/NailsDashIOS/Sources/Features/Profile/ProfileRewardsViewModels.swift`
  - `ios-app/NailsDashIOS/Sources/Features/Profile/MyReviewsView.swift`
- 实现：
  - `MyReviewsViewModel` 新增 `storeNameByID` 映射。
  - 先使用评论返回中的 `store_name`；若缺失则按 `store_id` 调用店铺详情接口补查名称。
  - UI 显示优先级：`store_name` -> 补查到的店铺名 -> `Salon`（兜底）。
- 结果：
  - 页面不再出现 `Store #123`。

### 2) 后端：预约与改期增加营业时间硬校验
- 文件：
  - `backend/app/api/v1/endpoints/appointments.py`
- 实现：
  - 新增 `_ensure_within_store_business_hours(...)`。
  - 在创建预约、团单创建、团单子预约、普通更新改期、`reschedule` 接口统一接入校验。
  - 店铺停业日统一返回：`The salon is closed on this date.`
  - 超营业时间返回：`Selected time is outside salon business hours (HH:MM-HH:MM).`

### 3) iOS：预约/详情相关时间解析与展示统一 ET
- 文件：
  - `ios-app/NailsDashIOS/Sources/Features/Appointments/BookAppointmentView.swift`
  - `ios-app/NailsDashIOS/Sources/Features/Appointments/BookAppointmentViewModel.swift`
  - `ios-app/NailsDashIOS/Sources/Features/Appointments/MyAppointmentsView.swift`
  - `ios-app/NailsDashIOS/Sources/Features/Home/HomeSharedComponents.swift`
  - `ios-app/NailsDashIOS/Sources/Features/Stores/StoreDetailView.swift`
- 实现：
  - 统一使用 `America/New_York` 时区进行日期计算与展示。
  - 对“无时区”的后端时间字符串增加 `UTC fallback` 解析，再转 ET 展示。
  - 预约改期时间精度统一到分钟，避免秒级误差造成校验失败。

## 回归验证
- iOS 编译：
  - `xcodebuild -project ios-app/NailsDashIOS.xcodeproj -scheme NailsDashIOS -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build`
  - 结果：`BUILD SUCCEEDED`
- 后端语法检查：
  - `python3 -m py_compile backend/app/api/v1/endpoints/appointments.py`
  - 结果：通过

## 影响说明
- 无数据库结构变更。
- 无新增环境变量。
- 前端展示文案更清晰，预约时间与营业时间规则更一致，减少“可选时间与实际不可约”偏差。
