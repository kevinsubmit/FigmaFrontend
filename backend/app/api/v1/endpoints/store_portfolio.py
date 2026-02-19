"""
Store Portfolio API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
from datetime import datetime
from pathlib import Path

from app.api.deps import get_db, get_current_store_admin
from app.models.user import User
from app.crud import store as crud_store, store_portfolio as crud_portfolio
from app.schemas.store_portfolio import StorePortfolio, StorePortfolioCreate, StorePortfolioUpdate
from app.core.config import settings
from app.utils.clamav_scanner import scan_bytes_for_malware
from app.utils.image_compression import compress_image
from app.utils.security_validation import sanitize_plain_text, validate_image_bytes

router = APIRouter()

# Upload directory
UPLOAD_DIR = Path(settings.UPLOAD_DIR) / "portfolio"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 8 * 1024 * 1024  # 8MB


@router.get("/{store_id}", response_model=List[StorePortfolio])
def get_store_portfolio(
    store_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get portfolio items for a store (public endpoint)
    
    - **store_id**: Store ID
    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return
    """
    portfolio_items = crud_portfolio.get_store_portfolio(
        db,
        store_id=store_id,
        skip=skip,
        limit=limit
    )
    return portfolio_items


@router.post("/{store_id}/upload", response_model=StorePortfolio)
async def upload_portfolio_image(
    store_id: int,
    file: UploadFile = File(...),
    title: str = None,
    description: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Upload a portfolio image (requires authentication)
    
    - **store_id**: Store ID
    - **file**: Image file to upload
    - **title**: Optional title for the work
    - **description**: Optional description
    """
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    if not current_user.is_admin and current_user.store_id != store_id:
        raise HTTPException(status_code=403, detail="You can only upload portfolio images for your own store")
    
    # Validate file type (JPG/JPEG/PNG only)
    allowed_extensions = {'.jpg', '.jpeg', '.png'}
    allowed_mime_types = {"image/jpeg", "image/jpg", "image/png"}
    mime_to_ext = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
    }
    filename = file.filename or ""
    file_ext = os.path.splitext(filename)[1].lower()
    if not file_ext and file.content_type:
        file_ext = mime_to_ext.get(file.content_type.lower(), "")
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Allowed formats: jpg, jpeg, png"
        )
    if file.content_type and file.content_type.lower() not in allowed_mime_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Allowed formats: jpg, jpeg, png"
        )
    
    try:
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File size exceeds 8MB limit")
        validate_image_bytes(contents, allowed_formats={"JPEG", "PNG"})
        scan_bytes_for_malware(contents)
        compressed_content, _ = compress_image(
            contents,
            max_width=1920,
            max_height=1920,
            quality=85,
            target_size_kb=700,
        )
        title = sanitize_plain_text(title, field_name="title", max_length=120)
        description = sanitize_plain_text(description, field_name="description", max_length=1000)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid image file") from exc

    # Save as JPEG to avoid executable/polygot payload retention.
    unique_filename = f"{uuid.uuid4()}.jpg"
    file_path = UPLOAD_DIR / unique_filename
    try:
        with open(file_path, 'wb') as f:
            f.write(compressed_content)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(exc)}")
    
    # Create portfolio item
    image_url = f"/uploads/portfolio/{unique_filename}"
    portfolio_data = StorePortfolioCreate(
        image_url=image_url,
        title=title,
        description=description
    )
    
    portfolio_item = crud_portfolio.create_portfolio_item(
        db,
        store_id=store_id,
        portfolio_data=portfolio_data
    )
    
    return portfolio_item


@router.patch("/{portfolio_id}", response_model=StorePortfolio)
def update_portfolio_item(
    portfolio_id: int,
    portfolio_data: StorePortfolioUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Update a portfolio item (requires authentication)
    
    - **portfolio_id**: Portfolio item ID
    """
    existing = crud_portfolio.get_portfolio_item(db, portfolio_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    if not current_user.is_admin and current_user.store_id != existing.store_id:
        raise HTTPException(status_code=403, detail="You can only update portfolio images for your own store")
    
    try:
        if portfolio_data.title is not None:
            portfolio_data.title = sanitize_plain_text(portfolio_data.title, field_name="title", max_length=120)
        if portfolio_data.description is not None:
            portfolio_data.description = sanitize_plain_text(
                portfolio_data.description,
                field_name="description",
                max_length=1000,
            )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    portfolio_item = crud_portfolio.update_portfolio_item(
        db,
        portfolio_id=portfolio_id,
        portfolio_data=portfolio_data
    )
    
    if not portfolio_item:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    
    return portfolio_item


@router.delete("/{portfolio_id}", status_code=204)
def delete_portfolio_item(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Delete a portfolio item (requires authentication)
    
    - **portfolio_id**: Portfolio item ID
    """
    # Get portfolio item to delete the file
    portfolio_item = crud_portfolio.get_portfolio_item(db, portfolio_id)
    if not portfolio_item:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    if not current_user.is_admin and current_user.store_id != portfolio_item.store_id:
        raise HTTPException(status_code=403, detail="You can only delete portfolio images for your own store")
    
    # Delete file from filesystem
    if portfolio_item.image_url.startswith('/uploads/'):
        upload_root = Path(settings.UPLOAD_DIR).resolve()
        candidate_path = (upload_root / portfolio_item.image_url.lstrip("/")).resolve()
        if upload_root in candidate_path.parents and candidate_path.exists():
            try:
                candidate_path.unlink()
            except Exception as e:
                # Log error but don't fail the request
                print(f"Failed to delete file {candidate_path}: {e}")
    
    # Delete from database
    success = crud_portfolio.delete_portfolio_item(db, portfolio_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete portfolio item")
    
    return None
