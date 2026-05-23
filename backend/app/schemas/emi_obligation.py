from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from decimal import Decimal

class EMIObligationBase(BaseModel):
    name: str
    principal_amount: Decimal
    principal_remaining: Decimal
    monthly_emi: Decimal
    tenure_months: int
    interest_rate: Optional[Decimal] = Decimal("0.00")
    linked_pool_id: Optional[str] = None
    linked_card_id: str
    next_due_date: Optional[str] = None
    emi_status: Optional[str] = "active"
    paid_installments: Optional[int] = 0
    missed_installments: Optional[int] = 0
    credit_restoration_type: Optional[str] = "monthly_restore"

class EMIObligationCreate(EMIObligationBase):
    pass

class EMIObligationUpdate(BaseModel):
    name: Optional[str] = None
    principal_amount: Optional[Decimal] = None
    principal_remaining: Optional[Decimal] = None
    monthly_emi: Optional[Decimal] = None
    tenure_months: Optional[int] = None
    interest_rate: Optional[Decimal] = None
    linked_pool_id: Optional[str] = None
    linked_card_id: Optional[str] = None
    next_due_date: Optional[str] = None
    emi_status: Optional[str] = None
    paid_installments: Optional[int] = None
    missed_installments: Optional[int] = None
    credit_restoration_type: Optional[str] = None

class EMIObligationResponse(EMIObligationBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def validate_dates(cls, v):
        from app.schemas.utils import ensure_utc
        return ensure_utc(v)

    class Config:
        from_attributes = True
