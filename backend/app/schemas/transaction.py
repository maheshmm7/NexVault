from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class TransactionBase(BaseModel):
    source_id: str
    category_id: str
    amount: Decimal
    type: str  # 'income', 'expense', 'transfer'
    notes: Optional[str] = None
    timestamp: Optional[datetime] = None
    is_recurring: bool = False
    recurring_interval: Optional[str] = None  # 'weekly', 'monthly', 'yearly', 'custom'


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


class TransactionResponse(TransactionBase):
    id: str
    user_id: str
    timestamp: datetime
    is_demo: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
