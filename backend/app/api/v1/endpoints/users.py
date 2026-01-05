"""
User profile management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.crud import user as crud_user
from app.crud import verification_code as crud_verification
from app.core.security import verify_password, get_password_hash
from app.schemas.user import UserResponse


router = APIRouter()


# Request/Response Schemas
class UpdateProfileRequest(BaseModel):
    """Update profile request schema"""
    full_name: Optional[str] = Field(None, max_length=200)
    avatar_url: Optional[str] = Field(None, max_length=500)
    gender: Optional[str] = Field(None, pattern="^(male|female|other)$")
    birthday: Optional[date] = None


class UpdateProfileResponse(BaseModel):
    """Update profile response schema"""
    message: str
    user: UserResponse


class BindPhoneRequest(BaseModel):
    """Bind phone request schema"""
    phone: str = Field(..., min_length=10, max_length=20)
    verification_code: str = Field(..., min_length=6, max_length=6)


class BindPhoneResponse(BaseModel):
    """Bind phone response schema"""
    message: str


class UpdatePhoneRequest(BaseModel):
    """Update phone request schema"""
    new_phone: str = Field(..., min_length=10, max_length=20)
    verification_code: str = Field(..., min_length=6, max_length=6)
    current_password: str


class UpdatePhoneResponse(BaseModel):
    """Update phone response schema"""
    message: str


class UpdatePasswordRequest(BaseModel):
    """Update password request schema"""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)


class UpdatePasswordResponse(BaseModel):
    """Update password response schema"""
    message: str


class UpdateSettingsRequest(BaseModel):
    """Update settings request schema"""
    notification_enabled: Optional[bool] = None
    language: Optional[str] = Field(None, pattern="^(en|zh)$")


class UpdateSettingsResponse(BaseModel):
    """Update settings response schema"""
    message: str
    settings: dict


@router.put("/profile", response_model=UpdateProfileResponse)
async def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user profile
    
    Args:
        request: Profile update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated user data
        
    Raises:
        HTTPException: If validation fails or birthday is already set
    """
    update_data = {}
    
    # Full name validation
    if request.full_name is not None:
        if not request.full_name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Full name cannot be empty"
            )
        if len(request.full_name.strip()) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Full name must be at least 2 characters"
            )
        update_data['full_name'] = request.full_name.strip()
    
    # Avatar URL
    if request.avatar_url is not None:
        update_data['avatar_url'] = request.avatar_url
    
    # Gender
    if request.gender is not None:
        update_data['gender'] = request.gender
    
    # Birthday - can only be set once
    if request.birthday is not None:
        if current_user.date_of_birth is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Birthday cannot be changed once set"
            )
        update_data['date_of_birth'] = request.birthday
    
    # Update user
    updated_user = crud_user.update_user(db, current_user.id, update_data)
    
    return {
        "message": "Profile updated successfully",
        "user": updated_user
    }


@router.post("/phone", response_model=BindPhoneResponse)
async def bind_phone(
    request: BindPhoneRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Bind phone number to user account
    
    Args:
        request: Phone and verification code
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If phone already bound or verification fails
    """
    # Check if phone already bound
    if current_user.phone_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already bound"
        )
    
    # Verify verification code
    is_valid = crud_verification.verify_code(
        db,
        phone=request.phone,
        code=request.verification_code,
        code_type="register"
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )
    
    # Check if phone already exists
    existing_user = crud_user.get_by_phone(db, phone=request.phone)
    if existing_user and existing_user.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )
    
    # Update phone and mark as verified
    crud_user.update_user(db, current_user.id, {
        'phone': request.phone,
        'phone_verified': True
    })
    
    # Mark verification code as used
    crud_verification.mark_as_used(db, phone=request.phone, code=request.verification_code)
    
    return {"message": "Phone number bound successfully"}


@router.put("/phone", response_model=UpdatePhoneResponse)
async def update_phone(
    request: UpdatePhoneRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update phone number
    
    Args:
        request: New phone, verification code, and current password
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If password incorrect or verification fails
    """
    # Verify current password
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Verify verification code for new phone
    is_valid = crud_verification.verify_code(
        db,
        phone=request.new_phone,
        code=request.verification_code,
        code_type="register"
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )
    
    # Check if new phone already exists
    existing_user = crud_user.get_by_phone(db, phone=request.new_phone)
    if existing_user and existing_user.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )
    
    # Update phone
    crud_user.update_user(db, current_user.id, {
        'phone': request.new_phone,
        'phone_verified': True
    })
    
    # Mark verification code as used
    crud_verification.mark_as_used(db, phone=request.new_phone, code=request.verification_code)
    
    return {"message": "Phone number updated successfully"}


@router.put("/password", response_model=UpdatePasswordResponse)
async def update_password(
    request: UpdatePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update password
    
    Args:
        request: Current and new password
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If current password is incorrect
    """
    # Verify current password
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Validate new password
    if len(request.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters"
        )
    
    # Check if new password is same as current
    if verify_password(request.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )
    
    # Update password
    new_password_hash = get_password_hash(request.new_password)
    crud_user.update_user(db, current_user.id, {
        'password_hash': new_password_hash
    })
    
    return {"message": "Password updated successfully"}


@router.put("/settings", response_model=UpdateSettingsResponse)
async def update_settings(
    request: UpdateSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user settings
    
    Args:
        request: Settings data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated settings
        
    Note:
        Settings are stored in a separate table or as JSON in user table
        For now, we'll return mock data as settings table is not implemented
    """
    # TODO: Implement settings storage in database
    # For now, return mock response
    settings = {
        "notification_enabled": request.notification_enabled if request.notification_enabled is not None else True,
        "language": request.language if request.language else "en"
    }
    
    return {
        "message": "Settings updated successfully",
        "settings": settings
    }
