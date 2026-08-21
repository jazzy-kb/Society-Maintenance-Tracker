from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class VisitorPass(Base):
    __tablename__ = "visitor_passes"

    id = Column(Integer, primary_key=True, index=True)
    pass_code = Column(String(10), unique=True, index=True, nullable=False)
    visitor_name = Column(String(100), nullable=False)
    visitor_phone = Column(String(20), nullable=False)
    visitor_type = Column(String(30), default="guest")  # guest | delivery | cab | daily_help | service
    purpose = Column(String(200), nullable=True)
    vehicle_number = Column(String(30), nullable=True)
    
    resident_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    flat_number = Column(String(20), nullable=True)
    tower = Column(String(20), nullable=True)

    valid_from = Column(DateTime, nullable=False, server_default=func.now())
    valid_until = Column(DateTime, nullable=False)
    
    status = Column(String(20), default="approved")  # approved | checked_in | checked_out | expired | cancelled
    entry_time = Column(DateTime, nullable=True)
    exit_time = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    resident = relationship("User")
