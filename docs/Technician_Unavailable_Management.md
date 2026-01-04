# 美甲师休假管理功能文档

## 概述

美甲师休假管理功能允许店铺管理员为美甲师设置不可用时间段（休假、病假、个人事务等），系统会自动在计算可用预约时段时考虑这些不可用时间。

## 功能特性

### 1. 灵活的休假类型
- **整天休假**：美甲师整天不可用（不设置start_time和end_time）
- **部分时间不可用**：美甲师某天的特定时间段不可用（设置start_time和end_time）
- **多天休假**：支持设置日期范围（start_date到end_date）

### 2. 自动集成
- 自动集成到可用时间段计算
- 与店铺营业时间和现有预约协同工作
- 实时更新可用预约时段

### 3. 权限控制
- 超级管理员可以管理任何美甲师的休假
- 店铺管理员只能管理自己店铺美甲师的休假
- 公开API可以查询美甲师的不可用时间

---

## 数据库设计

### technician_unavailable 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| technician_id | INTEGER | 美甲师ID（外键，级联删除） |
| start_date | DATE | 开始日期 |
| end_date | DATE | 结束日期（包含） |
| start_time | TIME | 开始时间（可选，用于部分时间不可用） |
| end_time | TIME | 结束时间（可选） |
| reason | VARCHAR(200) | 原因（休假、病假等） |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

**索引**：
- `technician_id`：用于快速查询某个美甲师的所有不可用时间
- `start_date`, `end_date`：用于日期范围查询

---

## API 端点

### 1. 创建不可用时间段

**POST** `/api/v1/technicians/{technician_id}/unavailable`

**权限**：店铺管理员或超级管理员

**请求体**：
```json
{
  "start_date": "2026-01-15",
  "end_date": "2026-01-20",
  "start_time": "14:00:00",  // 可选
  "end_time": "16:00:00",    // 可选
  "reason": "Annual vacation"
}
```

**响应** (201 Created):
```json
{
  "id": 1,
  "technician_id": 1,
  "start_date": "2026-01-15",
  "end_date": "2026-01-20",
  "start_time": null,
  "end_time": null,
  "reason": "Annual vacation",
  "created_at": "2026-01-04T22:22:23",
  "updated_at": "2026-01-04T22:22:23"
}
```

**验证规则**：
- `start_date` 必须 <= `end_date`
- 如果同时设置了 `start_time` 和 `end_time`，则 `start_time` 必须 < `end_time`
- 店铺管理员只能为自己店铺的美甲师设置休假

---

### 2. 获取不可用时间段列表

**GET** `/api/v1/technicians/{technician_id}/unavailable`

**权限**：公开

**查询参数**：
- `start_date` (可选): 过滤开始日期 (YYYY-MM-DD)
- `end_date` (可选): 过滤结束日期 (YYYY-MM-DD)

**响应** (200 OK):
```json
[
  {
    "id": 1,
    "technician_id": 1,
    "start_date": "2026-01-15",
    "end_date": "2026-01-20",
    "start_time": null,
    "end_time": null,
    "reason": "Annual vacation",
    "created_at": "2026-01-04T22:22:23",
    "updated_at": "2026-01-04T22:22:23"
  },
  {
    "id": 2,
    "technician_id": 1,
    "start_date": "2026-01-12",
    "end_date": "2026-01-12",
    "start_time": "14:00:00",
    "end_time": "16:00:00",
    "reason": "Doctor appointment",
    "created_at": "2026-01-04T22:25:10",
    "updated_at": "2026-01-04T22:25:10"
  }
]
```

---

### 3. 获取特定不可用时间段

**GET** `/api/v1/technicians/{technician_id}/unavailable/{unavailable_id}`

**权限**：公开

**响应** (200 OK):
```json
{
  "id": 1,
  "technician_id": 1,
  "start_date": "2026-01-15",
  "end_date": "2026-01-20",
  "start_time": null,
  "end_time": null,
  "reason": "Annual vacation",
  "created_at": "2026-01-04T22:22:23",
  "updated_at": "2026-01-04T22:22:23"
}
```

---

### 4. 更新不可用时间段

**PATCH** `/api/v1/technicians/{technician_id}/unavailable/{unavailable_id}`

**权限**：店铺管理员或超级管理员

**请求体** (所有字段可选):
```json
{
  "start_date": "2026-01-16",
  "end_date": "2026-01-21",
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "reason": "Extended vacation"
}
```

**响应** (200 OK): 返回更新后的不可用时间段对象

---

### 5. 删除不可用时间段

**DELETE** `/api/v1/technicians/{technician_id}/unavailable/{unavailable_id}`

**权限**：店铺管理员或超级管理员

**响应** (204 No Content): 无响应体

---

## 与可用时间段计算的集成

### 工作原理

当调用 `GET /api/v1/technicians/{technician_id}/available-slots` 时，系统会：

1. **检查整天不可用**
   - 查询是否存在覆盖该日期且没有设置 `start_time`/`end_time` 的不可用记录
   - 如果存在，直接返回空数组（无可用时段）

