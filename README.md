# NailsDash - 美甲预约平台

一个功能完整的美甲预约平台，包含H5移动端前端和FastAPI后端系统。

## 项目结构

```
Nailsdashh5/
├── frontend/          # React前端代码（H5移动端）
│   ├── src/          # 源代码
│   ├── public/       # 静态资源
│   ├── package.json  # 前端依赖
│   └── README.md     # 前端文档
│
├── backend/          # FastAPI后端代码
│   ├── app/         # 应用代码
│   ├── alembic/     # 数据库迁移
│   ├── requirements.txt  # 后端依赖
│   ├── README.md    # 后端文档
│   ├── TEST_REPORT.md    # 测试报告
│   └── DATABASE_DESIGN.md # 数据库设计
│
└── README.md         # 项目总体说明（本文件）
```

## 技术栈

### 前端
- **React** - UI框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **CSS** - 样式

### 后端
- **FastAPI** - Python Web框架
- **SQLAlchemy** - ORM
- **MySQL/TiDB** - 数据库
- **JWT** - 认证
- **Alembic** - 数据库迁移

## 快速开始

### 前端开发

```bash
cd frontend
npm install
npm run dev
```

访问：http://localhost:5173

### 后端开发

```bash
cd backend
pip install -r requirements.txt
python init_db.py
uvicorn app.main:app --reload
```

访问API文档：http://localhost:8000/api/docs

## 功能特性

### 已实现功能

#### 前端（Figma设计）
- ✅ 首页（Pinterest风格瀑布流）
- ✅ 服务预约流程
- ✅ 预约管理
- ✅ 用户资料
- ✅ 优惠券系统
- ✅ 礼品卡系统
- ✅ 积分系统
- ✅ VIP会员系统（10级）
- ✅ 订单历史
- ✅ Pin创作和收藏

#### 后端（已完成）
- ✅ 用户认证系统
  - 用户注册
  - 用户登录
  - JWT Token认证
  - Token刷新
- ✅ 数据库设计（23个表）
- ✅ API文档（Swagger UI）
- ✅ 测试覆盖（7/7通过）

### 待开发功能

#### 后端模块
- [x] 店铺管理模块（已完成）
- [x] 服务项目模块（已完成）
- [x] 美甲师模块（已完成）
- [ ] 预约系统
- [ ] VIP会员系统
- [ ] 积分系统
- [ ] 优惠券系统
- [ ] 礼品卡系统
- [ ] Pin内容系统
- [ ] 订单系统
- [ ] 评价系统

## 数据库设计

后端系统设计了23个核心表，涵盖以下模块：

1. **用户管理** - backend_users
2. **店铺管理** - stores, store_images, store_hours
3. **服务管理** - services, service_categories
4. **美甲师** - stylists, stylist_portfolios
5. **预约系统** - appointments
6. **VIP会员** - vip_levels, user_vip
7. **积分系统** - points_transactions
8. **优惠券** - coupons, user_coupons
9. **礼品卡** - gift_cards, gift_card_transactions
10. **Pin内容** - pins, pin_likes, pin_saves
11. **订单** - orders, order_items
12. **评价** - reviews, review_images

详细设计请查看：`backend/DATABASE_DESIGN.md`

## API文档

后端提供完整的RESTful API，包括：

### 认证相关
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `GET /api/v1/auth/me` - 获取当前用户
- `POST /api/v1/auth/refresh` - 刷新Token

### 系统相关
- `GET /health` - 健康检查
- `GET /api/docs` - Swagger UI文档

### 店铺管理
- `GET /api/v1/stores/` - 获取店铺列表
- `GET /api/v1/stores/{store_id}` - 获取店铺详情
- `POST /api/v1/stores/` - 创建店铺（管理员）
- `PATCH /api/v1/stores/{store_id}` - 更新店铺（管理员）
- `DELETE /api/v1/stores/{store_id}` - 删除店铺（管理员）
- `GET /api/v1/stores/{store_id}/images` - 获取店铺图片
- `POST /api/v1/stores/{store_id}/images` - 添加店铺图片（管理员）
- `DELETE /api/v1/stores/{store_id}/images/{image_id}` - 删除图片（管理员）
- `GET /api/v1/stores/{store_id}/services` - 获取店铺服务

### 服务项目管理
- `GET /api/v1/services/` - 获取服务列表
- `GET /api/v1/services/{service_id}` - 获取服务详情
- `POST /api/v1/services/` - 创建服务（管理员）
- `PATCH /api/v1/services/{service_id}` - 更新服务（管理员）
- `DELETE /api/v1/services/{service_id}` - 删除服务（管理员）
- `PATCH /api/v1/services/{service_id}/availability` - 切换服务可用性（管理员）
- `GET /api/v1/services/categories` - 获取服务分类列表

### 美甲师管理
- `GET /api/v1/technicians/` - 获取美甲师列表
- `GET /api/v1/technicians/{technician_id}` - 获取美甲师详情
- `POST /api/v1/technicians/` - 创建美甲师（管理员）
- `PATCH /api/v1/technicians/{technician_id}` - 更新美甲师（管理员）
- `DELETE /api/v1/technicians/{technician_id}` - 删除美甲师（管理员）
- `PATCH /api/v1/technicians/{technician_id}/availability` - 切换美甲师可用性（管理员）

更多API端点正在开发中...

## 测试

### 后端测试

```bash
cd backend
python test_api.py
```

**测试结果**：7/7 测试通过 (100%)

详细测试报告：`backend/TEST_REPORT.md`

## API文档

- [店铺管理模块API文档](docs/Store_Management_API.md)
- [服务项目管理模块API文档](docs/Service_Management_API.md)
- [美甲师管理模块API文档](docs/Technician_Management_API.md)
- [Reschedule功能测试报告](docs/NailsDash_Reschedule_Test_Report.md)

## 部署

### 前端部署

```bash
cd frontend
npm run build
# 将dist目录部署到静态服务器
```

### 后端部署

```bash
cd backend
# 使用Gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker

# 或使用Docker
docker build -t nailsdash-backend .
docker run -p 8000:8000 nailsdash-backend
```

## 环境变量

### 后端环境变量

创建 `backend/.env` 文件：

```env
DATABASE_URL=mysql://user:password@host:3306/database
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:5173,https://yourdomain.com
```

详细配置请查看：`backend/.env.example`

## 开发进度

- [x] 项目初始化
- [x] 前端Figma设计实现
- [x] 后端框架搭建
- [x] 用户认证系统
- [x] 数据库设计
- [ ] 店铺管理模块
- [ ] 预约系统
- [ ] VIP会员系统
- [ ] 前后端联调
- [ ] 生产环境部署

## 贡献指南

1. Fork本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 许可证

MIT License

## 联系方式

- GitHub: https://github.com/kevinsubmit/Nailsdashh5
- 开发者: Manus AI

---

**最后更新**: 2026-01-01  
**版本**: 1.0.0  
**状态**: 开发中
