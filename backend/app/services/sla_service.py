from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.complaint import Complaint
from app.models.sla_setting import SLASetting
from app.models.user import User
from app.services import notification_service
import logging

logger = logging.getLogger(__name__)

DEFAULT_SLA_HOURS = {
    "low": 72,
    "normal": 48,
    "urgent": 24,
    "emergency": 4,
}


def get_sla_hours(db: Session, priority: str) -> int:
    setting = db.query(SLASetting).filter(SLASetting.priority == priority).first()
    if setting:
        return setting.resolution_hours
    return DEFAULT_SLA_HOURS.get(priority, 48)


def calculate_due_date(db: Session, priority: str, created_at: datetime = None) -> datetime:
    hours = get_sla_hours(db, priority)
    base = created_at or datetime.now(timezone.utc)
    return base + timedelta(hours=hours)


def check_overdue_complaints(db: Session):
    """Background job: mark overdue complaints and notify residents."""
    now = datetime.now(timezone.utc)
    open_statuses = ["open", "assigned", "in_progress", "reopened"]
    
    complaints = db.query(Complaint).filter(
        Complaint.status.in_(open_statuses),
        Complaint.due_date.isnot(None),
        Complaint.is_overdue == False,
    ).all()

    for complaint in complaints:
        due = complaint.due_date
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        if now > due:
            complaint.is_overdue = True
            db.commit()
            logger.info(f"Marked complaint {complaint.complaint_id} as overdue")
            
            # Notify resident
            user = db.query(User).filter(User.id == complaint.resident_id).first()
            if user:
                notification_service.notify_overdue(db, user, complaint)

    # Also un-overdue resolved complaints
    resolved = db.query(Complaint).filter(
        Complaint.status.in_(["resolved", "closed"]),
        Complaint.is_overdue == True,
    ).all()
    for complaint in resolved:
        complaint.is_overdue = False
    db.commit()
