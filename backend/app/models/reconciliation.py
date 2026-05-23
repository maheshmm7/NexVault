import uuid
from sqlalchemy import Column, String, DateTime, Numeric, ForeignKey, Text
from sqlalchemy.sql import func
from app.db.database import Base

class ReconciliationLog(Base):
    __tablename__ = "reconciliation_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String(36), ForeignKey("payment_sources.id", ondelete="SET NULL"), nullable=True, index=True)
    pool_id = Column(String(36), ForeignKey("credit_pools.id", ondelete="SET NULL"), nullable=True, index=True)

    previous_value = Column(Numeric(precision=12, scale=2), nullable=False)
    new_value = Column(Numeric(precision=12, scale=2), nullable=False)
    reason = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
