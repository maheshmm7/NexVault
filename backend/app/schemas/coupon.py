from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CouponBase(BaseModel):
    title: str
    code: str
    pin: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    expiry_date: Optional[datetime] = None
    status: str = "active"
    notes: Optional[str] = None


class CouponCreate(CouponBase):
    pass


class CouponUpdate(BaseModel):
    title: Optional[str] = None
    code: Optional[str] = None
    pin: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    expiry_date: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class CouponResponse(CouponBase):
    id: str
    user_id: str
    is_demo: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
