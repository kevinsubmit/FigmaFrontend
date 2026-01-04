"""
Upload endpoints
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from typing import List
import os
import uuid
from pathlib import Path
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

# 配置上传目录
UPLOAD_DIR = Path("/home/ubuntu/FigmaFrontend/backend/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 允许的图片格式
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
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
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_ext} not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # 读取文件内容
        content = await file.read()
        
        # 检查文件大小
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed size of 5MB"
            )
        
        # 生成唯一文件名
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = UPLOAD_DIR / unique_filename
        
        # 保存文件
        with open(file_path, "wb") as f:
            f.write(content)
        
        # 返回文件URL（相对路径）
        file_url = f"/uploads/{unique_filename}"
        uploaded_urls.append(file_url)
    
    return uploaded_urls
