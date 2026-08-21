from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from app.core.database import Base
from sqlalchemy.orm import relationship


class ProfileUpdateRequest(Base):
    __tablename__ = "profile_update_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    old_name = Column(String(100), nullable=True)
    new_name = Column(String(100), nullable=True)
    old_flat_number = Column(String(20), nullable=True)
    new_flat_number = Column(String(20), nullable=True)
    old_tower = Column(String(20), nullable=True)
    new_tower = Column(String(20), nullable=True)
    old_phone = Column(String(20), nullable=True)
    new_phone = Column(String(20), nullable=True)
    # status: pending_admin | awaiting_resident_confirmation | applied | rejected | cancelled
    status = Column(String(35), default="pending_admin")
    admin_note = Column(String(300), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User")
