import uuid
from sqlalchemy import Column, String, DateTime, Text, Boolean
from sqlalchemy.sql import func
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    display_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    settings_json = Column(Text, nullable=True)   # JSON blob for user preferences
    reset_token_hash = Column(String, nullable=True)
    reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    recovery_code_hash = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_code_hash = Column(String, nullable=True)
    verification_code_expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
