from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from decimal import Decimal

class CreditPoolBase(BaseModel):
    name: str
    pool_type: Optional[str] = "shared" # "shared" | "independent" | "supplementary"
    total_limit: Decimal
    utilized_limit: Optional[Decimal] = Decimal("0.00")
    available_limit: Optional[Decimal] = None
    statement_day: Optional[int] = 1
    due_day: Optional[int] = 20

class CreditPoolCreate(CreditPoolBase):
    pass

class CreditPoolUpdate(BaseModel):
    name: Optional[str] = None
    pool_type: Optional[str] = None
    total_limit: Optional[Decimal] = None
    utilized_limit: Optional[Decimal] = None
    available_limit: Optional[Decimal] = None
    statement_day: Optional[int] = None
    due_day: Optional[int] = None

class CreditPoolResponse(CreditPoolBase):
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
