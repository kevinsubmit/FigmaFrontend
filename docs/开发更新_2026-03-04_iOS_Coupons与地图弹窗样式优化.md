# 开发更新（2026-03-04）iOS Coupons 与地图弹窗样式优化

## 本次目标
- 清理 `My Coupons` 顶部视觉噪音，和 H5 风格保持一致。
- 优化 iOS 地址点击后的地图选择弹窗样式，替换系统默认样式。

## 已完成内容

### 1) My Coupons 页面视觉收口
文件：`ios-app/NailsDashIOS/Sources/Features/Profile/CouponsView.swift`

- 去掉顶部小点与 `COUPONS` 标题文案。
- 去掉 `Available / Used / Expired` 按钮父容器外边框。
- 去掉该区域顶部黄色上边框。

结果：顶部更简洁，标签切换区域与 H5 视觉更统一。

### 2) 地址点击地图弹窗改为自定义 H5 风格
文件：
- `ios-app/NailsDashIOS/Sources/Features/Stores/StoreDetailView.swift`
- `ios-app/NailsDashIOS/Sources/Features/Appointments/MyAppointmentsView.swift`

- 将系统 `confirmationDialog` 替换为自定义底部弹层（sheet）。
- 弹层统一为：标题 `Open in Maps` + 两个大按钮（Google Maps / Apple Maps）+ 底部 Cancel。
- 保持原有地图打开逻辑不变（Google App 优先，回退 Web；Apple Maps 直开）。
- 按最新需求，弹层顶部仅保留一条白色拖拽横条，移除第二条灰色横条。

结果：地图选择交互与 H5 更接近，视觉一致性提升。

## 验证
- 本地编译验证：
  - `xcodebuild -project ios-app/NailsDashIOS.xcodeproj -scheme NailsDashIOS -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build`
  - 结果：`BUILD SUCCEEDED`

## 影响范围
- 仅 iOS 前端 UI/交互层调整。
- 无后端接口变更。
- 无数据库变更。
