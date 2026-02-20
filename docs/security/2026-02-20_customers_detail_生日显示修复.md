# 2026-02-20 Customers Detail 生日显示修复（中文）

## 背景
后台管理 `Customers` 页面右侧弹窗增加了生日展示，但实际未显示。

## 原因
- 后端 `GET /api/v1/customers/admin/{customer_id}` 响应模型未包含 `date_of_birth`，前端拿不到字段。
- 本地运行时还出现过旧进程未重启导致返回旧响应的问题。

## 修复内容

### 1) 后端
文件：`backend/app/api/v1/endpoints/customers.py`
- `CustomerDetail` 增加字段：`date_of_birth: Optional[date]`
- `get_customer_detail` 返回中补充：`date_of_birth=customer.date_of_birth`

### 2) 管理后台前端
文件：
- `admin-dashboard/src/api/customers.ts`
  - `CustomerDetail` 类型增加 `date_of_birth?: string | null`
- `admin-dashboard/src/pages/Customers.tsx`
  - 右侧 `Profile` 区域在 `Phone` 下方新增：`Birthday`
  - 无生日显示 `-`

## 验证
- 重启后端后实测：
  - `GET /api/v1/customers/admin/1` 返回包含 `date_of_birth`
- 管理后台构建通过：`npm run build`

## 备注
- 本次提交不包含 `.env`、`__pycache__`、本地数据库等运行产物。
