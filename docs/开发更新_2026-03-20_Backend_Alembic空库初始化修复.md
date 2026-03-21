# Backend Alembic 空库初始化修复

## 问题

- 全新 MySQL 空库执行 `alembic upgrade head` 会失败，无法只靠 Alembic 完整初始化数据库。
- 首个迁移会假定旧表 `salons`、`stylists`、`users` 等一定存在，空库场景直接报错。
- 历史迁移链没有完整覆盖当前生产所需的核心表，部分表只能靠 `init_db.py` 补建。
- 占位迁移 `003_add_technician_id_to_appointments` 的 revision id 超过 Alembic 默认 `version_num` 长度，迁移到第二步时会写 `alembic_version` 失败。

## 修复

### 1. 首迁移改为空库安全

- 只有旧表真实存在时才执行 drop。
- 空库时主动补建基础表：
  - `stores`
  - `store_images`
  - `verification_codes`
  - `backend_users`
  - `services`
  - `appointments`
  - `technicians`
  - `pins`
  - `tags`
  - `promotions`
  - `coupons`
  - `user_coupons`
- 旧结构升级时改成“按列/索引存在性修补”，不再假定历史字段一定齐全。

### 2. 新增尾部修复迁移

- 在迁移链末尾新增 repair migration。
- 用当前 `Base.metadata.create_all(checkfirst=True)` 补齐历史 Alembic 从未创建过的核心表。
- 再补 `backend_users`、`appointments` 上仍然可能缺失的列和索引。

### 3. 修正超长 revision id

- 将 `003_add_technician_id_to_appointments` 改为 `003_add_technician_id_to_appts`。
- 同步更新后续 `down_revision`，避免 `alembic_version.version_num` 长度溢出。

## 影响

- 全新数据库现在可以直接执行 `alembic upgrade head`。
- 不再要求先跑 `python init_db.py` 才能让后端和 scheduler 起起来。
- 旧库升级路径保持兼容，不改业务逻辑，只增强迁移容错。

## 关键文件

- `backend/alembic/versions/e2286eeaf919_add_stores_services_and_appointments_.py`
- `backend/alembic/versions/003_add_technician_id_to_appointments.py`
- `backend/alembic/versions/20260103_232218_add_store_hours.py`
- `backend/alembic/versions/20260319_000200_repair_missing_core_schema.py`

## 验证

已完成以下验证：

```bash
python3 -m compileall backend/alembic backend/app

docker compose exec -T db mysql -uroot -pnailsdashroot -e "
  DROP DATABASE IF EXISTS nailsdash_alembic_test;
  CREATE DATABASE nailsdash_alembic_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
"

docker compose exec -T backend /bin/sh -lc '
  DATABASE_URL="mysql+pymysql://root:nailsdashroot@db:3306/nailsdash_alembic_test" alembic upgrade head
'

docker compose exec -T backend /bin/sh -lc '
  DATABASE_URL="mysql+pymysql://root:nailsdashroot@db:3306/nailsdash_alembic_test" alembic current
'
```

验证结果：

- `alembic upgrade head` 成功
- `alembic current` 返回 `20260319_000200 (head)`
- 核心表存在：
  - `appointments`
  - `appointment_reminders`
  - `notifications`
  - `gift_cards`
  - `backend_users`
  - `store_hours`
  - `push_device_tokens`

临时验证库 `nailsdash_alembic_test` 已删除。
