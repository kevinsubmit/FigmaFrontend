# 图片压缩功能文档

## 概述

图片压缩功能自动优化用户上传的图片，显著降低存储成本和提升加载速度。所有通过上传API的图片都会自动压缩。

---

## 功能特性

### 自动压缩
- ✅ 所有上传的图片自动压缩
- ✅ 无需用户手动操作
- ✅ 透明处理，用户无感知

### 智能优化
- ✅ 自动调整图片尺寸（最大1920x1920）
- ✅ 智能质量控制（目标500KB）
- ✅ 保持原图比例
- ✅ 格式统一转换为JPEG

### 兼容性处理
- ✅ 自动转换RGBA到RGB
- ✅ 支持PNG透明背景（转白色背景）
- ✅ 支持所有常见图片格式

---

## 压缩参数

### 默认配置

```python
max_width = 1920        # 最大宽度（像素）
max_height = 1920       # 最大高度（像素）
quality = 85            # JPEG质量（1-100）
target_size_kb = 500    # 目标文件大小（KB）
```

### 参数说明

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `max_width` | 1920 | 图片最大宽度，超过会等比例缩小 |
| `max_height` | 1920 | 图片最大高度，超过会等比例缩小 |
| `quality` | 85 | JPEG压缩质量，85为最佳平衡点 |
| `target_size_kb` | 500 | 目标文件大小，超过会降低质量 |

---

## 压缩流程

### 1. 图片读取
```python
img = Image.open(io.BytesIO(file_content))
```

### 2. 格式转换
```python
# RGBA/PNG → RGB (白色背景)
if img.mode in ('RGBA', 'LA', 'P'):
    background = Image.new('RGB', img.size, (255, 255, 255))
    background.paste(img, mask=img.split()[-1])
    img = background
```

### 3. 尺寸调整
```python
# 超过最大尺寸时等比例缩小
if img.size[0] > max_width or img.size[1] > max_height:
    img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
```

### 4. 质量压缩
```python
# 保存为JPEG，质量85
img.save(output, format='JPEG', quality=85, optimize=True)
```

### 5. 大小优化
```python
# 如果文件仍然过大，二分查找最佳质量值
if compressed_size > target_size_kb * 1024:
    # 在50-85之间查找最佳质量
    # 确保文件小于500KB
```

---

## 测试结果

### 测试场景：高分辨率照片

**测试图片：** 3000x2000像素，1.01MB

| 指标 | 原图 | 压缩后 | 改善 |
|------|------|--------|------|
| **文件大小** | 1030 KB | 89.5 KB | **↓ 91.31%** |
| **尺寸** | 3000x2000 | 1920x1280 | 保持比例 |
| **质量** | 95 | 85 | 视觉几乎无损 |
| **加载时间** | ~3秒 | ~0.3秒 | **↑ 10倍** |

### 压缩效果总结

- ✅ **存储空间节省91%**
- ✅ **加载速度提升10倍**
- ✅ **带宽成本降低91%**
- ✅ **视觉质量保持优秀**

---

## API集成

### 上传API自动压缩

**端点：** `POST /api/v1/upload/images`

**流程：**
1. 接收用户上传的原图
2. 自动压缩图片
3. 保存压缩后的图片
4. 返回图片URL

**日志记录：**
```python
logger.info(f"Image compressed: {compression_info}")
# 输出示例：
# {
#   'original_size': 1054476,
#   'compressed_size': 91648,
#   'original_dimensions': '3000x2000',
#   'compressed_dimensions': '1920x1280',
#   'compression_ratio': 91.31,
#   'size_reduction': '940.77 KB'
# }
```

---

## 技术实现

### 核心模块

**文件：** `app/utils/image_compression.py`

**主要函数：**

#### 1. compress_image()
```python
def compress_image(
    file_content: bytes,
    max_width: int = 1920,
    max_height: int = 1920,
    quality: int = 85,
    target_size_kb: int = 500
) -> Tuple[bytes, dict]:
    """
    压缩图片到指定大小和质量
    
    Returns:
        Tuple[bytes, dict]: (压缩后的图片字节, 压缩信息字典)
    """
```

