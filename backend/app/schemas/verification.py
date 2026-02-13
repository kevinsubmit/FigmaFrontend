"""
Verification Code Pydantic schemas
"""
from pydantic import BaseModel, Field, field_validator
from app.schemas.phone import normalize_us_phone


class SendVerificationCodeRequest(BaseModel):
    """发送验证码请求"""
    phone: str = Field(..., description="手机号")
    purpose: str = Field(..., description="用途: register, login, reset_password")
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """验证手机号格式"""
        return normalize_us_phone(v, '手机号格式不正确')
    
    @field_validator('purpose')
    @classmethod
    def validate_purpose(cls, v: str) -> str:
        """验证用途"""
        allowed_purposes = ['register', 'login', 'reset_password']
        if v not in allowed_purposes:
            raise ValueError(f'用途必须是以下之一: {", ".join(allowed_purposes)}')
        return v


class SendVerificationCodeResponse(BaseModel):
    """发送验证码响应"""
    message: str
    expires_in: int = Field(..., description="验证码有效期（秒）")


class VerifyCodeRequest(BaseModel):
    """验证验证码请求"""
    phone: str = Field(..., description="手机号")
    code: str = Field(..., min_length=6, max_length=6, description="验证码")
    purpose: str = Field(..., description="用途")
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """验证手机号格式"""
        return normalize_us_phone(v, '手机号格式不正确')


class VerifyCodeResponse(BaseModel):
    """验证验证码响应"""
    valid: bool
    message: str
