from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from decimal import Decimal


class PaymentSourceBase(BaseModel):
    name: str
    type: str  # 'bank', 'credit_card', 'debit_card', 'wallet', 'cash'
    balance: Optional[Decimal] = Decimal("0.00")

    # Credit card
    credit_limit: Optional[Decimal] = None
    card_ceiling_limit: Optional[Decimal] = None
    available_limit: Optional[Decimal] = None
    billing_date: Optional[str] = None
    due_date: Optional[str] = None
    statement_day: Optional[int] = None
    due_day: Optional[int] = None
    network: Optional[str] = None
    credit_pool_id: Optional[str] = None

    # Shared card fields
    account_number_last4: Optional[str] = None
    card_outstanding: Optional[Decimal] = None
    shared_group_id: Optional[str] = None

    # Bank / debit
    bank_name: Optional[str] = None
    account_holder_name: Optional[str] = None
    account_subtype: Optional[str] = None
    ifsc_code: Optional[str] = None

    # Wallet
    upi_id: Optional[str] = None
    linked_bank_name: Optional[str] = None

    # Cash
    cash_label: Optional[str] = None


class PaymentSourceCreate(PaymentSourceBase):
    pass


class PaymentSourceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    balance: Optional[Decimal] = None
    credit_limit: Optional[Decimal] = None
    card_ceiling_limit: Optional[Decimal] = None
    available_limit: Optional[Decimal] = None
    billing_date: Optional[str] = None
    due_date: Optional[str] = None
    statement_day: Optional[int] = None
    due_day: Optional[int] = None
    network: Optional[str] = None
    credit_pool_id: Optional[str] = None
    account_number_last4: Optional[str] = None
    card_outstanding: Optional[Decimal] = None
    shared_group_id: Optional[str] = None
    bank_name: Optional[str] = None
    account_holder_name: Optional[str] = None
    account_subtype: Optional[str] = None
    ifsc_code: Optional[str] = None
    upi_id: Optional[str] = None
    linked_bank_name: Optional[str] = None
    cash_label: Optional[str] = None


class PaymentSourceResponse(PaymentSourceBase):
    id: str
    user_id: str
    is_demo: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    actual_spendable: Optional[Decimal] = None

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def validate_dates(cls, v):
        from app.schemas.utils import ensure_utc
        return ensure_utc(v)

    class Config:
        from_attributes = True
