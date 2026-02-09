# 日志模块说明（后台中文页面）

## 1. 本次新增内容

- 新增系统日志表：`system_logs`
- 新增日志接口：
  - `GET /api/v1/logs/admin`
  - `GET /api/v1/logs/admin/{log_id}`
  - `GET /api/v1/logs/admin/stats`
- 新增后台页面：`/admin/logs`（中文 UI）
- 新增全局访问/错误日志中间件（自动记录 `request_id`、状态码、耗时）
- 新增预约与安全模块的审计日志写入

## 2. 日志类型

- `access`：访问日志（HTTP 请求）
- `error`：错误日志（4xx/5xx，尤其 5xx）
- `audit`：审计日志（管理员关键操作）
- `security`：安全日志（如 IP 规则拦截）
- `business`：业务日志（预留）

## 3. 关键字段

- 基础：`log_type`、`level`、`module`、`action`、`message`
- 操作主体：`operator_user_id`、`store_id`
- 目标对象：`target_type`、`target_id`
- 请求信息：`request_id`、`ip_address`、`path`、`method`、`status_code`、`latency_ms`
- 变更快照：`before_json`、`after_json`、`meta_json`
- 时间：`created_at`

## 4. 页面功能（中文）

- 顶部统计卡：今日总量、今日错误、今日安全事件、平均耗时、P95耗时
- 筛选：日志类型、级别、模块、操作者分类、操作者（手机号/ID）、时间范围
- 列表：分页、每页条数、页码跳转
- 列表列：时间、类型、级别、模块、动作、状态、耗时、操作者、请求ID
- 详情：基础信息 + 变更前/后 + 扩展信息

## 4.1 操作者筛选规则

- 操作者分类：
  - `super_admin`：超级管理员
  - `store_admin`：店铺管理员
  - `normal_user`：普通用户
- 操作者输入：
  - 输入纯数字：优先按手机号数字精确匹配，同时支持按用户ID精确匹配
  - 输入非数字：按手机号模糊匹配
- 说明：后端已移除旧的 `keyword` 参数，避免和操作者筛选混用

## 5. 已接入的审计动作

- 预约模块：
  - 调整预约时间
  - 更新预约备注
  - 改状态（确认/完成/取消）
  - 标记 no-show
- 安全模块：
  - 创建规则
  - 更新规则
  - 快速封禁
- 安全中间件：
  - IP 拦截时写入 `security` 日志

## 6. 数据库迁移

- 迁移文件：`backend/alembic/versions/20260210_000000_add_system_logs_table.py`
- 执行命令：`alembic upgrade head`
