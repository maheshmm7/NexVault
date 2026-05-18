from pydantic import BaseModel, EmailStr
from typing import Optional, Any, Dict
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserSettings(BaseModel):
    """Flexible settings blob — any key accepted, validated on frontend."""
    currency: Optional[str] = 'INR'
    theme: Optional[str] = 'dark'
    notifications: Optional[Dict[str, Any]] = None
    couponPreferences: Optional[Dict[str, Any]] = None
    dateTimePreferences: Optional[Dict[str, Any]] = None

    class Config:
        extra = 'allow'  # forward-compat: accept unknown keys silently


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class DeleteAccountRequest(BaseModel):
    password: str


class UserSignupResponse(UserResponse):
    recovery_code: str


class RecoverAccountRequest(BaseModel):
    email: EmailStr
    recovery_code: str
    new_password: str


class RegenerateRecoveryCodeRequest(BaseModel):
    password: str
