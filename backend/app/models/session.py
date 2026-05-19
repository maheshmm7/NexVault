import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.db.database import Base

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_token = Column(String(128), unique=True, index=True, nullable=False) # holds the token jti
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(512), nullable=True)
    device_name = Column(String(128), nullable=True)
    os_name = Column(String(128), nullable=True)
    browser_name = Column(String(128), nullable=True)
    last_active_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
