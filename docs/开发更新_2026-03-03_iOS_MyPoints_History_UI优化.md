# 开发更新（2026-03-03）：iOS My Points History 列表 UI 优化

## 本次目标
- 优化 iOS 端 `My Points` 页面底部 `History` 列表视觉表现。
- 列表样式向 H5 端对齐，提升可读性与层级清晰度。

## 主要改动

### 1) History 列表行样式收口（iOS）
文件：`ios-app/NailsDashIOS/Sources/Features/Home/HomeView.swift`

- 调整左侧趋势图标：
  - 使用更紧凑的圆形状态图标（上涨/下跌）。
  - 上涨为绿色，下跌为红色。
- 调整中间文本层级：
  - 第一行显示原因（格式化后文案）。
  - 第二行显示描述（如有）。
  - 第三行显示日期。
- 调整右侧分值展示：
  - 仅展示 `+N / -N` 数值，去掉 `pts` 次级标记。
  - 右侧字号与颜色对比优化，和 H5 视觉更接近。
- 调整行内间距与分隔线缩进，避免视觉拥挤。

### 2) 原因文案可读化
文件：`ios-app/NailsDashIOS/Sources/Features/Home/HomeView.swift`

- 新增/使用 `formattedPointsReason(_:)`：
  - 自动将 `_` / `-` 替换为空格。
  - 空字符串回退为 `Points update`。

### 3) 并入提交的模型字段（无接口协议变更）
文件：`ios-app/NailsDashIOS/Sources/Features/Appointments/AppointmentModels.swift`

- `AppointmentDTO` 增加字段：
  - `review_id`
  - `completed_at`
- 提供显式初始化器，便于本地构造与视图层编排。

> 说明：该模型改动为客户端数据消费侧增强，不改变后端接口定义。

## 验证结果

已执行：

```bash
xcodebuild -project ios-app/NailsDashIOS.xcodeproj \
  -scheme NailsDashIOS \
  -destination 'generic/platform=iOS Simulator' build
```

结果：`BUILD SUCCEEDED`

## 影响范围
- 仅 iOS 客户端界面与模型层。
- 不涉及数据库变更。
- 不涉及后端接口变更。
