from sqlalchemy import Column, Integer, String, DateTime, func
from app.core.database import Base


class SLASetting(Base):
    __tablename__ = "sla_settings"

    id = Column(Integer, primary_key=True, index=True)
    priority = Column(String(20), unique=True, nullable=False)  # low | normal | urgent | emergency
    resolution_hours = Column(Integer, nullable=False)  # target resolution time
    warning_threshold_pct = Column(Integer, default=80)  # % of SLA time passed = warning
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
