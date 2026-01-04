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
- [x] 提交代码到GitHub

## 权限体系优化

### 需求分析
- [x] 设计三级权限体系（超级管理员、店铺管理员、普通用户）
- [x] 用户表添加店铺关联字段（store_id）
- [x] 区分is_admin（超级管理员）和店铺管理员

### 后端开发
- [x] 修改用户模型添加store_id字段
- [x] 创建店铺管理员权限验证依赖（get_current_store_admin）
- [x] 修改美甲师API权限验证逻辑
  - [x] 创建美甲师：店铺管理员只能为自己店铺创建
  - [x] 更新美甲师：验证美甲师是否属于当前管理员的店铺
  - [x] 删除美甲师：验证美甲师是否属于当前管理员的店铺
  - [x] 切换可用性：验证美甲师是否属于当前管理员的店铺
- [x] 修改店铺API权限验证逻辑
  - [x] 更新店铺信息：店铺管理员只能更新自己的店铺
  - [x] 删除店铺：只有超级管理员可以删除店铺
  - [x] 添加店铺图片：店铺管理员只能为自己的店铺添加图片
  - [x] 删除店铺图片：店铺管理员只能删除自己店铺的图片
- [x] 修改服务API权限验证逻辑
  - [x] 创建服务：店铺管理员只能为自己店铺创建服务
  - [x] 更新服务：店铺管理员只能更新自己店铺的服务
  - [x] 删除服务：店铺管理员只能删除自己店铺的服务
  - [x] 切换服务可用性：店铺管理员只能切换自己店铺的服务

### 测试
- [x] 测试超级管理员权限（可以管理所有店铺和美甲师）
- [x] 测试店铺管理员权限（只能管理自己店铺的美甲师）
- [x] 测试跨店铺操作被拒绝
- [x] 测试店铺管理权限（更新店铺、添加/删除图片）
- [x] 测试服务管理权限（创建、更新、删除、切换可用性）
- [x] 测试美甲师管理权限（创建、更新、删除、切换可用性）

### 文档
- [x] 更新API文档说明权限体系
  - [x] 更新Store_Management_API.md
  - [x] 更新Service_Management_API.md
  - [x] Technician_Management_API.md已在之前更新
- [x] 更新README
- [x] 提交代码到GitHub

## 预约系统增强

### Phase 1: 时间冲突检查
- [x] 分析现有预约系统代码和数据库结构
- [x] 实现美甲师时间冲突检查
  - [x] 检查美甲师在预约时间段是否已有其他预约
  - [x] 根据服务时长计算时间段占用
  - [x] 返回明确的冲突错误提示
- [x] 实现用户时间冲突检查
  - [x] 检查用户在预约时间段是否已有其他预约
  - [x] 防止用户同时预约多个服务
- [x] 在创建预约API中集成冲突检查

### Phase 2: 美甲师日程管理
- [x] 实现获取美甲师预约列表API
  - [x] GET /api/v1/technicians/{technician_id}/appointments
  - [x] 支持按日期筛选
  - [x] 支持按状态筛选
- [x] 实现获取美甲师可用时间段API
  - [x] GET /api/v1/technicians/{technician_id}/available-slots
  - [x] 根据已有预约计算可用时间
  - [x] 考虑店铺营业时间
  - [x] 返回可预约的时间段列表

### Phase 3: 店铺管理员预约管理
- [x] 实现店铺预约列表API
  - [x] GET /api/v1/stores/{store_id}/appointments
  - [x] 店铺管理员只能查看自己店铺的预约
  - [x] 支持按日期、状态筛选
  - [x] 支持分页
- [x] 实现店铺管理员确认预约API
  - [x] PATCH /api/v1/appointments/{id}/confirm
  - [x] 验证预约属于管理员的店铺
- [x] 实现预约统计API
  - [x] GET /api/v1/stores/{store_id}/appointments/stats
  - [x] 今日预约数、本周预约数、本月预约数
  - [x] 按状态统计

### Phase 4: 预约状态流转规则

- [x] 定义状态转换规则
  - [x] pending -> confirmed (店铺管理员确认)
  - [x] pending -> cancelled (用户取消)
  - [x] confirmed -> completed (服务完成)
  - [x] confirmed -> cancelled (特殊情况)
- [x] 在更新预约API中添加状态验证
- [ ] 添加状态变更历史记录表（可选）
### 测试
- [x] 测试时间冲突检查（美甲师冲突、用户冲突）
- [x] 测试美甲师日程查询
- [x] 测试可用时间段计算
- [x] 测试店铺管理员预约管理权限
- [x] 测试预约统计数据准确性
- [x] 测试状态流转规则

### 文档
- [x] 创建预约系统增强API文档
- [x] 更新README
- [x] 提交代码到GitHub

## 店铺营业时间管理

