# 开发更新（2026-02-28）：Dashboard 与 Appointments 补充店铺名展示

## 本次目标
- 在后台管理系统中补齐店铺信息展示，避免运营人员只看到“用户 + 时间 + 服务”但无法快速识别所属店铺。

## 完成内容

### 1) Appointments 右侧详情补充店铺名
- 页面：`appointments` 右侧预约详情
- 区域：`SERVICE` 模块
- 变更：新增 `Store: {店铺名}` 展示（复用现有店铺名兜底逻辑）
- 效果：查看服务明细时可直接看到该预约所属店铺

### 2) Dashboard 实时通知补充店铺名
- 页面：`dashboard` 实时通知
- 变更：
  - 保留通知项中的 `store_id` / `store_name`
  - 在通知文案后追加 `· 店铺名`（无店铺名时回退 `Store #id`）
- 效果：通知信息形成“用户 + 时间 + 服务 + 店铺”完整链路

## 涉及文件
- `admin-dashboard/src/pages/AppointmentsList.tsx`
- `admin-dashboard/src/pages/Dashboard.tsx`

## 验证
- 已执行 `admin-dashboard` 构建：`npm run build`
- 构建通过（存在既有 CSS warning，不影响本次功能）
