"""
Database session management
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from app.core.config import settings


# Convert mysql:// to mysql+pymysql:// if needed
database_url = settings.DATABASE_URL
if database_url.startswith("mysql://"):
    database_url = database_url.replace("mysql://", "mysql+pymysql://", 1)

# Remove SSL parameter from URL if present (TiDB Cloud specific)
if "?ssl=" in database_url:
    database_url = database_url.split("?ssl=")[0]

# Create database engine with SSL support for TiDB
connect_args = {}
if "tidbcloud.com" in database_url:
    connect_args["ssl"] = {"ssl_mode": "VERIFY_IDENTITY"}
if database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine_kwargs = {
    "echo": settings.DEBUG,
    "connect_args": connect_args,
}

if not database_url.startswith("sqlite"):
    engine_kwargs.update(
        {
            "pool_pre_ping": bool(settings.DB_POOL_PRE_PING),
            "pool_size": max(1, int(settings.DB_POOL_SIZE)),
            "max_overflow": max(0, int(settings.DB_MAX_OVERFLOW)),
            "pool_timeout": max(1, int(settings.DB_POOL_TIMEOUT_SECONDS)),
            "pool_recycle": max(0, int(settings.DB_POOL_RECYCLE_SECONDS)),
        }
    )

engine = create_engine(database_url, **engine_kwargs)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session
    
    Yields:
        Database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
