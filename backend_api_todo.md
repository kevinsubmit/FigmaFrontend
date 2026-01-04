# 后端API开发任务清单

## Phase 1: 实现后端店铺API（stores）
- [ ] 创建stores endpoint文件
- [ ] 实现GET /api/v1/stores - 获取店铺列表（支持搜索、筛选、分页）
- [ ] 实现GET /api/v1/stores/{store_id} - 获取店铺详情
- [ ] 实现GET /api/v1/stores/{store_id}/images - 获取店铺图片
- [ ] 实现GET /api/v1/stores/{store_id}/services - 获取店铺的服务列表

## Phase 2: 实现后端服务API（services）
- [ ] 创建services endpoint文件
- [ ] 实现GET /api/v1/services - 获取所有服务列表
- [ ] 实现GET /api/v1/services/{service_id} - 获取服务详情
- [ ] 实现GET /api/v1/services/categories - 获取服务分类列表

## Phase 3: 实现后端预约API（appointments）
- [ ] 创建appointments endpoint文件
- [ ] 实现POST /api/v1/appointments - 创建预约（需要认证）
- [ ] 实现GET /api/v1/appointments - 获取用户的预约列表（需要认证）
- [ ] 实现GET /api/v1/appointments/{appointment_id} - 获取预约详情（需要认证）
- [ ] 实现PATCH /api/v1/appointments/{appointment_id} - 更新预约状态（需要认证）
- [ ] 实现DELETE /api/v1/appointments/{appointment_id} - 取消预约（需要认证）
- [ ] 实现GET /api/v1/stores/{store_id}/available-times - 获取店铺可用时间段

## Phase 4: 测试后端API
- [ ] 使用Postman/curl测试所有端点
- [ ] 验证认证和权限控制
- [ ] 验证数据验证和错误处理
- [ ] 创建测试数据（店铺、服务）

## Phase 5-9: 前端对接和测试
（在后端API完成后进行）
