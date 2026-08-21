from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ComplaintCreate(BaseModel):
    title: str
    description: str
    category: str
    priority: str = "normal"
    tower: Optional[str] = None
    flat_number: Optional[str] = None
    residents_affected: int = 1


class ComplaintUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_staff_id: Optional[int] = None
    admin_notes: Optional[str] = None


class ComplaintHistoryOut(BaseModel):
    id: int
    field_changed: str
    old_value: Optional[str]
    new_value: Optional[str]
    note: Optional[str]
    changed_by_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class FeedbackCreate(BaseModel):
    rating: int
    comment: Optional[str] = None


class FeedbackOut(BaseModel):
    id: int
    rating: int
    comment: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ComplaintOut(BaseModel):
    id: int
    complaint_id: str
    title: str
    description: str
    category: str
    priority: str
    recommended_priority: Optional[str]
    status: str
    tower: Optional[str]
    flat_number: Optional[str]
    residents_affected: int
    photo_url: Optional[str]
    resident_id: int
    assigned_staff_id: Optional[int]
    admin_notes: Optional[str]
    due_date: Optional[datetime]
    resolved_at: Optional[datetime]
    is_overdue: bool
    is_recurring: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ComplaintDetailOut(ComplaintOut):
    history: List[ComplaintHistoryOut] = []
    feedback: Optional[FeedbackOut] = None
