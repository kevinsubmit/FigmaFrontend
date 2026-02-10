"""
Authentication API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.schemas.verification import SendVerificationCodeRequest, VerifyCodeRequest, SendVerificationCodeResponse
from app.crud import user as crud_user
from app.crud import verification_code as crud_verification
from app.core.security import create_access_token, create_refresh_token, verify_password
from app.core.config import settings
from app.api.deps import get_current_user
from app.models.user import User
import os
from datetime import datetime
from app.utils.clamav_scanner import scan_bytes_for_malware
from app.utils.security_validation import validate_image_bytes


router = APIRouter()


@router.post("/send-verification-code", response_model=SendVerificationCodeResponse)
async def send_verification_code(
    request: SendVerificationCodeRequest,
    db: Session = Depends(get_db)
):
    """
    Send verification code to phone number
    
    Args:
        request: Phone number and code type
        db: Database session
        
    Returns:
        Success message
        
    Note:
        In production, this should integrate with SMS service (Twilio, etc.)
        For now, the code is stored in database and can be retrieved for testing
    """
    # Create verification code
    verification = crud_verification.create_verification_code(
        db,
        phone=request.phone,
        code_type=request.purpose
    )
    
    # TODO: In production, send SMS via Twilio or other SMS service
    # For now, just return success (code can be checked in database)
    
    # 检查是否为开发环境
    is_development = (
        settings.ENVIRONMENT.lower() in ['development', 'dev', 'local'] or
        os.getenv('ENVIRONMENT', '').lower() in ['development', 'dev', 'local']
    )
    
    if is_development:
        message = f"Verification code sent to {request.phone}. Use code: 123456 (development mode)"
    else:
        message = f"Verification code sent to {request.phone}. Please check your SMS."
    
    return {
        "message": message,
        "expires_in": 600  # 10 minutes in seconds
    }


@router.post("/verify-code")
async def verify_code(
    request: VerifyCodeRequest,
    db: Session = Depends(get_db)
):
    """
    Verify verification code
    
    Args:
        request: Phone, code, and code type
        db: Database session
        
    Returns:
        Verification result
    """
    is_valid = crud_verification.verify_code(
        db,
        phone=request.phone,
        code=request.code,
        code_type=request.purpose
    )
    
    if is_valid:
        return {"valid": True, "message": "Verification code is valid"}
    else:
        return {"valid": False, "message": "Invalid or expired verification code"}


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new user with phone verification
    
    Args:
        user_in: User registration data (phone, verification_code, username, password)
        db: Database session
        
    Returns:
        Created user data
        
    Raises:
        HTTPException: If phone/username already exists or verification code is invalid
    """
    # Verify the verification code first
    is_valid = crud_verification.verify_code(
        db,
        phone=user_in.phone,
        code=user_in.verification_code,
        code_type="register"
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )
    
    # Check if phone already exists
    existing_user = crud_user.get_by_phone(db, phone=user_in.phone)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )
    
    # Check if username already exists
    existing_username = crud_user.get_by_username(db, username=user_in.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Check if email already exists (if provided)
    if user_in.email:
        existing_email = crud_user.get_by_email(db, email=user_in.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Mark verification code as used
    crud_verification.mark_as_used(db, phone=user_in.phone, code=user_in.verification_code)
    
    # 处理推荐码
    referrer = None
    if user_in.referral_code:
        from app.crud import referral as crud_referral
        referrer = crud_referral.find_referrer_by_code(db, user_in.referral_code)
        if not referrer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid referral code"
            )
    
    # Create new user with phone_verified=True
    user = crud_user.create(db, obj_in=user_in)
    
    # 如果有推荐码，创建推荐关系并发放奖励
    if referrer:
        from app.crud import referral as crud_referral
        from app.crud import coupons as crud_coupons
        
        # 更新用户的referred_by_code
        user.referred_by_code = user_in.referral_code
        db.commit()
        
        # 创建推荐关系
        referral = crud_referral.create_referral(
            db,
            referrer_id=referrer.id,
            referee_id=user.id,
            referral_code=user_in.referral_code
        )
        
        # 发放奖励: 双方各得$10优惠券
        # 查找$10推荐奖励优惠券模板
        from app.models.coupon import Coupon, CouponType, CouponCategory
        referral_coupon_template = db.query(Coupon).filter(
            Coupon.type == CouponType.FIXED_AMOUNT,
            Coupon.discount_value == 10.0,
            Coupon.category == CouponCategory.REFERRAL,
            Coupon.is_active == True
        ).first()
        
        if referral_coupon_template:
            # 发放给推荐人
            referrer_coupon = crud_coupons.claim_coupon(db, referrer.id, referral_coupon_template.id)
            
            # 发放给被推荐人
            referee_coupon = crud_coupons.claim_coupon(db, user.id, referral_coupon_template.id)
            
            # 更新推荐关系为已奖励
            crud_referral.mark_referral_rewarded(
                db,
                referral.id,
                referrer_coupon_id=referrer_coupon.id if referrer_coupon else None,
                referee_coupon_id=referee_coupon.id if referee_coupon else None
            )
    
    return user


@router.post("/login", response_model=Token)
async def login(
    user_credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """
    User login with phone number
    
    Args:
        user_credentials: User login credentials (phone, password)
        db: Database session
        
    Returns:
        JWT access and refresh tokens
        
    Raises:
        HTTPException: If credentials are invalid
    """
    # Get user by phone
    user = crud_user.get_by_phone(db, phone=user_credentials.phone)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password"
        )
    
    # Verify password
    if not verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    is_admin_portal_user = bool(user.is_admin or user.store_id is not None)
    if user_credentials.login_portal == "frontend" and is_admin_portal_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or store manager account must sign in from admin portal",
        )
    if user_credentials.login_portal == "admin" and not is_admin_portal_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is not allowed to sign in to admin portal",
        )

    user.last_login_at = datetime.utcnow()
    db.commit()
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id), "phone": user.phone})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user information
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Current user data
    """
    return current_user


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """
    Refresh access token
    
    Args:
        refresh_token: Refresh token
        db: Database session
        
    Returns:
        New access and refresh tokens
        
    Raises:
        HTTPException: If refresh token is invalid
    """
    from app.core.security import decode_token, verify_token_type
    
    # Decode and verify refresh token
    payload = decode_token(refresh_token)
    if not verify_token_type(payload, "refresh"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    user_id = int(payload.get("sub"))
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Create new tokens
    access_token = create_access_token(data={"sub": str(user.id), "phone": user.phone})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user information
    
    Args:
        user_update: User update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated user data
        
    Note:
        - date_of_birth cannot be changed once set
        - Only updates provided fields
    """
    # Check if trying to update date_of_birth when it's already set
    if 'date_of_birth' in user_update and current_user.date_of_birth is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Date of birth cannot be changed once set"
        )
    
    # Update user
    updated_user = crud_user.update_user(db, current_user.id, user_update)
    return updated_user


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload user avatar
    
    Args:
        file: Avatar image file
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Avatar URL
        
    Raises:
        HTTPException: If file type is invalid or file is too large
    """
    import os
    from pathlib import Path
    
    # Validate content type header first (quick reject), then verify bytes via PIL.
    allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Validate file size (max 5MB)
    file_content = await file.read()
    if len(file_content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 5MB limit"
        )
    
    try:
        validate_image_bytes(file_content, allowed_formats={"JPEG", "PNG", "GIF", "WEBP"})
        scan_bytes_for_malware(file_content)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        ) from exc
    
    # Generate unique filename
    import uuid
    filename = f"avatar_{current_user.id}_{uuid.uuid4().hex}.jpg"
    
    # Save file
    from app.core.config import settings
    upload_dir = Path(settings.UPLOAD_DIR) / "avatars"
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / filename
    
    # Compress image if needed
    from app.utils.image_compression import compress_image
    try:
        compressed_content, _ = compress_image(file_content, max_width=500, target_size_kb=200)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file or compression failed"
        ) from exc
    
    with open(file_path, "wb") as f:
        f.write(compressed_content)
    
    # Update user avatar URL
    avatar_url = f"/uploads/avatars/{filename}"
    crud_user.update_user(db, current_user.id, {"avatar_url": avatar_url})
    
    return {"avatar_url": avatar_url}
