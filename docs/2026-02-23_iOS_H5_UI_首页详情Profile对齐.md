# 2026-02-23 iOS UI 对齐 H5（首页 / 图片详情 / Profile）

## 背景
本次根据对照截图，继续将 iOS 端视觉与 H5 端做一致化收口，不改业务接口，只做页面结构与样式对齐。

## 本次改动

### 1) 首页 Home Feed
- 去掉顶部大标题（`HOME FEED` / `Discover nail inspiration`），改为与 H5 一致的“搜索 + 分类标签”开场。
- 保留搜索、清空、标签筛选逻辑。
- 信息流卡片改为纯图片瀑布流视觉：
  - 移除卡片内标题、说明、标签、`View Detail` 文案区。
  - 保留点击进入图片详情能力。
  - 调整圆角、描边与高度节奏，贴近 H5 样式。

### 2) 图片详情页 Pin Detail
- 头图区域提升占比，强化首屏主视觉。
- 顶部控制区调整为：返回 + 收藏 + 分享。
- 将预约入口从内容区移到底部悬浮条：
  - 左侧文案：`Book this look / Find salons near you`
  - 右侧按钮：`Choose a salon`
- 内容层级优化为：头图 → 设计信息卡 → 相关推荐（如有）。

### 3) Profile 页面
- 顶部栏改为右侧操作图标（通知/设置），去掉左侧大标题，贴近 H5。
- 用户头部改为居中头像 + 用户名 + 脱敏手机号。
- 新增 VIP 风格卡片（展示等级、进度条、下一等级提示）。
- 新增 Invite 卡片（`Invite Friends, Get $10`）作为主入口位。
- 保留并下移原有 Overview / Tools / Sign Out 区域。

## 影响范围
- 仅 iOS 前端视图改动，未调整后端接口、鉴权、数据模型。
- 变更文件：
  - `ios-app/NailsDashIOS/Sources/Features/Home/HomeView.swift`

## 构建验证
已本地构建通过：

```bash
cd ios-app
xcodebuild -project NailsDashIOS.xcodeproj -scheme NailsDashIOS -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -quiet build
```

## 后续建议
- 下一轮做像素级对齐（字体粗细、行高、卡片间距、按钮高度、底部栏玻璃效果强度）。
- 对 Profile 的 VIP 数据来源可进一步接入真实等级接口，替换当前展示计算逻辑。
