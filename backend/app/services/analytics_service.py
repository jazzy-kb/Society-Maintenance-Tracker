from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.models.complaint import Complaint, Feedback
from app.models.sla_setting import SLASetting
from app.services.sla_service import get_sla_hours
from typing import List, Dict, Any


def get_complaint_stats(db: Session) -> Dict[str, Any]:
    """Overall complaint statistics for admin dashboard."""
    total = db.query(func.count(Complaint.id)).scalar() or 0
    open_c = db.query(func.count(Complaint.id)).filter(Complaint.status == "open").scalar() or 0
    in_progress = db.query(func.count(Complaint.id)).filter(Complaint.status == "in_progress").scalar() or 0
    resolved = db.query(func.count(Complaint.id)).filter(Complaint.status == "resolved").scalar() or 0
    closed = db.query(func.count(Complaint.id)).filter(Complaint.status == "closed").scalar() or 0
    overdue = db.query(func.count(Complaint.id)).filter(Complaint.is_overdue == True).scalar() or 0
    assigned = db.query(func.count(Complaint.id)).filter(Complaint.status == "assigned").scalar() or 0

    return {
        "total": total,
        "open": open_c,
        "assigned": assigned,
        "in_progress": in_progress,
        "resolved": resolved,
        "closed": closed,
        "overdue": overdue,
    }


def get_complaints_by_category(db: Session) -> List[Dict]:
    rows = (
        db.query(Complaint.category, func.count(Complaint.id).label("count"))
        .group_by(Complaint.category)
        .all()
    )
    return [{"category": r.category, "count": r.count} for r in rows]


def get_complaints_by_status(db: Session) -> List[Dict]:
    rows = (
        db.query(Complaint.status, func.count(Complaint.id).label("count"))
        .group_by(Complaint.status)
        .all()
    )
    return [{"status": r.status, "count": r.count} for r in rows]


def get_complaints_by_tower(db: Session) -> List[Dict]:
    rows = (
        db.query(Complaint.tower, func.count(Complaint.id).label("count"))
        .filter(Complaint.tower.isnot(None))
        .group_by(Complaint.tower)
        .all()
    )
    return [{"tower": r.tower, "count": r.count} for r in rows]


def get_complaints_trend(db: Session, days: int = 30) -> List[Dict]:
    """Daily complaint creation count for last N days."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.query(
            func.date(Complaint.created_at).label("date"),
            func.count(Complaint.id).label("count"),
        )
        .filter(Complaint.created_at >= since)
        .group_by(func.date(Complaint.created_at))
        .order_by(func.date(Complaint.created_at))
        .all()
    )
    return [{"date": str(r.date), "count": r.count} for r in rows]


def get_avg_resolution_time(db: Session) -> float:
    """Average resolution time in hours."""
    resolved = db.query(Complaint).filter(
        Complaint.resolved_at.isnot(None),
        Complaint.status.in_(["resolved", "closed"]),
    ).all()
    if not resolved:
        return 0.0
    total_hours = 0.0
    for c in resolved:
        created = c.created_at
        resolved_at = c.resolved_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if resolved_at.tzinfo is None:
            resolved_at = resolved_at.replace(tzinfo=timezone.utc)
        total_hours += (resolved_at - created).total_seconds() / 3600
    return round(total_hours / len(resolved), 1)


def get_sla_compliance(db: Session) -> float:
    """Percentage of complaints resolved within SLA."""
    resolved = db.query(Complaint).filter(
        Complaint.resolved_at.isnot(None),
    ).all()
    if not resolved:
        return 100.0
    on_time = sum(1 for c in resolved if not c.is_overdue)
    return round((on_time / len(resolved)) * 100, 1)


def get_satisfaction_avg(db: Session) -> float:
    result = db.query(func.avg(Feedback.rating)).scalar()
    return round(float(result), 2) if result else 0.0


def get_priority_distribution(db: Session) -> List[Dict]:
    rows = (
        db.query(Complaint.priority, func.count(Complaint.id).label("count"))
        .group_by(Complaint.priority)
        .all()
    )
    return [{"priority": r.priority, "count": r.count} for r in rows]
