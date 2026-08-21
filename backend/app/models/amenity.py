from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, func
from app.core.database import Base
from sqlalchemy.orm import relationship


class Amenity(Base):
    __tablename__ = "amenities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(500), nullable=True)
    hourly_fee = Column(Float, default=0.0)
    max_daily_hours_per_flat = Column(Integer, default=2)
    capacity = Column(Integer, default=1)
    open_time = Column(String(10), default="06:00")
    close_time = Column(String(10), default="22:00")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    bookings = relationship("Booking", back_populates="amenity", cascade="all, delete-orphan")
