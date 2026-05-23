from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from decimal import Decimal


class TransactionBase(BaseModel):
    source_id: str
    category_id: Optional[str] = None
    amount: Decimal
    type: str  # 'income', 'expense', 'transfer'
    notes: Optional[str] = None
    timestamp: Optional[datetime] = None
    is_recurring: bool = False
    recurring_interval: Optional[str] = None  # 'weekly', 'monthly', 'yearly', 'custom'
    is_emi: Optional[bool] = False
    emi_obligation_id: Optional[str] = None

    @field_validator("category_id", mode="before")
    @classmethod
    def empty_string_to_none(cls, v):
        if v == "":
            return None
        return v

class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    source_id: Optional[str] = None
    category_id: Optional[str] = None
    amount: Optional[Decimal] = None
    type: Optional[str] = None
    notes: Optional[str] = None
    timestamp: Optional[datetime] = None
    is_recurring: Optional[bool] = None
    recurring_interval: Optional[str] = None
    is_emi: Optional[bool] = None
    emi_obligation_id: Optional[str] = None


class TransactionResponse(TransactionBase):
    id: str
    user_id: str
    timestamp: datetime
    is_demo: bool = False
    is_emi: bool = False
    emi_obligation_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_validator("timestamp", "created_at", "updated_at", mode="before")
    @classmethod
    def validate_dates(cls, v):
        from app.schemas.utils import ensure_utc
        return ensure_utc(v)

    class Config:
        from_attributes = True
