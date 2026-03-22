# Backend Admin Smoke 覆盖清单

更新时间：2026-03-22

## 当前入口

- 独立执行入口：`backend/run_admin_regression_smokes.py`
- 独立 CI 工作流：`.github/workflows/backend-admin-regression.yml`
- 当前 admin suite 实际覆盖：`1` 条真实链路 smoke

执行命令：

```bash
cd backend
python run_admin_regression_smokes.py
```

## 已纳入 admin suite 的 smoke

### 1. admin-ops

脚本：`backend/test_admin_ops_regression.py`

覆盖：

- `dashboard/summary`
- `dashboard/realtime-notifications`
- `customers/admin`
- `customers/admin/{customer_id}`
- `customers/admin/{customer_id}/tags`
- `customers/admin/{customer_id}/appointments`
- `customers/admin/{customer_id}/rewards`
- `customers/admin/{customer_id}/referrals`
- `risk/users`
- `risk/users/{user_id}` 的 `set_level / restrict_24h / unrestrict`
- `security/summary`
- `security/block-logs`
- `security/ip-rules` create / update / list
- `security/quick-block`
- `logs/admin`
- `logs/admin/stats`
- `logs/admin/{log_id}`

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

后台运营侧已经有了独立 smoke 入口，第一条链路覆盖了最核心的 admin 面：

- `customers/admin*`
- `dashboard/*`
- `risk/*`
- `security/*`
- `logs/admin*`

下一阶段如果继续细化，应该把 `admin-ops` 进一步拆成更小的子 smoke，例如：

1. `customers-admin`
2. `security-admin`
3. `risk-admin`
4. `dashboard-admin`
5. `logs-admin`
