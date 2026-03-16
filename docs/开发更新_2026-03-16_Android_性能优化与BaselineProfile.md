# Android 性能优化与 Baseline Profile

日期：2026-03-16

## 本次范围
- Android 网络层连接池、超时、重试与 HTTP 缓存优化
- Coil 全局图片缓存与主列表图片预热
- `Home / Book / Deals / Appointments / Profile / Notifications / Settings` 重复请求收敛
- `Stores / Deals / Appointments` 分页与按需补数据
- 请求版本保护，避免旧请求覆盖新状态
- Release 构建瘦身、ProGuard 保活规则
- Baseline Profile 模块接入、benchmark 假数据与受管设备采集
- 主页面 `fully-drawn` 条件上报

## 关键改动
- 新增应用级 `ImageLoader`，统一图片内存/磁盘缓存
- 新增通用 TTL 内存缓存与同 key 并发去重
- 多个 Repository 增加短时缓存，并在写操作后主动失效
- 主列表切换到分页加载，减少一次性拉满数据
- `Home / Stores / Deals` 增加图片预热，降低首屏和翻页空白
- `Home / Stores / Deals / Appointments` 增加首轮加载完成态标记
- `NailsDashApp` 与主页面接入 `ReportDrawnWhen`
- 新增 `baselineprofile` 模块，受管设备脚本覆盖：
  - Home 启动
  - 图片详情可达
  - Book 店铺详情可达
  - Appointments / Deals / Profile / Home 主 tab 切换

## 验证
- `./gradlew :app:assembleDebug -x lint`
- `./gradlew :app:assembleRelease -x lint`
- `./gradlew :baselineprofile:pixel6Api31NonMinifiedReleaseAndroidTest`

## 当前收益
- 减少主页面重复请求与重复图片加载
- 降低主列表首次进入与回切时的网络和渲染成本
- Release 包构建已具备资源压缩与代码压缩基础
- Baseline Profile 已可稳定生成，为冷启动和常用路径提供预编译覆盖

## 后续建议
- 继续扩展 `Profile` 子页面与 `Book` 预约弹窗的 Baseline Profile 覆盖
- 在真机上回归 `Home / Book / Deals / Appointments` 冷启动与首进页帧率
- 视数据规模继续推进更细粒度分页和预取
