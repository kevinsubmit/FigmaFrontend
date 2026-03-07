# 开发更新（2026-03-06）：iOS App Icon 与应用显示名调整

## 背景
iOS 真机桌面图标出现黑色外圈视觉问题；同时需要将手机桌面应用名称统一为 `NailsDash`。

## 本次变更

### 1) App Icon 资源重建（iOS）
- 新增并接入 `Assets.xcassets` 资源目录。
- 新建 `AppIcon.appiconset`，补齐 iPhone / iPad / App Store 所需尺寸。
- 图标风格按登录页 logo 视觉统一（去除外圈黑底，避免系统圆角裁切后出现黑框）。

涉及路径：
- `ios-app/NailsDashIOS/Resources/Assets.xcassets/Contents.json`
- `ios-app/NailsDashIOS/Resources/Assets.xcassets/AccentColor.colorset/Contents.json`
- `ios-app/NailsDashIOS/Resources/Assets.xcassets/AppIcon.appiconset/*`

### 2) Xcode 工程资源接入
- 在 `project.pbxproj` 中新增 `Assets.xcassets` 文件引用。
- 新增 app target 的 `Resources Build Phase` 并纳入 `Assets.xcassets`。

涉及路径：
- `ios-app/NailsDashIOS.xcodeproj/project.pbxproj`

### 3) 手机桌面显示名
- 新增 `CFBundleDisplayName = NailsDash`。

涉及路径：
- `ios-app/NailsDashIOS/Resources/Info.plist`

## 验证
- 本地 iOS 构建通过：`BUILD SUCCEEDED`。
- `Assets.car` 中已包含 `AppIcon` 资源条目。
- 真机建议操作：删除旧 App 后重新安装，确保图标缓存刷新。

## 影响范围
- 仅 iOS 客户端资源与显示名。
- 不涉及后端接口、数据库与业务逻辑变更。
