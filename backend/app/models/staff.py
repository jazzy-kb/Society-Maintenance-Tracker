from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from app.core.database import Base


class MaintenanceStaff(Base):
    __tablename__ = "maintenance_staff"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    department = Column(String(50), nullable=False)  # electrical | plumbing | civil | cleaning | lift | general
    phone = Column(String(20), nullable=True)
    email = Column(String(200), nullable=True)
    is_available = Column(Boolean, default=True)
    current_workload = Column(Integer, default=0)  # active complaints assigned
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
