from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, func
from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info")  # info | success | warning | error
    link = Column(String(500), nullable=True)  # frontend route to navigate to
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
