# 2026-02-09 后台管理与 Customers 模块开发记录

## 一、目标
本次迭代围绕两个主线：
1. 后台管理界面可读性与一致性优化（重点修复大量浅色文字问题）。
2. 新增 Customers 模块（列表、详情、预约历史、分页能力）。

## 二、后台 UI 优化（白蓝主题下可读性收口）
### 1) 统一输入框/下拉框字体可读性
- 增加全局表单兜底样式，避免输入框/下拉框继承浅色文字导致看不清。
- 覆盖 input/select/textarea/placeholder/option 颜色。

### 2) 页面级可读性修复
已逐页修复以下文本过浅问题：
- Home Feed Manager：分类管理、专题模式、图片管理搜索区。
- Appointments：筛选栏输入/下拉、右侧表格 Time/Customer 文本、详情抽屉 Customer/Service 主文本。
- Promotions：活动名称文字。
- Applications：店铺名与审核信息。
- Risk Control：标题、搜索栏、用户名文本。
- Appointment Detail（独立页）：标题、正文、输入与按钮文案。

### 3) 全局 Toast 机制完善
- 新增 axios 响应拦截：
  - 失败操作（POST/PUT/PATCH/DELETE）自动解析后端 detail/message 并 toast.error。
  - 成功操作若返回 detail/message 自动 toast.success。
- Appointments 页本地 catch 增加防重复逻辑，避免同一错误弹两次。
- 补齐 `ToastContainer` 与样式导入，解决“调用 toast 但界面无提示”的问题。

## 三、Service Catalog 功能调整
1. 页面文案中文改英文。
2. 移除 description 字段（创建/编辑/展示均移除）。
3. 增加唯一性约束：
   - 服务名不可重复（忽略大小写、忽略首尾空格）。
   - 分类不可重复（忽略大小写、忽略首尾空格）。
4. 前后端双重拦截重复提交，并增加弹窗提示。

## 四、Customers 模块（MVP）
### 1) 后端接口
新增路由前缀：`/api/v1/customers`
- `GET /admin`
  - 列表查询，支持 keyword、注册时间区间、风险等级、受限过滤、是否有未来预约。
  - 返回分页结构：`items, total, skip, limit`。
- `GET /admin/{customer_id}`
  - 客户详情汇总：基础信息、预约统计、风险状态、消费汇总。
- `GET /admin/{customer_id}/appointments`
  - 客户预约历史列表。

### 2) 后台页面
新增页面：`/admin/customers`
- 列表：客户基础信息、预约统计、风险状态、下一次预约。
- 详情抽屉：Profile / Stats / Appointments。
- 支持跳转预约详情：`/admin/appointments/:id`。

### 3) 分页控件升级
- 支持每页数量切换：10/20/50/100。
- 支持页码输入跳转（Enter 或 Go）。

## 五、last_login_at 真实登录时间
### 1) 数据库
- `backend_users` 新增字段：`last_login_at`（可空，带索引）。
- Alembic 迁移：`20260209_150000_add_last_login_at_to_users.py`。

### 2) 登录写入
- 用户登录成功后写入 `last_login_at = datetime.utcnow()`。
- Customers 接口优先返回 `last_login_at`，无值时回退 `updated_at`。

## 六、Appointments 补充展示
- 后台 appointments 页新增 `Created At` 展示：
  - 右侧表格新增列 `Created At`。
  - 详情抽屉新增 `Created At` 字段。

## 七、问题修复记录
1. `/api/v1/customers/admin` 404
- 原因：后端进程未重启，仍跑旧代码。
- 处理：重启并改为 `--reload`。

2. 点击客户报 CORS + 500
- 原因：`customers` 详情接口中 `lifetime_spent` 查询 join 歧义导致 500。
- 处理：改为显式 `select_from(Appointment)`，接口恢复 200。

## 八、验证结果
- 前端：`admin-dashboard` 多次 `npm run build` 通过。
- 后端：`python -m compileall backend/app` 通过。
- 迁移：`alembic upgrade head` 通过。
- Customers 详情接口：`GET /api/v1/customers/admin/{id}` 返回 200。

## 九、上线注意事项
1. 先执行数据库迁移：
```bash
cd backend
alembic upgrade head
```
2. 确保后端以可重载方式运行（开发环境）：
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
3. 若前端仍显示旧样式，强制刷新浏览器缓存（Ctrl/Cmd + Shift + R）。
