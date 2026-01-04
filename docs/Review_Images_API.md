# 评价图片上传功能 API 文档

## 概述

本文档描述评价图片上传功能的API接口，包括图片上传、评价创建/更新时包含图片等功能。

---

## 数据模型

### Review（评价）

```json
{
  "id": 1,
  "user_id": 30001,
  "store_id": 4,
  "appointment_id": 1,
  "rating": 4.5,
  "comment": "Great service!",
  "images": ["/uploads/abc123.jpg", "/uploads/def456.jpg"],  // 新增字段
  "created_at": "2026-01-04T12:00:00",
  "updated_at": "2026-01-04T12:00:00",
  "user_name": "John Doe",
  "user_avatar": "https://example.com/avatar.jpg",
  "reply": null
}
```

**新增字段说明：**
- `images`: 评价图片URL列表（可选，最多5张）

---

## API端点

### 1. 上传图片

**端点：** `POST /api/v1/upload/images`

**权限：** 需要认证

**描述：** 上传评价图片，返回图片URL列表

**请求头：**
```
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**请求体：**
```
files: File[]  // 图片文件列表（最多5张）
```

**限制：**
- 最多上传5张图片
- 单个文件最大5MB
- 支持格式：jpg, jpeg, png, gif, webp

**响应：**
```json
[
  "/uploads/abc123.jpg",
  "/uploads/def456.jpg"
]
```

**错误响应：**
- `400 Bad Request`: 文件类型不支持或文件过大
- `401 Unauthorized`: 未认证

---

### 2. 创建评价（支持图片）

**端点：** `POST /api/v1/reviews/`

**权限：** 需要认证

**描述：** 创建评价，可以包含图片

**请求头：**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**请求体：**
```json
{
  "appointment_id": 1,
  "rating": 4.5,
  "comment": "Great service!",
  "images": ["/uploads/abc123.jpg", "/uploads/def456.jpg"]  // 可选，图片URL列表
}
```

**响应：**
```json
{
  "id": 1,
  "user_id": 30001,
  "store_id": 4,
  "appointment_id": 1,
  "rating": 4.5,
  "comment": "Great service!",
  "images": ["/uploads/abc123.jpg", "/uploads/def456.jpg"],
  "created_at": "2026-01-04T12:00:00",
  "updated_at": "2026-01-04T12:00:00",
  "user_name": "John Doe",
  "user_avatar": null,
  "reply": null
}
```

---

### 3. 更新评价（支持图片）

**端点：** `PUT /api/v1/reviews/{review_id}`

**权限：** 需要认证，只能更新自己的评价

**描述：** 更新评价，可以修改图片

**请求头：**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**请求体：**
```json
{
  "appointment_id": 1,
  "rating": 5.0,
  "comment": "Updated comment",
  "images": ["/uploads/new1.jpg"]  // 可选，新的图片URL列表
}
```

**响应：** 同创建评价响应

---

### 4. 获取店铺评价列表（包含图片）

**端点：** `GET /api/v1/reviews/stores/{store_id}`

**权限：** 公开访问

**描述：** 获取店铺的所有评价，包含图片信息

**查询参数：**
- `skip`: 跳过的记录数（默认0）
- `limit`: 返回的记录数（默认20）

**响应：**
```json
[
  {
    "id": 1,
    "user_id": 30001,
    "store_id": 4,
    "appointment_id": 1,
    "rating": 4.5,
    "comment": "Great service!",
    "images": ["/uploads/abc123.jpg", "/uploads/def456.jpg"],
    "created_at": "2026-01-04T12:00:00",
    "updated_at": "2026-01-04T12:00:00",
    "user_name": "John Doe",
    "user_avatar": null,
    "reply": null
  }
]
```

---

## 前端集成指南

### 1. 图片上传流程

```typescript
// 1. 用户选择图片
const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  // 验证文件数量、类型、大小
  // ...
};

// 2. 上传图片到服务器
const uploadedUrls = await uploadImages(selectedFiles, token);
// 返回: ["/uploads/abc123.jpg", "/uploads/def456.jpg"]

// 3. 创建评价时包含图片URL
await createReview({
  appointment_id: 1,
  rating: 5,
  comment: "Great!",
  images: uploadedUrls
}, token);
```

### 2. 显示评价图片

```typescript
{review.images && review.images.length > 0 && (
  <div className="grid grid-cols-3 gap-2">
    {review.images.map((imageUrl, index) => (
      <img
        key={index}
        src={`http://localhost:8000${imageUrl}`}
        alt={`Review image ${index + 1}`}
        className="w-full aspect-square object-cover rounded-lg"
      />
    ))}
  </div>
)}
```

---

## 使用流程

### 用户发布带图片的评价

1. 用户完成预约后，进入"我的预约"页面
2. 点击已完成预约的"Review"按钮
3. 在评价表单中：
   - 选择评分（1-5星）
   - 输入评论内容（可选）
   - 点击"Add Photos"上传图片（可选，最多5张）
4. 点击"Submit Review"提交评价

### 用户查看评价图片

1. 进入店铺详情页
2. 切换到"Reviews"标签
3. 查看评价列表，包含：
   - 用户信息
   - 评分和评论
   - 评价图片（点击可放大查看）

---

## 注意事项

1. **文件大小限制**：单个图片最大5MB
2. **数量限制**：每个评价最多5张图片
3. **格式限制**：仅支持 jpg, jpeg, png, gif, webp
4. **存储位置**：图片存储在 `/home/ubuntu/FigmaFrontend/backend/uploads/` 目录
5. **访问方式**：通过 `http://localhost:8000/uploads/{filename}` 访问图片
6. **安全性**：上传图片需要用户认证

---

## 错误处理

### 常见错误

1. **文件过大**
   ```json
   {
     "detail": "File size exceeds maximum allowed size of 5MB"
   }
   ```

2. **文件类型不支持**
   ```json
   {
     "detail": "File type .pdf not allowed. Allowed types: .jpg, .jpeg, .png, .gif, .webp"
   }
   ```

3. **图片数量超限**
   ```json
   {
     "detail": "Maximum 5 images allowed"
   }
   ```

4. **未认证**
   ```json
   {
     "detail": "Not authenticated"
   }
   ```

---

## 数据库变更

### reviews 表新增字段

```sql
ALTER TABLE reviews ADD COLUMN images JSON NULL;
```

**字段说明：**
- 类型：JSON
- 可空：是
- 默认值：NULL
- 存储格式：`["/uploads/file1.jpg", "/uploads/file2.jpg"]`

---

## 测试数据

已创建测试数据：
- Review ID 1: 包含2张图片
- Review ID 3: 包含1张图片

测试图片URL为占位符，实际使用时用户需要上传真实图片。

---

## 后续开发计划

### 管理员回复功能（后期PC端开发）

将在PC端管理后台中实现以下功能：
1. 店铺管理员查看所有评价
2. 管理员回复用户评价
3. 管理员编辑/删除自己的回复

**相关API已开发完成：**
- `POST /api/v1/review-replies/` - 创建回复
- `PUT /api/v1/review-replies/{reply_id}` - 更新回复
- `DELETE /api/v1/review-replies/{reply_id}` - 删除回复
- `GET /api/v1/review-replies/review/{review_id}` - 获取评价的回复

---

## 版本历史

- **v1.1** (2026-01-04): 添加评价图片上传功能
- **v1.0** (2026-01-04): 初始版本，基础评价功能
