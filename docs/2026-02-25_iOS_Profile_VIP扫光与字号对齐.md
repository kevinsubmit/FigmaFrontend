# iOS Profile 页面优化记录（2026-02-25）

## 本次目标
- 复刻 H5 的 VIP 卡片金色扫光循环动效。
- 下调 iOS Profile 页面主视觉字号，向 H5 做像素级收口。

## 改动范围
- 文件：`ios-app/NailsDashIOS/Sources/Features/Home/HomeView.swift`

## 具体改动

### 1) VIP 卡片扫光动效
- 在 `vipAccessCard` 背景中加入 `VipCardGoldSweep()` 动画层。
- 扫光为线性渐变高光，循环横向移动。
- 保留原有边框、顶部金线、业务数据与交互逻辑不变。

### 2) Profile 主页面字号与比例下调
- 统一新增视觉参数：
  - `profileNameFontSize = 40`
  - `vipLevelFontSize = 36`
  - `statsValueFontSize = 44`
  - `statsLabelFontSize = 10`
  - `statsLabelKerning = 3.2`

- 重点收口项：
  - 用户名字号：48 -> 40
  - VIP 大字：44 -> 36
  - `Member Access`、`Spend Amount`、`Visits`、`Next level` 等文字同步下调
  - 邀请卡图标容器：72 -> 64
  - 统计卡图标容器：74 -> 64
  - 统计卡大数字：56 -> 44
  - 统计卡高度：228 -> 206
  - 统计卡垂直内边距：20 -> 16

## 验证
- 本地编译命令：
  - `xcodebuild -project ios-app/NailsDashIOS.xcodeproj -scheme NailsDashIOS -configuration Debug -sdk iphonesimulator build`
- 结果：`BUILD SUCCEEDED`

## 影响说明
- 仅 UI 视觉调整，无 API、无数据模型、无业务流程修改。
- 后续如需继续贴合 H5，可在此基础上再做第二轮字号微调（例如 VIP 主标题与统计卡数字再降 1~2pt）。
