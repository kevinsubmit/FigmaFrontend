# NailsDash iOS

## 1) Prerequisites
- Xcode (full app, not only CommandLineTools)
- xcodegen (`brew install xcodegen`)

## 2) Generate Xcode project
```bash
cd ios-app
xcodegen generate
```

This will create `NailsDashIOS.xcodeproj`.

## 3) Open and run
```bash
open NailsDashIOS.xcodeproj
```

In Xcode:
1. Select target `NailsDashIOS`
2. Set your `Signing & Capabilities` team
3. Run on simulator

## 4) API base URL（自动切换）
已改为按 Build Configuration 自动切换，不需要每次手改代码：

- `Debug`：`http://192.168.1.225:8000/api/v1`
- `Release`：`https://api.nailsdash.app/api/v1`

配置来源：
1. 环境变量 `NAILSDASH_API_BASE_URL`（最高优先级）
2. `Info.plist` 中 `NAILSDASH_API_BASE_URL`（由 Build Settings 注入）
3. 代码默认值（兜底）

如果你的局域网 IP 变化，只需在 Xcode `Build Settings` 里改 `NAILSDASH_API_BASE_URL`（Debug）即可。

## 5) iOS Push Notification（APNs）联调
后端需先配置 `backend/.env`：
- `APNS_ENABLED=True`
- `APNS_KEY_ID` / `APNS_TEAM_ID` / `APNS_BUNDLE_ID`
- `APNS_PRIVATE_KEY` 或 `APNS_PRIVATE_KEY_PATH`
- `APNS_USE_SANDBOX=True`（开发环境）

iOS 真机侧：
1. 在 Target `NailsDashIOS` 的 `Signing & Capabilities` 添加 `Push Notifications`
2. 同页添加 `Background Modes`，勾选 `Remote notifications`
3. 使用真机登录 App 后，App 会自动请求通知权限并上报 APNs token 到：
   - `POST /api/v1/notifications/devices/register`
4. 用户登出时会自动调用：
   - `POST /api/v1/notifications/devices/unregister`
5. 点击系统推送通知后会跳转到 `Appointments` 页；前台收到推送只展示，不自动跳转。
