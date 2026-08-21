from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    type: str
    link: Optional[str]
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NoticeCreate(BaseModel):
    title: str
    content: str
    category: str = "general"
    is_pinned: bool = False
    valid_until: Optional[datetime] = None


class NoticeOut(BaseModel):
    id: int
    title: str
    content: str
    category: str
    is_pinned: bool
    created_by_id: int
    valid_until: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class StaffCreate(BaseModel):
    name: str
    department: str
    phone: Optional[str] = None
    email: Optional[str] = None
    is_available: bool = True


class StaffOut(BaseModel):
    id: int
    name: str
    department: str
    phone: Optional[str]
    email: Optional[str]
    is_available: bool
    current_workload: int
    created_at: datetime

    class Config:
        from_attributes = True


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_available: Optional[bool] = None


class SLASettingOut(BaseModel):
    id: int
    priority: str
    resolution_hours: int
    warning_threshold_pct: int

    class Config:
        from_attributes = True


class SLASettingUpdate(BaseModel):
    resolution_hours: int
    warning_threshold_pct: int = 80


class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[int]
    details: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
