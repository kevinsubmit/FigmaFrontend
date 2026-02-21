# 2026-02-21 Customers 自定义标签（多标签）

## 需求目标
为 Customers 增加“自定义标签”能力，用于快速识别客户特征（例如：给小费、特殊要求、喜欢迟到等）。

## 已实现能力

### 1) 数据结构
- 在 `backend_users` 新增字段：`customer_tags`（`Text`）
- 存储格式：JSON 字符串（数组）
- 支持多标签

### 2) 后端接口

#### 列表与详情返回标签
- `GET /api/v1/customers/admin`
- `GET /api/v1/customers/admin/{customer_id}`

返回新增字段：
- `tags: string[]`

#### 更新标签
- `PUT /api/v1/customers/admin/{customer_id}/tags`
- 请求体：
```json
{
  "tags": ["Good tipper", "Special request", "Late"]
}
```
- 返回：更新后的 `CustomerDetail`

### 3) 标签规则（后端统一）
- 去重：大小写不敏感
- 去空值：空标签会被忽略
- 单标签长度：最多 24 字符（超出截断）
- 标签数量：最多 8 个

### 4) 管理后台 UI
页面：`Customers`
- 列表：客户姓名后展示标签胶囊
- 右侧详情弹窗：
  - 展示当前标签
  - 提供可编辑输入框（逗号分隔）
  - 点击 `Save Tags` 保存

## 涉及文件
- `backend/app/models/user.py`
- `backend/alembic/versions/20260220_120000_add_customer_tags_to_users.py`
- `backend/app/api/v1/endpoints/customers.py`
- `admin-dashboard/src/api/customers.ts`
- `admin-dashboard/src/pages/Customers.tsx`

## 验证
- Alembic 迁移已执行：`20260219_010000 -> 20260220_120000`
- 管理后台构建通过：`npm run build`
- 接口实测：
  - `PUT /customers/admin/{id}/tags` 返回 200
  - 列表/详情能读取并显示标签
