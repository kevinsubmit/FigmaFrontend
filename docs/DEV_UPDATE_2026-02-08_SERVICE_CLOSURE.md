# 开发更新 - 2026-02-08（服务配置闭环）

## 本次范围
本次实现了服务配置最小闭环：
1. 超级管理员维护服务模板（Catalog）。
2. 店铺管理员选择模板并设置本店价格与时长。
3. H5 前台按店铺读取“已启用服务”用于展示与预约。

## 后端变更
- 统一服务字段校验：
  - `price > 0`
  - `duration_minutes > 0`
- 增加响应兼容字段：
  - `name_snapshot`
- 店铺服务绑定改为“幂等更新/重新启用”（同一 `store_id + catalog_id`）：
  - 已存在则更新价格、时长、描述等，并将 `is_active = 1`
- 服务移除改为软下架：
  - 使用 `is_active = 0`，不做物理删除
- 增加并保留路由兼容别名：
  - `GET /api/v1/services/store/{store_id}`
  - `POST /api/v1/services/store/{store_id}`
  - `PATCH /api/v1/services/store/{store_id}/{service_id}`
  - `DELETE /api/v1/services/store/{store_id}/{service_id}`
- 预约创建增加严格校验：
  - 服务必须存在
  - 服务必须属于所选店铺
  - 服务必须处于启用状态

## 管理后台变更
- 服务 API 对齐到 `/services/store/...`。
- 服务模板列表读取对齐到 `/services/admin/catalog`。
- 店铺详情页服务管理交互优化：
  - 已启用模板显示 `Added`
  - 已下架模板显示 `Re-Add`
  - 已配置服务支持 `Deactivate`（软下架）

## H5 前台变更
- 店铺服务读取改为 `/api/v1/services/store/{storeId}`。
- 前端服务类型字段与后端契约对齐：
  - `catalog_id`、`name_snapshot`、`is_active`、`category`、`updated_at`

## 验证结果
- 后端相关 Python 文件语法检查通过。
- 管理后台生产构建通过。
- H5 前台生产构建通过。

## 备注
- 本次保留了必要的兼容路由，降低旧调用回归风险。
- 运行期本地文件（如 `.env`、`pid/log`、本地数据库）不纳入提交。
