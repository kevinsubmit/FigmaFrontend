# Android 首登图片加载与 Profile 按钮修复

日期：2026-03-16

## 本次范围
- 修复 Android 首次登录后 `Home / Book / Profile` 图片长时间转圈不出图
- 修复 `Book` 流程评价大图查看中的同类图片加载问题
- 收敛 `Profile` 页面右上角通知和设置按钮尺寸，避免重叠

## 根因
- 部分图片地址可能以 `localhost / 127.0.0.1 / 0.0.0.0` 形式返回。Android 真机和调试环境的 API 主机不一致时，这类地址会直接加载失败。
- `Home / Book / Profile` 的图片组件此前先按 `AsyncImagePainter.state` 分支渲染，`State.Empty` 可能长期停留在 loading 视图，造成用户看到一直转圈。

## 关键改动
- `AssetUrlResolver` 增加本机地址归一化：
  - 绝对地址如果命中 `localhost / 127.0.0.1 / 0.0.0.0 / ::1`
  - 自动替换为当前 `API_BASE_URL` 对应的 host / port
- `Home` 图片卡片改为先挂载图片 painter，再覆盖 loading / error UI
- `Book` 主页面店铺卡片图改为相同模式
- `Profile` 头像改为相同模式
- `BookFlow` 评价大图查看改为相同模式
- `Profile` 右上角通知和设置按钮进一步缩小外圈、图标和间距

## 验证
- `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew :app:assembleDebug`

## 预期结果
- 首次登录进入 `Home / Book / Profile` 时，图片不再长期停留在 loading
- 后端返回本机地址样式图片链接时，Android 侧能自动改写到当前调试主机
- `Profile` 右上角两个圆形按钮不再重叠
