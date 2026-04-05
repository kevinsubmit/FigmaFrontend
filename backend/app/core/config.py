"""
Application configuration settings
"""
from pydantic_settings import BaseSettings
from typing import List
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
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
    WEB_CONCURRENCY: int = 1
    WEB_TIMEOUT_KEEP_ALIVE_SECONDS: int = 5
    WEB_BACKLOG: int = 2048
    WEB_LIMIT_CONCURRENCY: int = 0
    WEB_PROXY_HEADERS: bool = True
    WEB_FORWARDED_ALLOW_IPS: str = "127.0.0.1"
    WEB_LOG_LEVEL: str = "info"
    EMBEDDED_SCHEDULER_ENABLED: str = ""
    ASYNC_PUSH_QUEUE_SIZE: int = 2000
    REMINDER_PROCESS_BATCH_SIZE: int = 200
    DAILY_CHECKIN_REWARD_POINTS: int = 5
    DAILY_CHECKIN_TIMEZONE: str = "America/New_York"
    
    # Database
    DATABASE_URL: str
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT_SECONDS: int = 30
    DB_POOL_RECYCLE_SECONDS: int = 1800
    DB_POOL_PRE_PING: bool = True
    
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

    # Proxy trust (for client IP extraction)
    TRUST_X_FORWARDED_FOR: bool = False
    TRUSTED_PROXY_IPS: str = "127.0.0.1,::1"

    @property
    def trusted_proxy_ips_list(self) -> List[str]:
        return [ip.strip() for ip in self.TRUSTED_PROXY_IPS.split(",") if ip.strip()]

    @property
    def embedded_scheduler_enabled(self) -> bool:
        normalized = self.EMBEDDED_SCHEDULER_ENABLED.strip().lower()
        if normalized in {"1", "true", "yes", "on"}:
            return True
        if normalized in {"0", "false", "no", "off"}:
            return False
        return self.ENVIRONMENT.lower() in {"development", "dev", "local"}
    
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
    UPLOAD_SERVING_MODE: str = "app"
    UPLOADS_REDIRECT_BASE_URL: str = ""
    UPLOADS_ACCEL_REDIRECT_PREFIX: str = ""
    UPLOADS_CACHE_CONTROL_SECONDS: int = 31536000
    
    @property
    def allowed_extensions_list(self) -> List[str]:
        """Parse allowed extensions from comma-separated string"""
        return [ext.strip() for ext in self.ALLOWED_IMAGE_EXTENSIONS.split(",")]

    @property
    def upload_serving_mode(self) -> str:
        normalized = (self.UPLOAD_SERVING_MODE or "app").strip().lower()
        if normalized in {"app", "redirect", "x_accel_redirect"}:
            return normalized
        return "app"

    @property
    def daily_checkin_reward_points(self) -> int:
        return max(int(self.DAILY_CHECKIN_REWARD_POINTS), 0)

    @property
    def daily_checkin_timezone(self) -> str:
        candidate = (self.DAILY_CHECKIN_TIMEZONE or "America/New_York").strip() or "America/New_York"
        try:
            ZoneInfo(candidate)
            return candidate
        except ZoneInfoNotFoundError:
            return "America/New_York"

    @property
    def web_log_level(self) -> str:
        normalized = (self.WEB_LOG_LEVEL or "info").strip().lower()
        if normalized in {"critical", "error", "warning", "info", "debug", "trace"}:
            return normalized
        return "info"
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # Financial-equivalent asset controls (coupon/gift-card grants)
    ADMIN_COUPON_BATCH_MAX_RECIPIENTS: int = 200
    ADMIN_COUPON_GRANT_MAX_FACE_VALUE: float = 200.0
    ADMIN_COUPON_GRANT_DAILY_TOTAL_FACE_VALUE: float = 5000.0
    ADMIN_GIFTCARD_ISSUE_MAX_AMOUNT: float = 500.0
    ADMIN_GIFTCARD_ISSUE_DAILY_TOTAL_AMOUNT: float = 5000.0
    BOOKING_RATE_LIMIT_PHONE_WHITELIST: str = ""

    @property
    def booking_rate_limit_phone_whitelist_list(self) -> List[str]:
        return [phone.strip() for phone in self.BOOKING_RATE_LIMIT_PHONE_WHITELIST.split(",") if phone.strip()]

    # APNs Push
    APNS_ENABLED: bool = False
    APNS_KEY_ID: str = ""
    APNS_TEAM_ID: str = ""
    APNS_BUNDLE_ID: str = ""
    APNS_PRIVATE_KEY: str = ""  # .p8 content
    APNS_PRIVATE_KEY_PATH: str = ""  # optional .p8 file path
    APNS_USE_SANDBOX: bool = True
    APNS_TIMEOUT_SECONDS: int = 8
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()
