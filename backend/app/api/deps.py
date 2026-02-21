"""
API dependencies
"""
from datetime import datetime
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import decode_token, verify_token_type
from app.crud import user as crud_user
from app.models.risk import UserRiskState
from app.models.user import User


# HTTP Bearer token security
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user
    
    Args:
        credentials: HTTP Bearer token credentials
        db: Database session
        
    Returns:
        Current user
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    
    # Decode token
    payload = decode_token(token)
    
    # Verify token type
    if not verify_token_type(payload, "access"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    # Get user ID from token
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    # Get user from database
    user = crud_user.get(db, id=int(user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # For regular frontend users, enforce temporary restriction globally.
    # This ensures H5 can immediately logout/redirect when account is restricted.
    if not user.is_admin and user.store_id is None:
        risk_state = (
            db.query(UserRiskState)
            .filter(UserRiskState.user_id == user.id)
            .first()
        )
        if risk_state and risk_state.restricted_until and risk_state.restricted_until > datetime.now():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is temporarily restricted from booking. Please try again later.",
            )
    
    return user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current authenticated admin user
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Current admin user
        
    Raises:
        HTTPException: If user is not an admin
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return current_user


async def get_current_store_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current authenticated store admin user
    
    Store admin is either:
    1. Super admin (is_admin=True) - can manage all stores
    2. Store manager (store_id is not None) - can only manage their own store
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Current store admin user
        
    Raises:
        HTTPException: If user is not a store admin
    """
    # Super admin can manage all stores
    if current_user.is_admin:
        return current_user
    
    # Store manager must have store_id
    if current_user.store_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. You must be a store manager or super admin."
        )
    
    return current_user
