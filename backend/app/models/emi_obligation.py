import uuid
from sqlalchemy import Column, String, DateTime, Numeric, ForeignKey, Integer, Boolean
from sqlalchemy.sql import func
from app.db.database import Base

class EMIObligation(Base):
    __tablename__ = "emi_obligations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    principal_amount = Column(Numeric(precision=12, scale=2), nullable=False)
    principal_remaining = Column(Numeric(precision=12, scale=2), nullable=False)
    monthly_emi = Column(Numeric(precision=12, scale=2), nullable=False)
    tenure_months = Column(Integer, nullable=False)
    interest_rate = Column(Numeric(precision=5, scale=2), default=0.00, nullable=False)
    
    linked_pool_id = Column(String(36), ForeignKey("credit_pools.id", ondelete="SET NULL"), nullable=True, index=True)
    linked_card_id = Column(String(36), ForeignKey("payment_sources.id", ondelete="CASCADE"), nullable=False, index=True)
    
    next_due_date = Column(String, nullable=True) # Stored as YYYY-MM-DD
    emi_status = Column(String, default="active", nullable=False) # 'active', 'completed', 'defaulted'
    paid_installments = Column(Integer, default=0, nullable=False)
    missed_installments = Column(Integer, default=0, nullable=False)
    credit_restoration_type = Column(String, default="monthly_restore", nullable=False) # 'immediate_restore', 'monthly_restore', 'deferred_restore'
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
