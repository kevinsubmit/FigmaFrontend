# Android Profile 鉴权失效自动回登录

## 问题
- 切换到 `Profile` 页面时出现 `Could not validate credentials`。
- 这是后端返回的原始鉴权失败文案，表示当前会话 token 已失效或无效。
- Android 之前没有把这句文案映射成统一的“会话过期”提示，因此只弹错误，没有触发现有的强制登出逻辑。

## 本次调整
- 在 Android 网络错误映射层补齐后端已知鉴权文案识别。
- 将以下文案统一映射为 `Session expired, please sign in again.`：
  - `Could not validate credentials`
  - `token has expired`
  - `session expired`
  - `not authenticated`
  - `authentication required`
- 保持现有 `AppSessionViewModel.shouldForceLogoutAfterSensitiveAuthAlert(...)` 逻辑不变，让页面在收到统一文案后自动强制登出并回到登录页。

## 影响文件
- `android-app/app/src/main/java/com/nailsdash/android/core/network/NetworkError.kt`

## 验证
- 执行：`JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home' ./gradlew :app:assembleDebug -x lint`
- 结果：`BUILD SUCCESSFUL`