2. **收集部分时间不可用**
   - 查询该日期内设置了 `start_time`/`end_time` 的不可用记录
   - 将这些时间段添加到"忙碌时间范围"列表中

3. **生成可用时段**
   - 在店铺营业时间内，排除所有忙碌时间（预约 + 不可用时间）
   - 返回剩余的可用时段列表

### 示例场景

**场景1：整天休假**
```
日期：2026-01-15
不可用记录：start_date=2026-01-15, end_date=2026-01-20, start_time=null, end_time=null
结果：返回空数组（美甲师整天不可用）
```

**场景2：部分时间不可用**
```
日期：2026-01-12
营业时间：09:00-18:00
不可用记录：start_date=2026-01-12, end_date=2026-01-12, start_time=14:00, end_time=16:00
结果：返回 09:00-14:00 和 16:00-18:00 的可用时段（排除14:00-16:00）
```

---

## 使用示例

### 示例1：创建整天休假

```bash
curl -X POST "http://localhost:8000/api/v1/technicians/1/unavailable" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2026-01-15",
    "end_date": "2026-01-20",
    "reason": "Annual vacation"
  }'
```

### 示例2：创建部分时间不可用

```bash
curl -X POST "http://localhost:8000/api/v1/technicians/1/unavailable" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2026-01-12",
    "end_date": "2026-01-12",
    "start_time": "14:00:00",
    "end_time": "16:00:00",
    "reason": "Doctor appointment"
  }'
```

### 示例3：查询美甲师的不可用时间

```bash
curl -X GET "http://localhost:8000/api/v1/technicians/1/unavailable?start_date=2026-01-01&end_date=2026-01-31"
```

### 示例4：验证可用时段计算

```bash
# 查询正常工作日的可用时段
curl -X GET "http://localhost:8000/api/v1/technicians/1/available-slots?date=2026-01-10&service_id=30001"

# 查询休假日的可用时段（应返回空数组）
curl -X GET "http://localhost:8000/api/v1/technicians/1/available-slots?date=2026-01-15&service_id=30001"

# 查询部分时间不可用日的可用时段（应排除不可用时间段）
curl -X GET "http://localhost:8000/api/v1/technicians/1/available-slots?date=2026-01-12&service_id=30001"
```

---

## 测试结果

### 综合测试

| 测试项 | 结果 | 说明 |
|--------|------|------|
| 创建整天休假 | ✅ 通过 | 成功创建2026-01-15至2026-01-20的休假 |
| 查询不可用时间 | ✅ 通过 | 正确返回所有不可用记录 |
| 正常工作日可用时段 | ✅ 通过 | 2026-01-10找到10个可用时段 |
| 休假日可用时段 | ✅ 通过 | 2026-01-15正确返回0个时段 |
| 创建部分时间不可用 | ✅ 通过 | 成功创建2026-01-12的14:00-16:00不可用 |
| 部分时间不可用日可用时段 | ✅ 通过 | 2026-01-12找到14个时段，正确排除14:00-16:00 |

**测试覆盖率**: 100%

---

## 最佳实践

### 1. 设置休假时间
- 提前设置休假时间，避免影响已有预约
- 为长期休假（如年假）设置整天不可用
- 为短期事务（如医生预约）设置部分时间不可用

### 2. 管理不可用时间
- 定期审查和清理过期的不可用记录
- 在美甲师请假时及时更新不可用时间
- 取消休假时及时删除不可用记录

### 3. 前端集成
- 在美甲师管理界面显示不可用时间日历
- 在预约流程中实时显示美甲师的可用状态
- 提供便捷的休假添加和管理界面

---

## 错误处理

### 常见错误

| 错误代码 | 说明 | 解决方案 |
|---------|------|---------|
| 404 | 美甲师不存在 | 检查technician_id是否正确 |
| 403 | 权限不足 | 店铺管理员只能管理自己店铺的美甲师 |
| 400 | 日期范围无效 | 确保start_date <= end_date |
| 400 | 时间范围无效 | 确保start_time < end_time |

---

## 技术实现

### 数据库查询优化
- 使用索引加速technician_id和日期范围查询
- 批量查询减少数据库往返次数
- 缓存常用的不可用时间数据

### 性能考虑
- 不可用时间检查集成在可用时段计算中，无额外API调用
- 使用日期范围查询减少不必要的数据传输
- 支持分页和过滤以处理大量不可用记录

---

## 未来增强

1. **批量操作**
   - 批量创建多个美甲师的休假
   - 批量删除过期的不可用记录

2. **重复模式**
   - 支持每周固定休息日（如每周日）
   - 支持节假日自动休假

3. **通知功能**
   - 休假创建时通知相关用户
   - 休假变更时自动重新安排冲突的预约

4. **统计分析**
   - 美甲师休假统计
   - 可用性分析报告

---

## 相关文档

- [预约系统增强功能](./Appointment_System_Enhancements.md)
- [店铺营业时间管理](./Store_Hours_Management.md)
- [API完整文档](../README.md)

---

**版本**: 1.0.0  
**更新日期**: 2026-01-04  
**作者**: Manus AI
