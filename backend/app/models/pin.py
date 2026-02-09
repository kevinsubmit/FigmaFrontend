from sqlalchemy import Boolean, Column, Integer, String, Text, DateTime, Table, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.session import Base


pin_tags = Table(
    "pin_tags",
    Base.metadata,
    Column("pin_id", Integer, ForeignKey("pins.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Pin(Base):
    __tablename__ = "pins"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    image_url = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="published", index=True)
    sort_order = Column(Integer, nullable=False, default=0, index=True)
    is_deleted = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    tags = relationship("Tag", secondary=pin_tags, back_populates="pins")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    show_on_home = Column(Boolean, nullable=False, default=True, index=True)
    sort_order = Column(Integer, nullable=False, default=0, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    pins = relationship("Pin", secondary=pin_tags, back_populates="tags")
