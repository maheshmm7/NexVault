import uuid
from sqlalchemy import Column, String, DateTime, Numeric, Boolean, ForeignKey, Text
from sqlalchemy.sql import func
from app.db.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    source_id = Column(String(36), ForeignKey("payment_sources.id"), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)

    amount = Column(Numeric(precision=12, scale=2), nullable=False)
    type = Column(String, nullable=False)  # 'income', 'expense', 'transfer'
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=func.now())
    is_recurring = Column(Boolean, default=False)
    recurring_interval = Column(String, nullable=True)  # 'weekly', 'monthly', 'yearly', 'custom'
    is_demo = Column(Boolean, default=False, nullable=False)
    is_emi = Column(Boolean, default=False, nullable=False)
    emi_obligation_id = Column(String(36), ForeignKey("emi_obligations.id", ondelete="SET NULL"), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
