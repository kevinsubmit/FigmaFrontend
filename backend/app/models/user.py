"""
User database model
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Text, func
from sqlalchemy.orm import relationship
from app.db.session import Base


class User(Base):
    """User model for FastAPI backend"""
    __tablename__ = "backend_users"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    phone = Column(String(20), unique=True, nullable=False, index=True)  # 手机号，唯一必填
    password_hash = Column(String(255), nullable=False)
    username = Column(String(100), unique=True, nullable=False, index=True)
    full_name = Column(String(200), nullable=True)
    email = Column(String(255), nullable=True)  # 邮箱改为可选
    avatar_url = Column(String(500), nullable=True)
    gender = Column(String(20), nullable=True)  # 性别: male, female, other
    date_of_birth = Column(Date, nullable=True)  # 生日，一旦设置不可修改
    customer_tags = Column(Text, nullable=True)  # 客户自定义标签(JSON数组字符串)
    phone_verified = Column(Boolean, default=False, nullable=False)  # 手机号是否已验证
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)  # 超级管理员
    store_id = Column(Integer, nullable=True, index=True)  # 店铺管理员关联的店铺ID
    store_admin_status = Column(String(20), default="approved", nullable=False, index=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True, index=True)
    
    # 推荐系统
    referral_code = Column(String(10), unique=True, nullable=True, index=True)  # 我的推荐码
    referred_by_code = Column(String(10), nullable=True, index=True)  # 被谁推荐(推荐码)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")
    points = relationship("UserPoints", back_populates="user", uselist=False, cascade="all, delete-orphan")
    coupons = relationship("UserCoupon", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, phone={self.phone})>"
