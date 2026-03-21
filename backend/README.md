# NailsDash Backend API

美甲预约平台后端系统 - 基于FastAPI + SQLAlchemy + MySQL

## 技术栈

- **FastAPI** - 现代化、高性能的Python Web框架
- **SQLAlchemy** - Python SQL工具包和ORM
- **MySQL** - 关系型数据库
- **Alembic** - 数据库迁移工具
- **Pydantic** - 数据验证和设置管理
- **JWT** - JSON Web Token认证
- **Uvicorn** - ASGI服务器

## 项目结构

```
NailsDashBackend/
├── alembic/                 # 数据库迁移文件
│   ├── versions/           # 迁移版本
│   ├── env.py             # Alembic环境配置
│   └── script.py.mako     # 迁移脚本模板
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/  # API端点
│   │       └── api.py     # API路由器
│   ├── core/              # 核心配置
│   │   ├── config.py      # 应用配置
│   │   └── security.py    # 安全工具（JWT、密码哈希）
│   ├── crud/              # CRUD操作
│   ├── db/                # 数据库配置
│   │   └── session.py     # 数据库会话
│   ├── models/            # SQLAlchemy模型
│   ├── schemas/           # Pydantic schemas
│   └── main.py            # FastAPI应用入口
├── tests/                 # 测试文件
├── .env                   # 环境变量（不提交到Git）
├── .env.example           # 环境变量示例
├── alembic.ini            # Alembic配置
├── requirements.txt       # Python依赖
└── README.md              # 项目文档
```

## 快速开始

### Docker Compose（推荐）

```bash
docker compose up --build
```

Swagger UI: http://localhost:8000/api/docs

### 1. 环境要求

- Python 3.9+
- MySQL 8.0+
- pip 或 pipenv

### 2. 安装依赖

```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 3. 配置环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑.env文件，配置数据库连接等信息
nano .env
```

### 4. 初始化数据库

```bash
# 执行迁移
alembic upgrade head
```

可选：快速体验可使用 `python init_db.py` 直接建表（不推荐替代迁移）。
如已有数据库且需要礼品卡赠送字段，请执行 `python migrate_gift_cards_transfer.py`。

### 5. 运行开发服务器

```bash
# 方式1: 本地开发直接运行（默认内嵌 scheduler）
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 方式2: 模拟生产拆分运行（推荐）
EMBEDDED_SCHEDULER_ENABLED=false uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
python -m app.scheduler_worker

# 方式3: 使用环境变量驱动的运行器
EMBEDDED_SCHEDULER_ENABLED=false python -m app.server
```

补充：
- 如果你本地起了 Redis，建议同时设置 `REDIS_URL=redis://localhost:6379/0`，让热点缓存落到独立缓存服务
- 如果你使用仓库根目录的 `docker compose up --build`，Compose 会自动启动 Redis，并为后端容器注入 `REDIS_URL=redis://redis:6379/0`

### 6. 访问API文档

- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc
- OpenAPI JSON: http://localhost:8000/api/openapi.json

## API端点

### 认证 (Authentication)

- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `GET /api/v1/auth/me` - 获取当前用户信息
- `POST /api/v1/auth/me/avatar` - 上传头像
- `POST /api/v1/auth/refresh` - 刷新Token

### 店铺 (Stores)

- `GET /api/v1/stores` - 获取店铺列表
- `GET /api/v1/stores/{id}` - 获取店铺详情
- `POST /api/v1/stores` - 创建店铺（管理员）
- `PUT /api/v1/stores/{id}` - 更新店铺（管理员）
- `DELETE /api/v1/stores/{id}` - 删除店铺（管理员）

### 服务 (Services)

- `GET /api/v1/services` - 获取服务列表
- `GET /api/v1/services/{id}` - 获取服务详情
- `POST /api/v1/services` - 创建服务（管理员）
- `PUT /api/v1/services/{id}` - 更新服务（管理员）

### 预约 (Appointments)

- `GET /api/v1/appointments` - 获取预约列表
- `GET /api/v1/appointments/{id}` - 获取预约详情
- `POST /api/v1/appointments` - 创建预约（返回 `order_number`）
- `PUT /api/v1/appointments/{id}` - 更新预约
- `DELETE /api/v1/appointments/{id}` - 取消预约
- `PATCH /api/v1/appointments/{id}/complete` - 完成预约（可选用券）

### VIP会员 (VIP)

- `GET /api/v1/vip/status` - 获取VIP状态
- `GET /api/v1/vip/levels` - 获取VIP等级列表

### 积分 (Points)

