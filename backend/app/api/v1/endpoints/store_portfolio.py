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

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.crud import store_portfolio as crud_portfolio
from app.schemas.store_portfolio import StorePortfolio, StorePortfolioCreate, StorePortfolioUpdate
from app.core.config import settings

router = APIRouter()

# Upload directory
UPLOAD_DIR = Path(settings.UPLOAD_DIR) / "portfolio"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


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
    current_user: User = Depends(get_current_user)
):
    """
    Upload a portfolio image (requires authentication)
    
    - **store_id**: Store ID
    - **file**: Image file to upload
    - **title**: Optional title for the work
    - **description**: Optional description
    """
    # TODO: Add authorization check (only store manager/admin can upload)
    # For now, any authenticated user can upload
    
    # Validate file type
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    try:
        contents = await file.read()
        with open(file_path, 'wb') as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
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
    current_user: User = Depends(get_current_user)
):
    """
    Update a portfolio item (requires authentication)
    
    - **portfolio_id**: Portfolio item ID
    """
    # TODO: Add authorization check (only store manager/admin can update)
    
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
    current_user: User = Depends(get_current_user)
):
    """
    Delete a portfolio item (requires authentication)
    
    - **portfolio_id**: Portfolio item ID
    """
    # TODO: Add authorization check (only store manager/admin can delete)
    
    # Get portfolio item to delete the file
    portfolio_item = crud_portfolio.get_portfolio_item(db, portfolio_id)
    if not portfolio_item:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    
    # Delete file from filesystem
    if portfolio_item.image_url.startswith('/uploads/'):
        file_path = Path(settings.UPLOAD_DIR) / portfolio_item.image_url.lstrip("/")
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception as e:
                # Log error but don't fail the request
                print(f"Failed to delete file {file_path}: {e}")
    
    # Delete from database
    success = crud_portfolio.delete_portfolio_item(db, portfolio_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete portfolio item")
    
    return None
