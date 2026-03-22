# Backend Admin Smoke 覆盖清单

更新时间：2026-03-22

## 当前入口

- 独立执行入口：`backend/run_admin_regression_smokes.py`
- 独立 CI 工作流：`.github/workflows/backend-admin-regression.yml`
- 当前 admin suite 实际覆盖：`6` 条真实链路 smoke

执行命令：

```bash
cd backend
python run_admin_regression_smokes.py
```

## 已纳入 admin suite 的 smoke

### 1. dashboard-admin

脚本：`backend/test_dashboard_admin_regression.py`

覆盖：

- `dashboard/summary`
- `dashboard/realtime-notifications`

### 2. customers-admin

脚本：`backend/test_customers_admin_regression.py`

覆盖：

- `customers/admin`
- `customers/admin/{customer_id}`
- `customers/admin/{customer_id}/tags`
- `customers/admin/{customer_id}/appointments`
- `customers/admin/{customer_id}/rewards`
- `customers/admin/{customer_id}/referrals`

### 3. risk-admin

脚本：`backend/test_risk_admin_regression.py`

覆盖：

- `risk/users`
- `risk/users/{user_id}` 的 `set_level / restrict_24h / unrestrict`

### 4. security-admin

脚本：`backend/test_security_admin_regression.py`

覆盖：

- `security/summary`
- `security/block-logs`
- `security/ip-rules` create / update / list
- `security/quick-block`

### 5. logs-admin

脚本：`backend/test_logs_admin_regression.py`

覆盖：

- `logs/admin`
- `logs/admin/stats`
- `logs/admin/{log_id}`

### 6. admin-ops

脚本：`backend/test_admin_ops_regression.py`

覆盖：

- 上述 5 组后台运营能力的一键全链路整合回归

数据策略：

- 跑前自动清理动态业务数据
- 直种最小 `super_admin/store/customers/appointments/rewards/referrals/logs/security`
- 只把真正要校验的后台运营能力走 API
- 跑后自动再次清理动态业务数据

## 与 consumer suite 的关系

- `backend/run_regression_smokes.py` 继续负责消费者主链路
- `backend/run_admin_regression_smokes.py` 单独负责后台运营链路
- `.github/workflows/backend-payment-regression.yml` 负责消费者 smoke
- `.github/workflows/backend-admin-regression.yml` 负责后台运营 smoke
- 两套 suite 分开，避免 admin 断言和 consumer smoke 互相放大噪音

## 当前结论

后台运营侧已经有了独立 smoke 入口，且默认 runner / CI 现在直接跑细粒度版本：

- `customers/admin*`
- `dashboard/*`
- `risk/*`
- `security/*`
- `logs/admin*`

`admin-ops` 保留为本地一键整合回归，不再是唯一入口。
