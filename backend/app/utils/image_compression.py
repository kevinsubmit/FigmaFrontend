"""
Image compression utilities
"""
from PIL import Image
import io
from typing import Tuple


def compress_image(
    file_content: bytes,
    max_width: int = 1920,
    max_height: int = 1920,
    quality: int = 85,
    target_size_kb: int = 500
) -> Tuple[bytes, dict]:
    """
    压缩图片到指定大小和质量
    
    Args:
        file_content: 原始图片字节内容
        max_width: 最大宽度（像素）
        max_height: 最大高度（像素）
        quality: JPEG质量（1-100）
        target_size_kb: 目标文件大小（KB）
        
    Returns:
        Tuple[bytes, dict]: (压缩后的图片字节, 压缩信息字典)
    """
    # 打开图片
    img = Image.open(io.BytesIO(file_content))
    
    # 记录原始信息
    original_size = len(file_content)
    original_width, original_height = img.size
    original_format = img.format or 'JPEG'
    
    # 转换RGBA到RGB（JPEG不支持透明度）
    if img.mode in ('RGBA', 'LA', 'P'):
        # 创建白色背景
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    # 调整尺寸（如果超过最大尺寸）
    if img.size[0] > max_width or img.size[1] > max_height:
        img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
    
    # 第一次压缩
    output = io.BytesIO()
    img.save(output, format='JPEG', quality=quality, optimize=True)
    compressed_size = output.tell()
    
    # 如果文件仍然太大，降低质量
    if compressed_size > target_size_kb * 1024:
        # 二分查找最佳质量值
        min_quality = 50
        max_quality = quality
        
        while min_quality < max_quality - 1:
            test_quality = (min_quality + max_quality) // 2
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=test_quality, optimize=True)
            test_size = output.tell()
            
            if test_size > target_size_kb * 1024:
                max_quality = test_quality
            else:
                min_quality = test_quality
        
        # 使用找到的最佳质量
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=min_quality, optimize=True)
        compressed_size = output.tell()
        quality = min_quality
    
    compressed_content = output.getvalue()
    compressed_width, compressed_height = img.size
    
    # 计算压缩比例
    compression_ratio = (1 - compressed_size / original_size) * 100 if original_size > 0 else 0
    
    # 返回压缩信息
    info = {
        'original_size': original_size,
        'compressed_size': compressed_size,
        'original_dimensions': f'{original_width}x{original_height}',
        'compressed_dimensions': f'{compressed_width}x{compressed_height}',
        'original_format': original_format,
        'compressed_format': 'JPEG',
        'quality': quality,
        'compression_ratio': round(compression_ratio, 2),
        'size_reduction': f'{round((original_size - compressed_size) / 1024, 2)} KB'
    }
    
    return compressed_content, info


def get_image_info(file_content: bytes) -> dict:
    """
    获取图片基本信息
    
    Args:
        file_content: 图片字节内容
        
    Returns:
        dict: 图片信息字典
    """
    img = Image.open(io.BytesIO(file_content))
    
    return {
        'format': img.format,
        'mode': img.mode,
        'size': img.size,
        'width': img.size[0],
        'height': img.size[1],
        'file_size': len(file_content)
    }
