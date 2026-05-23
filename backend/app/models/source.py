import uuid
from sqlalchemy import Column, String, DateTime, Numeric, ForeignKey, Boolean, Integer
from sqlalchemy.sql import func
from app.db.database import Base


class PaymentSource(Base):
    __tablename__ = "payment_sources"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)

    # Core
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # 'bank', 'credit_card', 'debit_card', 'wallet', 'cash'
    balance = Column(Numeric(precision=12, scale=2), default=0.00, nullable=False)
    is_demo = Column(Boolean, default=False, nullable=False)

    # Credit card specific
    credit_limit = Column(Numeric(precision=12, scale=2), nullable=True) # Bank approved limit
    card_ceiling_limit = Column(Numeric(precision=12, scale=2), nullable=True) # Operational limit
    available_limit = Column(Numeric(precision=12, scale=2), nullable=True)
    billing_date = Column(String, nullable=True)   # stored as YYYY-MM-DD string
    due_date = Column(String, nullable=True)        # stored as YYYY-MM-DD string
    statement_day = Column(Integer, default=1, nullable=True)
    due_day = Column(Integer, default=20, nullable=True)
    network = Column(String, nullable=True)         # visa / mastercard / rupay / amex
    credit_pool_id = Column(String(36), ForeignKey("credit_pools.id", ondelete="SET NULL"), nullable=True, index=True)

    # Shared card fields
    account_number_last4 = Column(String(4), nullable=True)
    card_outstanding = Column(Numeric(precision=12, scale=2), default=0.00, nullable=True)
    shared_group_id = Column(String(36), nullable=True, index=True)

    # Bank / debit card
    bank_name = Column(String, nullable=True)
    account_holder_name = Column(String, nullable=True)
    account_subtype = Column(String, nullable=True)  # savings / current / salary
    ifsc_code = Column(String, nullable=True)

    # Wallet
    upi_id = Column(String, nullable=True)
    linked_bank_name = Column(String, nullable=True)

    # Cash
    cash_label = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())