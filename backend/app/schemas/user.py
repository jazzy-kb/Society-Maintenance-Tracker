from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    flat_number: Optional[str] = None
    tower: Optional[str] = None
    phone: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    flat_number: Optional[str] = None
    tower: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    flat_number: Optional[str] = None
    tower: Optional[str] = None
    phone: Optional[str] = None


class ProfileUpdateRequestOut(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    old_name: Optional[str] = None
    new_name: Optional[str] = None
    old_flat_number: Optional[str] = None
    new_flat_number: Optional[str] = None
    old_tower: Optional[str] = None
    new_tower: Optional[str] = None
    old_phone: Optional[str] = None
    new_phone: Optional[str] = None
    status: str
    admin_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProfileUpdateSubmit(BaseModel):
    name: Optional[str] = None
    flat_number: Optional[str] = None
    tower: Optional[str] = None
    phone: Optional[str] = None


class ProfileAdminAction(BaseModel):
    admin_note: Optional[str] = None