- `GET /api/v1/points/balance` - 获取积分余额
- `GET /api/v1/points/transactions` - 获取积分交易记录

### 优惠券 (Coupons)

- `GET /api/v1/coupons/available` - 获取可领取优惠券
- `GET /api/v1/coupons/exchangeable` - 获取可积分兑换优惠券
- `GET /api/v1/coupons/my-coupons` - 获取我的优惠券
- `POST /api/v1/coupons/claim` - 领取优惠券
- `POST /api/v1/coupons/grant` - 管理员发券（按手机号）
- `POST /api/v1/coupons/exchange/{coupon_id}` - 积分兑换优惠券
- `GET /api/v1/coupons/{coupon_id}` - 获取优惠券详情

### 礼品卡 (Gift Cards)

- `GET /api/v1/gift-cards/summary` - 获取礼品卡汇总（余额/数量）
- `GET /api/v1/gift-cards/my-cards` - 获取我的礼品卡列表
- `POST /api/v1/gift-cards/purchase` - 购买礼品卡（可赠送）
- `POST /api/v1/gift-cards/{gift_card_id}/transfer` - 赠送已有礼品卡（整卡）
- `POST /api/v1/gift-cards/claim` - 领取礼品卡
- `POST /api/v1/gift-cards/{gift_card_id}/revoke` - 撤销赠送（未领取）
- `GET /api/v1/gift-cards/{gift_card_id}/transfer-status` - 查询赠送状态

### Pin内容 (Pins)

- `GET /api/v1/pins` - 获取Pin列表
- `GET /api/v1/pins/{id}` - 获取Pin详情
- `POST /api/v1/pins/{id}/favorite` - 收藏Pin
- `DELETE /api/v1/pins/{id}/favorite` - 取消收藏Pin
- `GET /api/v1/pins/{id}/is-favorited` - 判断Pin是否收藏
- `GET /api/v1/pins/favorites/my-favorites` - 获取我的收藏Pin
- `GET /api/v1/pins/favorites/count` - 获取收藏Pin数量

## 数据库迁移

```bash
# 创建新的迁移
alembic revision --autogenerate -m "migration message"

# 升级到最新版本
alembic upgrade head

# 降级一个版本
alembic downgrade -1

# 查看迁移历史
alembic history

# 查看当前版本
alembic current
```

## 测试

```bash
# 运行所有测试
pytest

# 运行特定测试文件
pytest tests/test_auth.py

# 运行测试并生成覆盖率报告
pytest --cov=app tests/
```

## 部署

### 使用Docker部署

```bash
# 构建镜像
docker build -t nailsdash-backend .

# 运行 API 容器（不内嵌 scheduler）
docker run -d -p 8000:8000 --env-file .env -e EMBEDDED_SCHEDULER_ENABLED=false nailsdash-backend

# 独立运行 scheduler worker
docker run -d --env-file .env -e EMBEDDED_SCHEDULER_ENABLED=true nailsdash-backend python -m app.scheduler_worker
```

如果你需要完整本地拓扑，直接在仓库根目录运行：

```bash
docker compose up --build
```

该 Compose 编排会同时启动：
- `db`：MySQL
- `redis`：缓存服务
- `backend`：API Web 进程
- `backend-scheduler`：独立 scheduler worker
- `frontend`：H5 前端

### 使用环境变量驱动的部署

```bash
# Web 进程运行 API（关闭内嵌 scheduler）
EMBEDDED_SCHEDULER_ENABLED=false WEB_CONCURRENCY=4 python -m app.server

# 单独起一个 scheduler worker
EMBEDDED_SCHEDULER_ENABLED=true python -m app.scheduler_worker
```

## 开发指南

### 添加新的API端点

1. 在`app/models/`中创建数据库模型
2. 在`app/schemas/`中创建Pydantic schemas
3. 在`app/crud/`中创建CRUD操作
4. 在`app/api/v1/endpoints/`中创建API端点
5. 在`app/api/v1/api.py`中注册路由

### 代码风格

项目使用以下工具保持代码质量：

- **Black** - 代码格式化
- **Flake8** - 代码检查
- **MyPy** - 类型检查

