from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.models.complaint import Complaint
from typing import List, Dict


def detect_recurring_issues(db: Session, days: int = 30, threshold: int = 3) -> List[Dict]:
    """Find category+tower combos with 3+ complaints in the last N days."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    rows = (
        db.query(
            Complaint.category,
            Complaint.tower,
            func.count(Complaint.id).label("count"),
        )
        .filter(Complaint.created_at >= since)
        .group_by(Complaint.category, Complaint.tower)
        .having(func.count(Complaint.id) >= threshold)
        .order_by(func.count(Complaint.id).desc())
        .all()
    )

    result = []
    for r in rows:
        latest = (
            db.query(Complaint)
            .filter(Complaint.category == r.category, Complaint.tower == r.tower)
            .order_by(Complaint.created_at.desc())
            .first()
        )
        result.append({
            "category": r.category,
            "tower": r.tower or "Multiple",
            "count": r.count,
            "last_reported": latest.created_at.isoformat() if latest else None,
            "is_recurring": True,
        })

    # Flag recurring complaints in DB
    for item in result:
        q = db.query(Complaint).filter(
            Complaint.category == item["category"],
            Complaint.created_at >= since,
        )
        if item["tower"] != "Multiple":
            q = q.filter(Complaint.tower == item["tower"])
        else:
            q = q.filter(Complaint.tower.is_(None))
        q.update({"is_recurring": True}, synchronize_session=False)
    db.commit()

    return result
