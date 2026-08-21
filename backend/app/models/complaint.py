from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey, func
from app.core.database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(String(20), unique=True, index=True)  # CMP-2024-0001
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)
    priority = Column(String(20), default="normal")  # low | normal | urgent | emergency
    recommended_priority = Column(String(20), nullable=True)
    status = Column(String(30), default="open")  # open | assigned | in_progress | resolved | closed | reopened
    tower = Column(String(20), nullable=True)
    flat_number = Column(String(20), nullable=True)
    residents_affected = Column(Integer, default=1)
    photo_url = Column(String(500), nullable=True)

    resident_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_staff_id = Column(Integer, ForeignKey("maintenance_staff.id"), nullable=True)
    admin_notes = Column(Text, nullable=True)

    due_date = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    is_overdue = Column(Boolean, default=False)
    is_recurring = Column(Boolean, default=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ComplaintHistory(Base):
    __tablename__ = "complaint_history"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    field_changed = Column(String(50))
    old_value = Column(String(200))
    new_value = Column(String(200))
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), unique=True)
    resident_id = Column(Integer, ForeignKey("users.id"))
    rating = Column(Integer)  # 1-5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
