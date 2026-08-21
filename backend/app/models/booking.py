from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, func
from app.core.database import Base
from sqlalchemy.orm import relationship


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    amenity_id = Column(Integer, ForeignKey("amenities.id"), nullable=False)
    resident_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    total_fee = Column(Float, default=0.0)
    status = Column(String(30), default="approved")  # approved | flagged_conflict | cancelled
    is_flagged = Column(Boolean, default=False)
    conflict_note = Column(String(300), nullable=True)
    auto_allotted = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    amenity = relationship("Amenity", back_populates="bookings")
    resident = relationship("User")
