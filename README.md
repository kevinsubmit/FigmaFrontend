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

## 权限体系

系统实现了三级权限管理：

**超级管理员**（Super Admin）
- 平台拥有者账户
- 可以管理所有店铺和资源
- 用户表中 `is_admin=true`

**店铺管理员**（Store Manager）
- 店铺老板账户
- 只能管理自己店铺的资源（美甲师、服务等）
- 用户表中 `store_id` 不为空

**普通用户**
- 只能查看公开信息和管理自己的预约
- 无法管理任何店铺资源

## 快速开始

### 一键启动（Docker Compose，推荐）

```bash
docker compose up --build
```

访问：
- 前端：http://localhost:5173
- 后端文档：http://localhost:8000/api/docs

更多说明：`docs/quickstart.md`

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
cp .env.example .env
alembic upgrade head
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

## 文档索引

- 快速启动：`docs/quickstart.md`
- 常见问题：`docs/FAQ.md`

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

## 预约系统增强功能

### 功能概述

预约系统增强功能包含以下核心模块：

1. **时间冲突检查**
   - 自动检查美甲师时间冲突（考虑服务时长）
   - 自动检查用户时间冲突
   - 创建预约时自动执行，无需额外调用

2. **美甲师日程管理**
   - 获取美甲师预约列表（支持按日期、状态筛选）
   - 获取美甲师可用时间段（自动计算基于已有预约）
   - API: `GET /api/v1/technicians/{id}/appointments`
   - API: `GET /api/v1/technicians/{id}/available-slots`

3. **店铺管理员预约管理**
   - 查看店铺所有预约（支持筛选、分页）
   - 获取预约统计（今日、本周、本月）
   - 确认预约（pending → confirmed）
   - 完成预约（confirmed → completed）
   - API: `GET /api/v1/stores/{id}/appointments`
   - API: `GET /api/v1/stores/{id}/appointments/stats`
   - API: `PATCH /api/v1/appointments/{id}/confirm`
   - API: `PATCH /api/v1/appointments/{id}/complete`

4. **预约状态流转规则**
   - 定义清晰的状态转换规则
   - 自动验证状态转换的合法性
   - 防止无效的状态变更

### 文档

完整的API文档请参考：[预约系统增强功能 API 文档](docs/Appointment_System_Enhancements.md)

### 测试

运行综合测试：

```bash
cd backend
python3 test_appointment_enhancements.py
```

测试覆盖率：100%（9个测试用例全部通过）


## 店铺营业时间管理

### 功能概述

店铺营业时间管理功能允许每个店铺设置自己的营业时间，支持：

- 为每周7天分别设置不同的营业时间
- 标记休息日（如周日休息）
- 灵活调整单日营业时间（如节假日）
- 与预约系统深度集成，自动使用实际营业时间计算可用预约时段

### API端点

- `GET /api/v1/stores/{id}/hours` - 获取店铺营业时间（公开）
- `PUT /api/v1/stores/{id}/hours` - 批量设置营业时间（店铺管理员）
- `POST /api/v1/stores/{id}/hours/{day}` - 更新单日营业时间（店铺管理员）

### 使用示例

**设置营业时间**（周一至周五 9:00-18:00，周六 10:00-17:00，周日休息）：

```python
import requests

token = "your_admin_token"
headers = {"Authorization": f"Bearer {token}"}

hours_data = {
    "hours": [
        {"day_of_week": 0, "open_time": "09:00:00", "close_time": "18:00:00", "is_closed": False},
        {"day_of_week": 1, "open_time": "09:00:00", "close_time": "18:00:00", "is_closed": False},
        {"day_of_week": 2, "open_time": "09:00:00", "close_time": "18:00:00", "is_closed": False},
        {"day_of_week": 3, "open_time": "09:00:00", "close_time": "18:00:00", "is_closed": False},
        {"day_of_week": 4, "open_time": "09:00:00", "close_time": "18:00:00", "is_closed": False},
        {"day_of_week": 5, "open_time": "10:00:00", "close_time": "17:00:00", "is_closed": False},
        {"day_of_week": 6, "open_time": None, "close_time": None, "is_closed": True}
    ]
}

resp = requests.put("http://localhost:8000/api/v1/stores/4/hours", headers=headers, json=hours_data)
```

### 与预约系统集成

可用时间段计算会自动使用店铺的实际营业时间：

- 营业日：只在营业时间内生成可预约时段
- 休息日：返回空的可用时间段列表
- 不同店铺可以有不同的营业时间

### 文档

完整的API文档请参考：[店铺营业时间管理 API 文档](docs/Store_Hours_Management.md)

### 测试

运行测试：

```bash
cd backend
python3 test_store_hours.py
```

测试覆盖率：100%（9个测试用例全部通过）


## 美甲师休假管理功能

### 功能概述
- 支持整天休假和部分时间不可用
- 自动集成到可用时间段计算
- 完整的CRUD API
- 权限控制（超级管理员/店铺管理员）

### 新增API端点
- `POST /api/v1/technicians/{id}/unavailable` - 创建不可用时间段
- `GET /api/v1/technicians/{id}/unavailable` - 获取不可用时间段列表
- `GET /api/v1/technicians/{id}/unavailable/{unavailable_id}` - 获取特定不可用时间段
- `PATCH /api/v1/technicians/{id}/unavailable/{unavailable_id}` - 更新不可用时间段
- `DELETE /api/v1/technicians/{id}/unavailable/{unavailable_id}` - 删除不可用时间段

### 使用场景
1. **年假**: 设置start_date和end_date，不设置时间
2. **病假**: 设置start_date和end_date，不设置时间
3. **临时事务**: 设置start_date=end_date，设置start_time和end_time

详细文档请参考：[docs/Technician_Unavailable_Management.md](docs/Technician_Unavailable_Management.md)


## 预约通知系统

实时通知系统，在预约状态变更时自动通知相关用户。

### 功能特性
- **自动通知**：预约创建、确认、取消、完成时自动发送通知
- **多角色支持**：客户和店铺管理员分别接收相关通知
- **未读管理**：支持标记已读、获取未读数量
- **关联预约**：通知关联具体预约，方便快速查看

### API端点
- `GET /api/v1/notifications` - 获取通知列表
- `GET /api/v1/notifications/{id}` - 获取通知详情
- `PATCH /api/v1/notifications/{id}/read` - 标记为已读
- `GET /api/v1/notifications/unread/count` - 获取未读数量
- `DELETE /api/v1/notifications/{id}` - 删除通知

详细文档：[预约通知系统 API 文档](docs/Notification_System.md)
