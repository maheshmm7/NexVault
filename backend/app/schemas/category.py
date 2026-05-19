from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class CategoryBase(BaseModel):
    name: str
    type: str  # 'income' or 'expense'
    color: Optional[str] = "#4F46E5"
    icon: Optional[str] = "circle"


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class CategoryResponse(CategoryBase):
    id: str
    user_id: str
    is_custom: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def validate_dates(cls, v):
        from app.schemas.utils import ensure_utc
        return ensure_utc(v)

    class Config:
        from_attributes = True