```bash
# 格式化代码
black app/

# 检查代码
flake8 app/

# 类型检查
mypy app/
```

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| HOST | Web 服务监听地址 | 0.0.0.0 |
| PORT | Web 服务监听端口 | 8000 |
| WEB_CONCURRENCY | Web worker 数量 | 1 |
| WEB_TIMEOUT_KEEP_ALIVE_SECONDS | Web keep-alive 超时时间（秒） | 5 |
| WEB_BACKLOG | Web 监听 backlog | 2048 |
| WEB_LIMIT_CONCURRENCY | Web 最大并发请求数；`0` 表示不限制 | 0 |
| WEB_PROXY_HEADERS | 是否信任代理转发头供 Uvicorn 解析 | True |
| WEB_FORWARDED_ALLOW_IPS | 允许 Uvicorn 信任的代理 IP 列表 | 127.0.0.1 |
| WEB_LOG_LEVEL | Uvicorn 日志级别 | info |
| EMBEDDED_SCHEDULER_ENABLED | Web 进程是否内嵌 scheduler；留空时仅本地开发环境自动开启 | - |
| ASYNC_PUSH_QUEUE_SIZE | 后台异步推送队列容量 | 2000 |
| REMINDER_PROCESS_BATCH_SIZE | 单批次处理的待发送预约提醒数 | 200 |
| ASYNC_LOG_QUEUE_SIZE | 后台异步系统日志队列容量 | 5000 |
| ASYNC_LOG_BATCH_SIZE | 单次批量写入的系统日志条数上限 | 100 |
| ASYNC_LOG_FLUSH_SECONDS | 异步系统日志批次最大等待时间（秒） | 0.5 |
| DATABASE_URL | 数据库连接URL | - |
| DB_POOL_SIZE | 数据库连接池基础连接数 | 10 |
| DB_MAX_OVERFLOW | 数据库连接池溢出连接数 | 20 |
| DB_POOL_TIMEOUT_SECONDS | 获取数据库连接的等待超时（秒） | 30 |
| DB_POOL_RECYCLE_SECONDS | 数据库连接回收时间（秒） | 1800 |
| DB_POOL_PRE_PING | 是否在借出连接前预检查 | True |
| REDIS_URL | Redis 连接 URL；为空时只使用进程内 TTL 缓存 | redis://localhost:6379/0 |
| SECRET_KEY | JWT密钥 | - |
| ALGORITHM | JWT算法 | HS256 |
| ACCESS_TOKEN_EXPIRE_MINUTES | Access Token过期时间（分钟） | 30 |
| REFRESH_TOKEN_EXPIRE_DAYS | Refresh Token过期时间（天） | 30 |
| CORS_ORIGINS | 允许的CORS源 | - |
| AWS_ACCESS_KEY_ID | AWS访问密钥 | - |
| AWS_SECRET_ACCESS_KEY | AWS密钥 | - |
| S3_BUCKET_NAME | S3存储桶名称 | - |
| UPLOAD_SERVING_MODE | 上传文件访问模式：`app`、`redirect`、`x_accel_redirect` | app |
| UPLOADS_REDIRECT_BASE_URL | `redirect` 模式下的外部静态资源基地址 | - |
| UPLOADS_ACCEL_REDIRECT_PREFIX | `x_accel_redirect` 模式下的内部加速路径前缀 | - |
| UPLOADS_CACHE_CONTROL_SECONDS | 上传资源 `Cache-Control max-age` 秒数 | 31536000 |

### 上传文件加速建议

- `UPLOAD_SERVING_MODE=app`
  由 FastAPI 直接返回文件，适合本地开发和简单部署。

- `UPLOAD_SERVING_MODE=redirect`
  配合 `UPLOADS_REDIRECT_BASE_URL`，API 仍然返回 `/uploads/...` 路径，但实际下载会 307 跳转到 CDN 或静态资源域名。

- `UPLOAD_SERVING_MODE=x_accel_redirect`
  配合 `UPLOADS_ACCEL_REDIRECT_PREFIX`，适合 Nginx 反向代理场景。应用只返回 `X-Accel-Redirect` 头，真正文件读取由 Nginx 完成。

## 常见问题

### Q: 数据库连接失败

A: 检查`.env`文件中的`DATABASE_URL`配置是否正确，确保MySQL服务正在运行。

### Q: 迁移失败

A: 确保数据库已创建，并且用户有足够的权限。可以尝试删除`alembic/versions/`中的迁移文件，重新生成。

### Q: JWT Token无效

A: 检查`SECRET_KEY`是否正确配置，确保前后端使用相同的密钥。

## 贡献指南

1. Fork本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 许可证

MIT License

## 联系方式

- 项目地址: https://github.com/kevinsubmit/Nailsdashh5
- 前端仓库: https://github.com/kevinsubmit/Nailsdashh5

---

**开发者**: Manus AI  
**创建日期**: 2026-01-01  
**版本**: 1.0.0
