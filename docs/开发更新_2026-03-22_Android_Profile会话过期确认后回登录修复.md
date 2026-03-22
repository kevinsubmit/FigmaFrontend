# Android Profile 会话过期确认后回登录修复

## 问题
- Android `Profile` 页面在会话失效时会弹出 `Session expired, please sign in again.`。
- 用户点击 `OK` 后只关闭弹窗，没有实际回到登录页。
- 根因是 `ProfileScreen` 的提示弹窗确认按钮没有沿用其他主页面已有的 `forceLogout(...)` 分支。

## 本次调整
- 将 `ProfileScreen` 的 `Notice` 弹窗确认按钮改为与 `Home / Book / Appointments / Deals` 一致。
- 当文案命中 `AppSessionViewModel.shouldForceLogoutAfterSensitiveAuthAlert(...)` 时：
  - 先关闭弹窗
  - 再执行 `sessionViewModel.forceLogout(message)`
  - 由根 `NailsDashApp` 重新切回登录页

## 影响文件
- `android-app/app/src/main/java/com/nailsdash/android/ui/screen/ProfileScreen.kt`

## 验证
- 执行：`JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home' ./gradlew :app:assembleDebug -x lint`
- 结果：`BUILD SUCCESSFUL`
