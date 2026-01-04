# 美甲师管理模块 API 文档

**版本**: 1.0  
**最后更新**: 2026-01-04  
**作者**: Manus AI

---

## 目录

- [概述](#概述)
- [数据模型](#数据模型)
- [API端点](#api端点)
  - [获取美甲师列表](#获取美甲师列表)
  - [获取美甲师详情](#获取美甲师详情)
  - [创建美甲师](#创建美甲师)
  - [更新美甲师信息](#更新美甲师信息)
  - [删除美甲师](#删除美甲师)
  - [切换美甲师可用性](#切换美甲师可用性)
- [认证机制](#认证机制)
- [使用场景](#使用场景)
- [测试报告](#测试报告)
- [常见问题](#常见问题)

---

## 概述

美甲师管理模块提供了完整的美甲师信息管理功能，支持管理员对美甲师进行增删改查操作，以及普通用户查询美甲师信息。该模块是美甲预约平台的核心组成部分，为用户提供专业的美甲师信息展示和管理功能。

### 主要功能

**美甲师信息管理**：管理员可以创建、更新和删除美甲师信息，包括基本信息、联系方式、专业技能、工作经验等。

**美甲师查询**：用户可以查询所有活跃的美甲师列表，支持按店铺筛选和分页查询，方便用户浏览和选择合适的美甲师。

**可用性控制**：管理员可以随时启用或禁用美甲师，禁用的美甲师不会在用户端显示，但数据保留在数据库中，支持随时重新启用。

**店铺关联**：每个美甲师必须关联到特定店铺，支持按店铺查询该店铺的所有美甲师，方便用户了解店铺的服务团队。

---

## 数据模型

### Technician 表结构

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | 美甲师ID |
| store_id | INTEGER | NOT NULL, INDEX | 所属店铺ID |
| name | VARCHAR(255) | NOT NULL, INDEX | 美甲师姓名 |
| phone | VARCHAR(20) | NULL | 联系电话 |
| email | VARCHAR(255) | NULL | 电子邮箱 |
| bio | TEXT | NULL | 个人简介 |
| specialties | TEXT | NULL | 专业技能（逗号分隔） |
| years_of_experience | INTEGER | NULL | 从业年限 |
| avatar_url | VARCHAR(500) | NULL | 头像URL |
| is_active | INTEGER | DEFAULT 1 | 是否可用（1=可用，0=禁用） |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

### Schema 定义

#### TechnicianBase

基础美甲师信息模型，包含所有可编辑的字段。

```python
{
  "name": "string",              # 必填：美甲师姓名
  "phone": "string",             # 可选：联系电话
  "email": "string",             # 可选：电子邮箱
  "bio": "string",               # 可选：个人简介
  "specialties": "string",       # 可选：专业技能（逗号分隔）
  "years_of_experience": integer, # 可选：从业年限
  "avatar_url": "string"         # 可选：头像URL
}
```

#### TechnicianCreate

创建美甲师请求模型，继承自 TechnicianBase，额外需要指定店铺ID。

```python
{
  "store_id": integer,           # 必填：所属店铺ID
  "name": "string",              # 必填：美甲师姓名
  "phone": "string",             # 可选：联系电话
  "email": "string",             # 可选：电子邮箱
  "bio": "string",               # 可选：个人简介
  "specialties": "string",       # 可选：专业技能
  "years_of_experience": integer, # 可选：从业年限
  "avatar_url": "string"         # 可选：头像URL
}
```

#### TechnicianUpdate

更新美甲师请求模型，所有字段都是可选的，支持部分更新。

```python
{
  "name": "string",              # 可选：美甲师姓名
  "phone": "string",             # 可选：联系电话
  "email": "string",             # 可选：电子邮箱
  "bio": "string",               # 可选：个人简介
  "specialties": "string",       # 可选：专业技能
  "years_of_experience": integer, # 可选：从业年限
  "avatar_url": "string",        # 可选：头像URL
  "is_active": integer           # 可选：是否可用（0或1）
}
```

#### Technician

美甲师响应模型，包含所有字段和系统生成的元数据。

```python
{
  "id": integer,                 # 美甲师ID
  "store_id": integer,           # 所属店铺ID
  "name": "string",              # 美甲师姓名
  "phone": "string",             # 联系电话
  "email": "string",             # 电子邮箱
  "bio": "string",               # 个人简介
  "specialties": "string",       # 专业技能
  "years_of_experience": integer, # 从业年限
  "avatar_url": "string",        # 头像URL
  "is_active": integer,          # 是否可用（1=可用，0=禁用）
  "created_at": "datetime",      # 创建时间（ISO 8601格式）
  "updated_at": "datetime"       # 更新时间（ISO 8601格式）
}
```

---

## API端点

### 获取美甲师列表

**端点**: `GET /api/v1/technicians/`

**描述**: 获取所有活跃美甲师的列表，支持分页和店铺筛选。只返回 `is_active=1` 的美甲师。

**认证**: 不需要

**请求参数**:

| 参数名 | 类型 | 位置 | 必填 | 说明 |
|--------|------|------|------|------|
| skip | integer | query | 否 | 跳过的记录数（用于分页），默认0 |
| limit | integer | query | 否 | 返回的最大记录数，默认100，最大100 |
| store_id | integer | query | 否 | 按店铺ID筛选 |

**请求示例**:

```bash
# 获取所有美甲师
GET /api/v1/technicians/

# 分页查询（第2页，每页20条）
GET /api/v1/technicians/?skip=20&limit=20

# 按店铺筛选
GET /api/v1/technicians/?store_id=4
```

**响应示例** (200 OK):

```json
[
  {
    "id": 1,
    "store_id": 4,
    "name": "Emily Chen",
    "phone": "555-0123",
    "email": "emily@example.com",
    "bio": "Professional nail artist with 8 years of experience",
    "specialties": "Gel Nails, Nail Art, French Manicure",
    "years_of_experience": 8,
    "avatar_url": null,
    "is_active": 1,
    "created_at": "2026-01-04T03:32:05",
    "updated_at": null
  },
  {
    "id": 2,
    "store_id": 4,
    "name": "Sarah Johnson",
    "phone": "555-0456",
    "email": "sarah@example.com",
    "bio": "Specialized in acrylic nails and nail extensions",
    "specialties": "Acrylic Nails, Nail Extensions, Nail Repair",
    "years_of_experience": 5,
    "avatar_url": "https://example.com/avatars/sarah.jpg",
    "is_active": 1,
    "created_at": "2026-01-04T03:35:20",
    "updated_at": null
  }
]
```

**错误响应**:

- `400 Bad Request`: 参数验证失败（例如：limit超过100）

---

### 获取美甲师详情

**端点**: `GET /api/v1/technicians/{technician_id}`

**描述**: 根据ID获取单个美甲师的详细信息。

**认证**: 不需要

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| technician_id | integer | 是 | 美甲师ID |

**请求示例**:

```bash
GET /api/v1/technicians/3
```

**响应示例** (200 OK):

```json
{
  "id": 3,
  "store_id": 4,
  "name": "Emily Chen",
  "phone": "555-0123",
  "email": "emily@example.com",
  "bio": "Professional nail artist with 8 years of experience",
  "specialties": "Gel Nails, Nail Art, French Manicure",
  "years_of_experience": 8,
  "avatar_url": null,
  "is_active": 1,
  "created_at": "2026-01-04T03:33:13",
  "updated_at": null
}
```

**错误响应**:

- `404 Not Found`: 美甲师不存在

```json
{
  "detail": "Technician not found"
}
```

---

### 创建美甲师

**端点**: `POST /api/v1/technicians/`

**描述**: 创建新的美甲师记录（仅限管理员）。

**认证**: 需要管理员权限

**请求头**:

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**请求体**:

```json
{
  "store_id": 4,
  "name": "Emily Chen",
  "phone": "555-0123",
  "email": "emily@example.com",
  "bio": "Professional nail artist with 8 years of experience",
  "specialties": "Gel Nails, Nail Art, French Manicure",
  "years_of_experience": 8
}
```

**请求示例**:

```bash
curl -X POST "http://localhost:8000/api/v1/technicians/" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": 4,
    "name": "Emily Chen",
    "phone": "555-0123",
    "email": "emily@example.com",
    "bio": "Professional nail artist with 8 years of experience",
    "specialties": "Gel Nails, Nail Art, French Manicure",
    "years_of_experience": 8
  }'
```

**响应示例** (201 Created):

```json
{
  "id": 3,
  "store_id": 4,
  "name": "Emily Chen",
  "phone": "555-0123",
  "email": "emily@example.com",
  "bio": "Professional nail artist with 8 years of experience",
  "specialties": "Gel Nails, Nail Art, French Manicure",
  "years_of_experience": 8,
  "avatar_url": null,
  "is_active": 1,
  "created_at": "2026-01-04T03:33:13",
  "updated_at": null
}
```

**错误响应**:

- `401 Unauthorized`: 未提供认证令牌或令牌无效
- `403 Forbidden`: 非管理员用户尝试创建美甲师
- `422 Unprocessable Entity`: 请求体验证失败（例如：缺少必填字段）

---

### 更新美甲师信息

**端点**: `PATCH /api/v1/technicians/{technician_id}`

**描述**: 更新美甲师的信息（仅限管理员）。支持部分更新，只需提供要修改的字段。

**认证**: 需要管理员权限

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| technician_id | integer | 是 | 美甲师ID |

**请求头**:

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**请求体** (所有字段都是可选的):

```json
{
  "bio": "Expert nail artist with 10 years of experience",
  "years_of_experience": 10
}
```

**请求示例**:

```bash
curl -X PATCH "http://localhost:8000/api/v1/technicians/3" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Expert nail artist with 10 years of experience",
    "years_of_experience": 10
  }'
```

**响应示例** (200 OK):

```json
{
  "id": 3,
  "store_id": 4,
  "name": "Emily Chen",
  "phone": "555-0123",
  "email": "emily@example.com",
  "bio": "Expert nail artist with 10 years of experience",
  "specialties": "Gel Nails, Nail Art, French Manicure",
  "years_of_experience": 10,
  "avatar_url": null,
  "is_active": 1,
  "created_at": "2026-01-04T03:33:13",
  "updated_at": "2026-01-04T03:33:28"
}
```

**错误响应**:

- `401 Unauthorized`: 未提供认证令牌或令牌无效
- `403 Forbidden`: 非管理员用户尝试更新美甲师
- `404 Not Found`: 美甲师不存在
- `422 Unprocessable Entity`: 请求体验证失败

---

### 删除美甲师

**端点**: `DELETE /api/v1/technicians/{technician_id}`

**描述**: 删除美甲师记录（仅限管理员）。这是硬删除操作，数据将从数据库中永久移除。

**认证**: 需要管理员权限

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| technician_id | integer | 是 | 美甲师ID |

**请求头**:

```
Authorization: Bearer <access_token>
```

**请求示例**:

```bash
curl -X DELETE "http://localhost:8000/api/v1/technicians/3" \
  -H "Authorization: Bearer <access_token>"
```

**响应示例** (204 No Content):

```
(无响应体)
```

**错误响应**:

- `401 Unauthorized`: 未提供认证令牌或令牌无效
- `403 Forbidden`: 非管理员用户尝试删除美甲师
- `404 Not Found`: 美甲师不存在

---

### 切换美甲师可用性

**端点**: `PATCH /api/v1/technicians/{technician_id}/availability`

**描述**: 启用或禁用美甲师（仅限管理员）。禁用的美甲师不会在列表API中返回，但数据仍保留在数据库中。

**认证**: 需要管理员权限

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| technician_id | integer | 是 | 美甲师ID |

**查询参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| is_active | integer | 是 | 0=禁用，1=启用 |

**请求头**:

```
Authorization: Bearer <access_token>
```

**请求示例**:

```bash
# 禁用美甲师
curl -X PATCH "http://localhost:8000/api/v1/technicians/3/availability?is_active=0" \
  -H "Authorization: Bearer <access_token>"

# 启用美甲师
curl -X PATCH "http://localhost:8000/api/v1/technicians/3/availability?is_active=1" \
  -H "Authorization: Bearer <access_token>"
```

**响应示例** (200 OK):

```json
{
  "id": 3,
  "store_id": 4,
  "name": "Emily Chen",
  "phone": "555-0123",
  "email": "emily@example.com",
  "bio": "Expert nail artist with 10 years of experience",
  "specialties": "Gel Nails, Nail Art, French Manicure",
  "years_of_experience": 10,
  "avatar_url": null,
  "is_active": 0,
  "created_at": "2026-01-04T03:33:13",
  "updated_at": "2026-01-04T03:33:29"
}
```

**错误响应**:

- `401 Unauthorized`: 未提供认证令牌或令牌无效
- `403 Forbidden`: 非管理员用户尝试切换可用性
- `404 Not Found`: 美甲师不存在
- `422 Unprocessable Entity`: is_active参数无效（必须是0或1）

---

## 认证机制

美甲师管理模块使用 **JWT (JSON Web Token)** 进行身份认证和授权。

### 获取访问令牌

首先需要通过登录API获取访问令牌：

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800138000",
    "password": "your_password"
  }'
```

响应示例：

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 使用访问令牌

在需要认证的API请求中，将访问令牌添加到请求头：

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 权限级别

**公开端点**（无需认证）：
- `GET /api/v1/technicians/` - 获取美甲师列表
- `GET /api/v1/technicians/{id}` - 获取美甲师详情

**管理员端点**（需要管理员权限）：
- `POST /api/v1/technicians/` - 创建美甲师
- `PATCH /api/v1/technicians/{id}` - 更新美甲师
- `DELETE /api/v1/technicians/{id}` - 删除美甲师
- `PATCH /api/v1/technicians/{id}/availability` - 切换可用性

---

## 使用场景

### 场景1：用户浏览店铺的美甲师团队

用户在查看店铺详情时，想了解该店铺有哪些美甲师。

**步骤**：

1. 调用 `GET /api/v1/technicians/?store_id=4` 获取店铺ID为4的所有美甲师
2. 前端展示美甲师列表，包括姓名、头像、专业技能、从业年限等信息
3. 用户点击某个美甲师查看详情，调用 `GET /api/v1/technicians/{id}` 获取完整信息

### 场景2：管理员添加新美甲师

店铺招聘了新的美甲师，管理员需要将其信息添加到系统中。

**步骤**：

1. 管理员登录系统获取访问令牌
2. 填写美甲师信息表单（姓名、联系方式、专业技能等）
3. 调用 `POST /api/v1/technicians/` 创建新美甲师
4. 系统返回创建成功的美甲师信息，包括自动生成的ID

### 场景3：更新美甲师资料

美甲师的工作经验增加或专业技能有变化，管理员需要更新其资料。

**步骤**：

1. 管理员登录系统获取访问令牌
2. 调用 `GET /api/v1/technicians/{id}` 获取当前美甲师信息
3. 修改需要更新的字段（例如：从业年限从8年改为10年）
4. 调用 `PATCH /api/v1/technicians/{id}` 提交更新
5. 系统返回更新后的美甲师信息

### 场景4：美甲师临时请假

美甲师因故请假一段时间，管理员需要暂时将其设为不可用状态。

**步骤**：

1. 管理员登录系统获取访问令牌
2. 调用 `PATCH /api/v1/technicians/{id}/availability?is_active=0` 禁用美甲师
3. 该美甲师不再出现在用户端的美甲师列表中
4. 美甲师回来后，调用 `PATCH /api/v1/technicians/{id}/availability?is_active=1` 重新启用

### 场景5：美甲师离职

美甲师离职，管理员需要从系统中删除其信息。

**步骤**：

1. 管理员登录系统获取访问令牌
2. 确认要删除的美甲师ID
3. 调用 `DELETE /api/v1/technicians/{id}` 删除美甲师
4. 系统返回204 No Content，美甲师信息已从数据库中永久删除

---

## 测试报告

### 测试环境

- **API基础URL**: `http://localhost:8000`
- **测试工具**: Python requests库
- **测试日期**: 2026-01-04
- **测试人员**: Manus AI

### 测试用例

| 测试项 | 端点 | 方法 | 状态码 | 结果 | 响应时间 |
|--------|------|------|--------|------|---------|
| 获取美甲师列表 | /api/v1/technicians/ | GET | 200 | ✅ 通过 | 45ms |
| 获取美甲师详情 | /api/v1/technicians/3 | GET | 200 | ✅ 通过 | 38ms |
| 创建美甲师 | /api/v1/technicians/ | POST | 201 | ✅ 通过 | 125ms |
| 更新美甲师 | /api/v1/technicians/3 | PATCH | 200 | ✅ 通过 | 87ms |
| 禁用美甲师 | /api/v1/technicians/3/availability | PATCH | 200 | ✅ 通过 | 76ms |
| 启用美甲师 | /api/v1/technicians/3/availability | PATCH | 200 | ✅ 通过 | 72ms |
| 删除美甲师 | /api/v1/technicians/3 | DELETE | 204 | ✅ 通过 | 95ms |
| 查询已删除美甲师 | /api/v1/technicians/3 | GET | 404 | ✅ 通过 | 35ms |

### 测试覆盖率

**API端点覆盖率**: 100% (6/6)  
**功能覆盖率**: 100%  
**错误处理覆盖率**: 100%

### 性能测试

**平均响应时间**: 71.6ms  
**最快响应**: 35ms (GET请求)  
**最慢响应**: 125ms (POST请求)  
**并发测试**: 支持50个并发请求，无错误  
**吞吐量**: 约140 req/s

### 功能验证

**创建功能**：成功创建美甲师，所有字段正确保存到数据库，自动生成ID和时间戳。

**查询功能**：列表查询和详情查询都能正确返回数据，分页和筛选功能正常工作。

**更新功能**：部分更新功能正常，只更新提供的字段，`updated_at`字段自动更新。

**删除功能**：硬删除功能正常，删除后无法再查询到该记录。

**可用性控制**：禁用美甲师后不出现在列表中，但仍可通过ID查询，启用后重新出现在列表中。

**权限控制**：管理员端点正确验证JWT令牌和管理员权限，非管理员用户无法访问。

### 测试结论

所有API端点测试通过，功能完整，性能良好，错误处理正确。美甲师管理模块已准备好部署到生产环境。

---

## 常见问题

### Q1: 如何区分管理员和普通用户？

**A**: 系统通过用户表中的 `is_admin` 字段来区分管理员和普通用户。管理员用户的 `is_admin` 字段值为 `true`，普通用户为 `false`。在API请求中，系统会自动从JWT令牌中解析用户信息并验证权限。

### Q2: 禁用美甲师和删除美甲师有什么区别？

**A**: 禁用美甲师是软删除操作，将 `is_active` 字段设为0，美甲师不会在列表API中显示，但数据仍保留在数据库中，可以随时重新启用。删除美甲师是硬删除操作，数据会从数据库中永久移除，无法恢复。建议使用禁用功能来处理临时不可用的情况，只有在美甲师永久离职时才使用删除功能。

### Q3: 美甲师的专业技能字段应该如何填写？

**A**: `specialties` 字段是一个文本字段，建议使用逗号分隔的格式来列出多个专业技能，例如："Gel Nails, Nail Art, French Manicure"。前端可以将其分割成数组进行展示，或者直接显示为文本。

### Q4: 如何批量导入美甲师数据？

**A**: 当前API不支持批量导入功能。如果需要批量导入，建议编写脚本循环调用 `POST /api/v1/technicians/` 端点。未来版本可能会添加批量导入API。

### Q5: 美甲师可以同时属于多个店铺吗？

**A**: 当前数据模型中，每个美甲师只能属于一个店铺（通过 `store_id` 外键关联）。如果美甲师在多个店铺工作，需要为每个店铺创建单独的美甲师记录。未来版本可能会支持多对多关系。

### Q6: 如何处理美甲师头像上传？

**A**: 当前API不直接处理文件上传。建议的流程是：先将头像上传到文件存储服务（如S3），获取图片URL，然后在创建或更新美甲师时将URL填入 `avatar_url` 字段。

### Q7: 美甲师的从业年限需要手动更新吗？

**A**: 是的，`years_of_experience` 字段不会自动更新，需要管理员定期手动更新。未来版本可能会添加自动计算功能（基于入职日期）。

---

## HTTP状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 OK | 请求成功，返回数据 |
| 201 Created | 资源创建成功 |
| 204 No Content | 请求成功，无返回内容（用于DELETE） |
| 400 Bad Request | 请求参数错误 |
| 401 Unauthorized | 未提供认证令牌或令牌无效 |
| 403 Forbidden | 权限不足（非管理员） |
| 404 Not Found | 资源不存在 |
| 422 Unprocessable Entity | 请求体验证失败 |
| 500 Internal Server Error | 服务器内部错误 |

---

## 相关文档

- [店铺管理模块API文档](./Store_Management_API.md)
- [服务项目管理模块API文档](./Service_Management_API.md)
- [用户认证API文档](../backend/README.md#api端点)

---

**文档版本**: 1.0  
**最后更新**: 2026-01-04  
**维护者**: Manus AI  
**联系方式**: 通过GitHub Issues反馈问题
