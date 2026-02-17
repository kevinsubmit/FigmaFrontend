"""
Application configuration settings
"""
from pydantic_settings import BaseSettings
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "NailsDash API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # CORS
    CORS_ORIGINS: str = (
        "http://localhost:3000,"
        "http://localhost:3100,"
        "http://localhost:5173,"
        "http://127.0.0.1:3100,"
        "http://127.0.0.1:5173,"
        "https://github.com"
    )
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    # AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = ""
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Email
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    ALLOWED_IMAGE_EXTENSIONS: str = "jpg,jpeg,png,gif,webp"
    UPLOAD_DIR: str = "./uploads"

    # Upload security (optional ClamAV)
    SECURITY_ENABLE_CLAMAV: bool = False
    CLAMAV_HOST: str = "127.0.0.1"
    CLAMAV_PORT: int = 3310
    CLAMAV_TIMEOUT_SECONDS: int = 5
    SECURITY_SCAN_FAIL_CLOSED: bool = True
    
    @property
    def allowed_extensions_list(self) -> List[str]:
        """Parse allowed extensions from comma-separated string"""
        return [ext.strip() for ext in self.ALLOWED_IMAGE_EXTENSIONS.split(",")]
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # Financial-equivalent asset controls (coupon/gift-card grants)
    ADMIN_COUPON_BATCH_MAX_RECIPIENTS: int = 200
    ADMIN_COUPON_GRANT_MAX_FACE_VALUE: float = 200.0
    ADMIN_COUPON_GRANT_DAILY_TOTAL_FACE_VALUE: float = 5000.0
    ADMIN_GIFTCARD_ISSUE_MAX_AMOUNT: float = 500.0
    ADMIN_GIFTCARD_ISSUE_DAILY_TOTAL_AMOUNT: float = 5000.0
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()
