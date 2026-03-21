# 开发更新 2026-03-20 Backend 运行态回归与 Legacy DB 接入 Alembic

## 本次改动

### 1. 修复 stores 列表在 MySQL 下的排序错误

- 问题：`/api/v1/stores/` 的排序里使用了 `NULLS LAST`，这是 PostgreSQL 语法，MySQL 会直接报错。
- 处理：改成数据库兼容的两段排序表达式，先按 `manual_rank IS NULL` 排，再按 `manual_rank` 本身排序。
- 文件：
  - `backend/app/crud/store.py`

### 2. 增加 legacy 数据库接入 Alembic 的 reconcile/stamp 工具

- 场景：
  - 历史开发库通过 `Base.metadata.create_all()` 或手工 SQL 建出来，有业务表，但没有 `alembic_version`
  - 历史开发库已经有 `alembic_version`，但 schema 曾被手工推进，导致 revision 落后于真实结构
- 新增能力：
  - 识别“有业务表但无 `alembic_version`”的 legacy unmanaged database
  - 识别“已受 Alembic 管理，但 revision 落后”的 managed legacy database
  - 只补齐非破坏性差异：
    - 缺表
    - 缺列
    - 缺索引
  - 差异收敛后自动 `stamp head`
- 文件：
  - `backend/app/db/legacy_alembic.py`
  - `backend/app/reconcile_legacy_db.py`

## 使用方式

### Dry run

```bash
cd backend
python -m app.reconcile_legacy_db --dry-run
```

### 实际补齐并 stamp

```bash
cd backend
python -m app.reconcile_legacy_db
```

### 只补齐，不 stamp

```bash
cd backend
python -m app.reconcile_legacy_db --no-stamp
```

### 已有 alembic_version，但 revision 落后的 legacy 开发库

```bash
cd backend
python -m app.reconcile_legacy_db --adopt-managed
```

## 验证结果

### 运行态回归

在 `backend + backend-scheduler + redis + db` 的 compose 栈下，以下接口已通过：

- `GET /api/openapi.json`
- `GET /api/v1/stores/?skip=0&limit=3`
- `GET /api/v1/pins/tags`
- `GET /api/v1/pins/theme/public`
- `GET /api/v1/pins/?skip=0&limit=3`
- `GET /api/v1/promotions/?skip=0&limit=3`

Redis 缓存键已确认生成：

- `nailsdash:cache:pins:home-feed-theme:v1`
- `nailsdash:cache:pins:public-tag-names:v1`

### Legacy DB reconcile 验证

- 使用一个临时 MySQL 库手工构造 legacy schema
- 运行 `python -m app.reconcile_legacy_db`
- 工具成功完成：
  - 缺表补齐
  - `stores` 缺列补齐
  - `store_hours` 缺索引补齐
  - `alembic_version` 成功 stamp 到当前 head

### Managed-but-behind legacy DB 验证

- 当前本地 compose 库 `alembic current` 显示仍停在旧 revision
- 但 metadata diff 已为空，说明 schema 已基本对齐，只是版本号落后
- `python -m app.reconcile_legacy_db --adopt-managed` 可用于把这类开发库直接修正到当前 head

## 当前结论

- 新空库：可以直接 `alembic upgrade head`
- 旧开发库：
  - 无 `alembic_version`：先运行 `python -m app.reconcile_legacy_db`
  - 已有 `alembic_version` 但 revision 落后：运行 `python -m app.reconcile_legacy_db --adopt-managed`
- MySQL 下 `stores` 列表接口已恢复正常
