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
