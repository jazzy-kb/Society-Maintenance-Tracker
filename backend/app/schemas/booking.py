from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# Amenity Schemas
class AmenityBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    hourly_fee: float = Field(0.0, ge=0.0)
    max_daily_hours_per_flat: int = Field(2, ge=1)
    capacity: int = Field(1, ge=1)
    open_time: str = Field("06:00", description="HH:MM open time (e.g. 06:00)")
    close_time: str = Field("22:00", description="HH:MM close time (e.g. 22:00)")
    is_active: bool = True


class AmenityCreate(AmenityBase):
    pass


class AmenityUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    hourly_fee: Optional[float] = Field(None, ge=0.0)
    max_daily_hours_per_flat: Optional[int] = Field(None, ge=1)
    capacity: Optional[int] = Field(None, ge=1)
    open_time: Optional[str] = Field(None)
    close_time: Optional[str] = Field(None)
    is_active: Optional[bool] = None


class AmenityOut(AmenityBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Resident Minimal Info Schema
class ResidentMinOut(BaseModel):
    id: int
    name: str
    email: str
    flat_number: Optional[str] = None
    tower: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        from_attributes = True


# Booking Schemas
class BookingCreate(BaseModel):
    amenity_id: int
    start_time: datetime
    end_time: datetime


class BookingOut(BaseModel):
    id: int
    amenity_id: int
    resident_id: int
    start_time: datetime
    end_time: datetime
    total_fee: float
    status: str
    is_flagged: bool = False
    conflict_note: Optional[str] = None
    auto_allotted: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class BookingOutDetailed(BookingOut):
    amenity: AmenityOut
    resident: ResidentMinOut

    class Config:
        from_attributes = True


class AmenityAnalytics30dOut(BaseModel):
    amenity_id: int
    name: str
    hourly_fee: float
    capacity: int
    is_active: bool
    total_bookings_30d: int
    total_hours_30d: float
    total_revenue_30d: float
    approved_count: int
    cancelled_count: int
    flagged_conflict_count: int
    utilization_rate_pct: float
    daily_trend: List[Dict[str, Any]] = []


class AmenityLogOut(BaseModel):
    id: int
    action: str
    timestamp: datetime
    amenity_name: str
    resident_name: str
    flat_number: Optional[str] = None
    tower: Optional[str] = None
    details: str
    status: str
    is_flagged: bool = False
