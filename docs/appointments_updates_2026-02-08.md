# Appointments 开发总结（2026-02-08）

## 本次范围
本次更新主要覆盖后台预约管理、H5 预约流程以及后端校验能力，目标是让预约页面更贴近门店实际运营场景，并修复时间与服务来源相关问题。

## 后台管理（Admin Dashboard）
- 重构 `/admin/appointments` 页面为“排班/预约管理”模式：
  - 日期切换（前一天 / 今天 / 后一天）
  - 日/周视图切换
  - 时间轴 + 表格双视图
  - 右侧预约详情抽屉
  - 状态操作（confirmed / completed / cancelled）
- 增加筛选与搜索：
  - 关键词搜索（姓名/电话/服务）
  - 订单号搜索
  - 服务类型筛选（来源改为 service-catalog）
  - 技师筛选
  - 店铺名搜索（仅超管可见）
- 增加同时间高并发展示：
  - 表格按“日期 + 开始时间”分组
  - 显示并发预约数量
  - 支持分组展开/收起
- 底部导航文案调整：
  - `ORDERS` 改为 `APPOINTMENTS`
- 详情抽屉增强：
  - 显示订单号
- 顶部日期选择增强：
  - 支持点击日历直接选择某天并刷新结果

## 服务来源统一（Catalog 约束）
- 后台 appointments 页面中的服务筛选项，统一改为来自“超管 service-catalog”。
- 后端店铺服务查询增加约束：仅返回 `catalog_id IS NOT NULL` 的服务。
- 结果：H5 页面只会看到“店铺已配置且来自 service-catalog”的服务，剔除历史遗留的非 catalog 服务。

## H5 时间问题修复
- 修复本地日期与 UTC 日期混用导致的可预约过去时间问题。
- 在提交预约前增加前端兜底：过去时间直接拦截。
- 改期弹窗最小日期改为本地日期逻辑（不再使用 UTC 字符串分割）。

## 后端校验与权限增强
- 预约创建与改期增加后端硬校验：
  - 禁止提交过去时间。
- 管理端能力补齐：
  - 允许门店管理员在本店范围内进行改期和备注更新。

## 本次修改文件
- `admin-dashboard/src/pages/AppointmentsList.tsx`
- `admin-dashboard/src/layout/BottomTabs.tsx`
- `admin-dashboard/src/api/appointments.ts`
- `frontend/src/components/StoreDetails.tsx`
- `frontend/src/components/AppointmentDetailsDialog.tsx`
- `backend/app/api/v1/endpoints/appointments.py`
- `backend/app/crud/service.py`
- `docs/appointments_updates_2026-02-08.md`

## 验证结果
- `admin-dashboard`：`npm run build` 通过
- `frontend`：`npm run build` 通过
- `backend`：修改文件语法检查通过
