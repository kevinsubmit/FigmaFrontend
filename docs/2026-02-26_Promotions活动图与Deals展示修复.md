# 2026-02-26 Promotions 活动图与 Deals 展示修复

## 本次目标
- 修复后台 `Promotions` 编辑页数据回填不完整的问题（进入编辑页后空白）。
- 让活动可配置独立图片，并在 H5/iOS Deals 页面正确展示。
- 修复后台活动绑定服务来源与接口不一致导致的下拉空白。
- 同步优化 H5 Deals 列表视觉与地址展示。

## 主要改动

### 1) 后台管理 Promotions 表单
- 编辑页从 `getPromotions(limit=200)` 改为按 ID 精确拉取 `getPromotion(id)`，避免回填丢失。
- 新增活动图配置：
  - 支持上传图片（复用上传接口）。
  - 支持手动输入 `image_url`。
  - 支持预览与清空。
- 服务选择改为“从当前店铺服务列表中选择并可多选”：
  - 接口改为 `getStoreServices(store_id, include_inactive=true)`。
  - 支持添加多个服务、移除已选服务。
  - `min_price/max_price` 统一应用于选中的服务规则。

### 2) 后端 Promotions 数据结构与校验
- `promotions` 新增字段：`image_url`（可空）。
- schema 新增 `image_url`（create/update/response 全链路）。
- create/update 时增加 `image_url` 安全校验：
  - 允许 `/uploads/*` 或 `http(s)` URL。
  - 拒绝 `javascript:` / `data:` / `vbscript:` 等危险协议。

### 3) H5 Deals 页面
- 活动卡片图片优先级：
  1. promotion.image_url
  2. 店铺主图
  3. 空态渐变图
- 通过 `resolveAssetUrl` 统一处理相对路径资源（如 `/uploads/...`）。
- 活动图高度统一为固定高度，避免过高导致列表不协调。
- 店铺地址改为完整展示（支持换行，不截断）。

### 4) iOS 同步
- Deals 数据模型新增 `promotion.image_url` 并优先展示活动图。
- Profile VIP 卡标题与后端保持一致：
  - 优先显示 `current_level.benefit`；
  - 为空时回退 `Member Access`。

## 数据库迁移
- 新增迁移文件：
  - `backend/alembic/versions/20260226_180000_add_image_url_to_promotions.py`
- 执行（后端目录）：
```bash
alembic upgrade head
```

## 变更文件（核心）
- 后台：
  - `admin-dashboard/src/api/promotions.ts`
  - `admin-dashboard/src/pages/PromotionForm.tsx`
- 后端：
  - `backend/app/api/v1/endpoints/promotions.py`
  - `backend/app/models/promotion.py`
  - `backend/app/schemas/promotion.py`
  - `backend/app/crud/service.py`
  - `backend/alembic/versions/20260226_180000_add_image_url_to_promotions.py`
- H5：
  - `frontend/src/api/promotions.ts`
  - `frontend/src/components/Deals.tsx`
- iOS：
  - `ios-app/NailsDashIOS/Sources/Features/Home/HomeView.swift`

## 说明
- 本次提交仅包含业务代码与中文文档。
- 本地环境文件（如 `backend/.env`、`__pycache__`、`nailsdash.db`）不纳入提交。
