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

## 4) API base URL
Default in code:
- `http://localhost:8000/api/v1`

If using real device, change to your Mac LAN IP, e.g.:
- `http://192.168.1.225:8000/api/v1`
