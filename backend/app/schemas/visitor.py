from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class VisitorPassCreate(BaseModel):
    visitor_name: str
    visitor_phone: str
    visitor_type: str = "guest"  # guest, delivery, cab, daily_help, service
    purpose: Optional[str] = None
    vehicle_number: Optional[str] = None
    valid_hours: int = 24


class PassVerifyRequest(BaseModel):
    pass_code: str


class VisitorPassOut(BaseModel):
    id: int
    pass_code: str
    visitor_name: str
    visitor_phone: str
    visitor_type: str
    purpose: Optional[str] = None
    vehicle_number: Optional[str] = None
    resident_id: int
    flat_number: Optional[str] = None
    tower: Optional[str] = None
    valid_from: datetime
    valid_until: datetime
    status: str
    entry_time: Optional[datetime] = None
    exit_time: Optional[datetime] = None
    created_at: datetime
    
    # Resident detail object for admin/guard view
    resident_name: Optional[str] = None

    class Config:
        from_attributes = True
