# FigmaFrontend 开发任务列表

## 店铺管理模块

### 后端开发
- [x] 分析现有店铺相关数据库表结构
- [x] 创建店铺CRUD API端点
  - [x] GET /api/v1/stores/ - 获取店铺列表（支持分页、筛选）
  - [x] GET /api/v1/stores/{store_id} - 获取店铺详情
  - [x] POST /api/v1/stores/ - 创建店铺（管理员）
  - [x] PATCH /api/v1/stores/{store_id} - 更新店铺信息（管理员）
  - [x] DELETE /api/v1/stores/{store_id} - 删除店铺（管理员）
- [ ] 实现店铺营业时间管理
  - [ ] GET /api/v1/stores/{store_id}/hours - 获取营业时间
  - [ ] PUT /api/v1/stores/{store_id}/hours - 更新营业时间
- [x] 实现店铺图片管理
  - [x] GET /api/v1/stores/{store_id}/images - 获取店铺图片
  - [x] POST /api/v1/stores/{store_id}/images - 上传店铺图片
  - [x] DELETE /api/v1/stores/{store_id}/images/{image_id} - 删除图片
- [x] 实现店铺服务项目关联
  - [x] GET /api/v1/stores/{store_id}/services - 获取店铺提供的服务

### API测试
- [x] 测试店铺列表API
- [x] 测试店铺详情API
- [x] 测试店铺创建API
- [x] 测试店铺更新API
- [ ] 测试营业时间管理
- [x] 测试图片管理

### 前端集成
- [ ] 更新StoreDetails组件使用真实API
- [ ] 更新Services组件的店铺列表
- [ ] 测试前端与后端集成

### 文档
- [x] 创建店铺管理模块API文档
- [x] 更新README.md
- [x] 提交代码到GitHub

## 已完成功能
- [x] 用户认证系统
- [x] 预约管理功能
- [x] Reschedule功能

## 服务项目管理模块

### 后端开发
- [x] 分析现有服务相关数据库表结构
- [x] 创建服务项目CRUD API端点
  - [x] GET /api/v1/services/ - 获取服务列表（支持分页、分类筛选）
  - [x] GET /api/v1/services/{service_id} - 获取服务详情
  - [x] POST /api/v1/services/ - 创建服务（管理员）
  - [x] PATCH /api/v1/services/{service_id} - 更新服务信息（管理员）
  - [x] DELETE /api/v1/services/{service_id} - 删除服务（管理员）
- [x] 实现服务分类管理
  - [x] GET /api/v1/services/categories - 获取所有分类
  - [ ] POST /api/v1/services/categories - 创建分类（管理员）
- [x] 实现服务可用性管理
  - [x] PATCH /api/v1/services/{service_id}/availability - 切换服务可用状态

### API测试
- [x] 测试服务列表API
- [x] 测试服务详情API
- [x] 测试服务创建API
- [x] 测试服务更新API
- [x] 测试服务删除API
- [x] 测试分类管理API

### 文档
- [x] 创建服务项目管理模块API文档
- [x] 更新README.md
- [x] 提交代码到GitHub

## 美甲师管理模块

### 后端开发
- [x] 分析现有美甲师相关数据库表结构
- [x] 创建美甲师CRUD API端点
  - [x] GET /api/v1/technicians/ - 获取美甲师列表（支持分页、店铺筛选）
  - [x] GET /api/v1/technicians/{technician_id} - 获取美甲师详情
  - [x] POST /api/v1/technicians/ - 创建美甲师（管理员）
  - [x] PATCH /api/v1/technicians/{technician_id} - 更新美甲师信息（管理员）
  - [x] DELETE /api/v1/technicians/{technician_id} - 删除美甲师（管理员）
- [x] 实现美甲师可用性管理
  - [x] PATCH /api/v1/technicians/{technician_id}/availability - 切换美甲师可用状态

### API测试
- [x] 测试美甲师列表API
- [x] 测试美甲师详情API
- [x] 测试美甲师创建API
- [x] 测试美甲师更新API
- [x] 测试美甲师删除API
- [x] 测试可用性管理API

### 文档
- [x] 创建美甲师管理模块API文档
- [x] 更新README.md
- [ ] 提交代码到GitHub
