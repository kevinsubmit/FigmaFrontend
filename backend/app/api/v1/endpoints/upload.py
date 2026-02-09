"""
Upload endpoints
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from typing import List
import uuid
from pathlib import Path
import logging
from app.api.deps import get_current_user
from app.models.user import User
from app.utils.image_compression import compress_image
from app.core.config import settings
from app.utils.clamav_scanner import scan_bytes_for_malware
from app.utils.security_validation import validate_image_bytes

logger = logging.getLogger(__name__)

router = APIRouter()

# 配置上传目录
UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 允许的图片格式（仅 JPG/JPEG/PNG）
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/images", response_model=List[str])
async def upload_images(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    上传图片
    
    权限：需要认证
    """
    if len(files) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 5 images allowed"
        )
    
    uploaded_urls = []
    
    for file in files:
        # 检查文件扩展名
        filename = file.filename or ""
        file_ext = Path(filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File type not allowed. Allowed formats: jpg, jpeg, png"
            )
        if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File type not allowed. Allowed formats: jpg, jpeg, png"
            )
        
        # 读取文件内容
        content = await file.read()
        
        # 检查文件大小
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed size of 5MB"
            )
        
        # Validate by actual image decode instead of trusting extension/MIME.
        try:
            validate_image_bytes(content, allowed_formats={"JPEG", "PNG"})
            scan_bytes_for_malware(content)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

        # 压缩图片
        try:
            compressed_content, compression_info = compress_image(
                content,
                max_width=1920,
                max_height=1920,
                quality=85,
                target_size_kb=500
            )
            
            # 记录压缩信息
            logger.info(f"Image compressed: {compression_info}")
            
        except Exception as e:
            logger.error(f"Failed to compress image: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image file or compression failed"
            )
        
        # 生成唯一文件名（使用.jpg扩展名，因为压缩后都是JPEG）
        unique_filename = f"{uuid.uuid4()}.jpg"
        file_path = UPLOAD_DIR / unique_filename
        
        # 保存压缩后的文件
        with open(file_path, "wb") as f:
            f.write(compressed_content)
        
        # 返回文件URL（相对路径）
        file_url = f"/uploads/{unique_filename}"
        uploaded_urls.append(file_url)
    
    return uploaded_urls
