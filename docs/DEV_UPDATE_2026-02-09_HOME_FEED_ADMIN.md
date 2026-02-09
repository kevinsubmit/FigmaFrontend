# 开发更新：首页图片流（Home Feed）超管管理

## 目标
基于你确认的业务规则完成实现：
1. 首页图片不属于任何店铺
2. 仅超管可管理
3. 一张图片可绑定多个分类
4. 分类由超管维护（新增/编辑/停用）
5. 支持“首页专题模式”（例如圣诞节只展示 christmas 标签）

## 结构调整（基于现有 pins/tags 升级）
- 复用现有 `pins + tags + pin_tags` 多对多结构
- 新增字段：
  - `pins.status`：`draft | published | offline`
  - `pins.sort_order`
  - `pins.is_deleted`（软删除）
  - `pins.updated_at`
  - `tags.is_active`
  - `tags.sort_order`
  - `tags.updated_at`

迁移文件：
- `backend/alembic/versions/20260209_103000_extend_pins_for_home_feed_admin.py`

## 后端接口
文件：
- `backend/app/api/v1/endpoints/pins.py`
- `backend/app/crud/pin.py`
- `backend/app/schemas/pin.py`

### 公共（H5）
- `GET /api/v1/pins`：仅返回 `published + 未删除`
- `GET /api/v1/pins/tags`：返回启用分类
- `GET /api/v1/pins/{id}`：详情
- `GET /api/v1/pins/theme/public`：返回当前专题配置与是否生效

### 超管管理
- `GET /api/v1/pins/admin`
- `POST /api/v1/pins/admin`
- `PATCH /api/v1/pins/admin/{pin_id}`
- `DELETE /api/v1/pins/admin/{pin_id}`（软删除）
- `GET /api/v1/pins/admin/tags`
- `POST /api/v1/pins/admin/tags`
- `PATCH /api/v1/pins/admin/tags/{tag_id}`
- `DELETE /api/v1/pins/admin/tags/{tag_id}`（停用）
- `GET /api/v1/pins/admin/theme`：读取专题配置
- `PUT /api/v1/pins/admin/theme`：设置专题（启用/分类/时间区间）

专题生效规则：
1. `enabled=true`
2. 分类存在且为启用状态
3. 在 `start_at/end_at` 时间窗口内（按 UTC 比较）

当专题生效时：
- `GET /api/v1/pins` 在未指定 `tag` 参数时会自动按专题分类过滤
- H5 首页会自动只看到该分类图片（例如 Christmas）

## 管理后台页面
新增：
- `admin-dashboard/src/pages/HomeFeedManager.tsx`
- `admin-dashboard/src/api/homeFeed.ts`

接入：
- `admin-dashboard/src/App.tsx` 新增路由 `/admin/home-feed`
- `admin-dashboard/src/pages/More.tsx` 新增菜单 `Home Feed`（仅超管显示）

页面能力：
- 图片上传（调用 `/api/v1/upload/images`）
- 图片新增/编辑/删除
- 多分类绑定
- 状态管理（draft/published/offline）
- 排序管理
- 分类新增/编辑/停用
- 专题模式设置（启用开关、专题分类、起止时间）

## H5 对接
文件：
- `frontend/src/api/pins.ts`
- `frontend/src/components/Home.tsx`

调整：
- 首页分类从 `GET /api/v1/pins/tags` 获取
- 图片流继续走 `GET /api/v1/pins`，并自动受状态/软删除控制

## 验证
已通过：
1. `alembic upgrade head`
2. `admin-dashboard npm run build`
3. `frontend npm run build`
4. TestClient 集成烟测：
   - 超管创建分类成功
   - 超管创建图片并绑定分类成功
   - 公共 tags/pins 可读取到新数据