#### 2. get_image_info()
```python
def get_image_info(file_content: bytes) -> dict:
    """
    获取图片基本信息
    
    Returns:
        dict: 图片信息字典
    """
```

### 依赖库

- **Pillow (PIL)**: 图片处理核心库
  - 版本：11.0.0
  - 功能：图片读取、转换、缩放、压缩

---

## 性能优化

### 压缩算法优化

1. **LANCZOS重采样**
   - 高质量图片缩放算法
   - 保持图片清晰度

2. **二分查找质量值**
   - 快速找到最佳压缩质量
   - 确保文件大小符合要求

3. **JPEG优化模式**
   - 启用optimize=True
   - 进一步减小文件大小

### 错误处理

```python
try:
    compressed_content, info = compress_image(content)
except Exception as e:
    logger.error(f"Failed to compress image: {e}")
    # 压缩失败时使用原图
    compressed_content = content
```

---

## 使用示例

### 前端上传（无需修改）

```typescript
// 前端代码无需修改，压缩在后端自动完成
const uploadedUrls = await uploadImages(selectedFiles, token);
```

### 后端处理

```python
# 1. 接收文件
content = await file.read()

# 2. 自动压缩
compressed_content, info = compress_image(content)

# 3. 保存文件
with open(file_path, "wb") as f:
    f.write(compressed_content)

# 4. 返回URL
return ["/uploads/filename.jpg"]
```

---

## 配置建议

### 不同场景的参数配置

#### 1. 高质量场景（专业摄影）
```python
max_width = 2560
max_height = 2560
quality = 90
target_size_kb = 1000
```

#### 2. 标准场景（用户评价）- **当前配置**
```python
max_width = 1920
max_height = 1920
quality = 85
target_size_kb = 500
```

#### 3. 极速场景（缩略图）
```python
max_width = 800
max_height = 800
quality = 75
target_size_kb = 200
```

---

## 监控指标

### 关键指标

1. **平均压缩比**：目标 > 80%
2. **平均文件大小**：目标 < 500KB
3. **压缩失败率**：目标 < 1%
4. **平均处理时间**：目标 < 1秒

### 日志监控

```bash
# 查看压缩日志
tail -f backend.log | grep "Image compressed"

# 统计平均压缩比
grep "compression_ratio" backend.log | awk '{sum+=$NF; count++} END {print sum/count}'
```

---

## 常见问题

### Q1: 压缩会损失图片质量吗？

**A:** 质量85的JPEG压缩是视觉质量和文件大小的最佳平衡点，人眼几乎无法察觉差异。

### Q2: 支持哪些图片格式？

**A:** 支持所有常见格式（JPG, PNG, GIF, WEBP等），压缩后统一转换为JPEG。

### Q3: PNG透明背景会怎么处理？

**A:** 自动转换为白色背景的JPEG，因为JPEG不支持透明度。

### Q4: 压缩失败会怎样？

**A:** 如果压缩失败，系统会自动使用原图，确保上传不会失败。

### Q5: 可以调整压缩参数吗？

**A:** 可以在`app/api/v1/endpoints/upload.py`中修改compress_image()的参数。

---

## 后续优化

### 1. 多尺寸生成
- 生成缩略图（200x200）
- 生成中等尺寸（800x800）
- 生成原始尺寸（1920x1920）

### 2. WebP格式支持
- 更好的压缩比（比JPEG小30%）
- 更好的质量
- 需要浏览器兼容性检查

### 3. 渐进式JPEG
- 支持渐进式加载
- 改善用户体验

### 4. 智能裁剪
- AI识别主体
- 智能裁剪构图

---

## 版本历史

- **v1.0** (2026-01-04): 初始版本
  - 基础压缩功能
  - 自动尺寸调整
  - 格式转换
  - 质量优化

---

## 技术支持

如有问题或建议，请查看：
- 代码：`app/utils/image_compression.py`
- 集成：`app/api/v1/endpoints/upload.py`
- 日志：`backend/backend.log`
