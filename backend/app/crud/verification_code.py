"""
CRUD operations for VerificationCode model
"""
from typing import Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.verification_code import VerificationCode
from app.core.config import settings
import random
import string
import os


def generate_code() -> str:
    """
    生成6位数字验证码
    
    开发环境：返回固定验证码 '123456'
    生产环境：返回随机验证码
    """
    # 检查环境变量，判断是否为开发环境
    is_development = (
        settings.ENVIRONMENT.lower() in ['development', 'dev', 'local'] or
        os.getenv('ENVIRONMENT', '').lower() in ['development', 'dev', 'local']
    )
    
    if is_development:
        # 开发模式：使用固定验证码便于测试
        return '123456'
    else:
        # 生产模式：使用随机验证码
        return ''.join(random.choices(string.digits, k=6))


def create(
    db: Session,
    phone: str,
    purpose: str,
    expires_in_minutes: int = 10
) -> VerificationCode:
    """
    Create new verification code
    
    Args:
        db: Database session
        phone: Phone number
        purpose: Purpose of the code (register, login, reset_password)
        expires_in_minutes: Code expiration time in minutes
        
    Returns:
        Created verification code object
    """
    code = generate_code()
    expires_at = datetime.utcnow() + timedelta(minutes=expires_in_minutes)
    
    db_obj = VerificationCode(
        phone=phone,
        code=code,
        purpose=purpose,
        expires_at=expires_at
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_valid_code(
    db: Session,
    phone: str,
    code: str,
    purpose: str
) -> Optional[VerificationCode]:
    """
    Get valid verification code
    
    Args:
        db: Database session
        phone: Phone number
        code: Verification code
        purpose: Purpose of the code
        
    Returns:
        Verification code object if valid, None otherwise
    """
    now = datetime.utcnow()
    return db.query(VerificationCode).filter(
        VerificationCode.phone == phone,
        VerificationCode.code == code,
        VerificationCode.purpose == purpose,
        VerificationCode.is_used == False,
        VerificationCode.expires_at > now
    ).first()


def mark_as_used(db: Session, verification_code: VerificationCode) -> VerificationCode:
    """
    Mark verification code as used
    
    Args:
        db: Database session
        verification_code: Verification code object
        
    Returns:
        Updated verification code object
    """
    verification_code.is_used = True
    db.add(verification_code)
    db.commit()
    db.refresh(verification_code)
    return verification_code


def delete_expired(db: Session) -> int:
    """
    Delete expired verification codes
    
    Args:
        db: Database session
        
    Returns:
        Number of deleted codes
    """
    now = datetime.utcnow()
    deleted = db.query(VerificationCode).filter(
        VerificationCode.expires_at < now
    ).delete()
    db.commit()
    return deleted
