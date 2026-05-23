import uuid
from sqlalchemy import Column, String, DateTime, Numeric, ForeignKey, Integer
from sqlalchemy.sql import func
from app.db.database import Base

class CreditPool(Base):
    __tablename__ = "credit_pools"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    pool_type = Column(String, default="shared", nullable=False) # "shared" | "independent" | "supplementary"
    
    total_limit = Column(Numeric(precision=12, scale=2), nullable=False)
    utilized_limit = Column(Numeric(precision=12, scale=2), default=0.00, nullable=False)
    available_limit = Column(Numeric(precision=12, scale=2), nullable=False)
    
    statement_day = Column(Integer, default=1, nullable=False) # e.g. 1st of month
    due_day = Column(Integer, default=20, nullable=False) # e.g. 20th of month
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