### 数据库设计
- [x] 设计store_hours表结构
- [x] 创建SQLAlchemy模型
- [x] 创建数据库迁移脚本
- [x] 执行迁移

### API开发
- [x] 创建营业时间Schema（Pydantic）
- [x] 实现营业时间CRUD操作
- [x] 创建API端点
  - [x] GET /api/v1/stores/{store_id}/hours - 获取营业时间
  - [x] PUT /api/v1/stores/{store_id}/hours - 更新营业时间
  - [x] POST /api/v1/stores/{store_id}/hours/batch - 批量设置营业时间
- [x] 添加权限控制（店铺管理员）

### 集成
- [x] 更新可用时间段计算逻辑
- [x] 使用店铺实际营业时间替代硬编码
- [x] 处理店铺休息日情况

### 测试
- [ ] 测试营业时间CRUD操作
- [ ] 测试权限控制
- [ ] 测试可用时间段计算集成
- [ ] 测试边界情况（休息日、跨天营业等）

### 文档
- [ ] 创建营业时间管理API文档
- [ ] 更新README
- [ ] 提交代码到GitHub


## 预约通知系统

### Phase 1: 设计通知系统架构和数据库
- [x] 设计notification表结构
- [x] 创建SQLAlchemy模型
- [x] 确定通知触发场景
- [x] 设计通知模板

### Phase 2: 开发通知服务和API
- [x] 创建通知服务（notification_service.py）
- [x] 实现通知CRUD操作
- [x] 创建通知API端点
  - [x] GET /api/v1/notifications - 获取用户通知列表
  - [x] GET /api/v1/notifications/{id} - 获取通知详情
  - [x] PATCH /api/v1/notifications/{id}/read - 标记为已读
  - [x] DELETE /api/v1/notifications/{id} - 删除通知
- [x] 实现通知发送逻辑

### Phase 3: 集成到预约流程
- [x] 预约创建时通知店铺管理员
- [x] 预约确认时通知用户
- [x] 预约取消时通知相关方
- [x] 预约完成时通知用户

### Phase 4: 测试和文档
- [x] 测试通知创建和发送
- [x] 测试通知查询和管理
- [x] 测试与预约流程的集成
- [x] 创建通知系统API文档
- [x] 更新README
- [x] 提交代码到GitHub

## 前端H5页面开发

### Phase 1: 确认前端技术栈和项目结构
- [x] 检查前端项目结构
- [x] 确认技术栈（React + TypeScript + Vite）
- [x] 安装依赖

### Phase 2: 开发用户端H5页面
- [ ] 完善预约流程
  - [ ] 集成可用时间段API
  - [ ] 显示美甲师休假信息
  - [ ] 显示店铺营业时间
  - [ ] 优化时间选择UI
- [x] 创建通知中心页面
  - [x] 通知列表展示
  - [x] 未读通知徽章
  - [x] 标记已读功能
  - [x] 通知详情查看
- [ ] 完善我的预约页面
  - [ ] 显示预约状态
  - [ ] 取消预约功能
  - [ ] 查看预约详情

### Phase 3: 开发管理端H5页面
- [ ] 创建管理员Dashboard
  - [ ] 预约统计展示
  - [ ] 待确认预约列表
  - [ ] 快速确认/完成预约
- [ ] 营业时间管理页面
  - [ ] 查看当前营业时间
  - [ ] 编辑营业时间
  - [ ] 设置休息日
- [ ] 美甲师休假管理页面
  - [ ] 查看休假列表
  - [ ] 添加休假
  - [ ] 删除休假

### Phase 4: 测试和优化
- [ ] 功能测试
- [ ] UI/UX优化
- [ ] 性能优化
- [ ] 移动端适配


## 完善预约流程（当前任务）

### Phase 1: 分析现有预约页面和API
- [ ] 查看现有Appointments组件
- [ ] 确认需要集成的后端API
- [ ] 设计预约流程UI

### Phase 2: 开发预约创建流程
- [x] 创建店铺选择页面
- [x] 创建服务选择页面
- [x] 创建美甲师选择页面
- [x] 创建时间选择页面
  - [x] 集成可用时间段API
  - [x] 显示美甲师休假信息
  - [x] 显示店铺营业时间
- [x] 创建预约确认页面
- [x] 提交预约到后端

### Phase 3: 完善我的预约页面
- [ ] 显示预约列表
- [ ] 显示预约状态（pending/confirmed/completed/cancelled）
- [ ] 预约详情查看
- [ ] 取消预约功能
- [ ] 与通知系统联动

### Phase 4: 测试和优化
- [ ] 功能测试
- [ ] UI/UX优化
- [ ] 错误处理
- [ ] 加载状态优化


## 优化预约流程

- [x] 将美甲师选择改为可选步骤
  - [x] 添加“跳过”按钮
  - [x] 不指定美甲师，由店铺安排
  - [x] 允许直接进入日期时间选择
