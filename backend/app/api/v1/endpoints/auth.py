"""
Authentication API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.schemas.verification import VerificationCodeRequest, VerificationCodeVerify, VerificationCodeResponse
from app.crud import user as crud_user
from app.crud import verification_code as crud_verification
from app.core.security import create_access_token, create_refresh_token, verify_password
from app.api.deps import get_current_user
from app.models.user import User


router = APIRouter()


@router.post("/send-verification-code", response_model=VerificationCodeResponse)
async def send_verification_code(
    request: VerificationCodeRequest,
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
        code_type=request.code_type
    )
    
    # TODO: In production, send SMS via Twilio or other SMS service
    # For now, just return success (code can be checked in database)
    
    return {
        "message": f"Verification code sent to {request.phone}. Check database for code (development mode).",
        "expires_in_minutes": 10
    }


@router.post("/verify-code")
async def verify_code(
    request: VerificationCodeVerify,
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
        code_type=request.code_type
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
    
    # Create new user with phone_verified=True
    user = crud_user.create(db, obj_in=user_in)
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
