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
# 方式1: 使用uvicorn直接运行
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 方式2: 使用Python运行
python -m app.main
```

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
- `POST /api/v1/pins` - 创建Pin
- `POST /api/v1/pins/{id}/like` - 点赞Pin
- `POST /api/v1/pins/{id}/save` - 保存Pin

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

# 运行容器
docker run -d -p 8000:8000 --env-file .env nailsdash-backend
```

### 使用Gunicorn部署

```bash
# 安装Gunicorn
pip install gunicorn

# 运行
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
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
| DATABASE_URL | 数据库连接URL | - |
| SECRET_KEY | JWT密钥 | - |
| ALGORITHM | JWT算法 | HS256 |
| ACCESS_TOKEN_EXPIRE_MINUTES | Access Token过期时间（分钟） | 30 |
| CORS_ORIGINS | 允许的CORS源 | - |
| AWS_ACCESS_KEY_ID | AWS访问密钥 | - |
| AWS_SECRET_ACCESS_KEY | AWS密钥 | - |
| S3_BUCKET_NAME | S3存储桶名称 | - |

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
