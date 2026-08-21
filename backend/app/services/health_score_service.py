from sqlalchemy.orm import Session
from app.services.analytics_service import (
    get_complaint_stats,
    get_sla_compliance,
    get_satisfaction_avg,
)
from typing import Dict


def calculate_health_score(db: Session) -> Dict:
    """
    Society health score (0-100):
    - Resolution rate: 25 pts
    - SLA compliance: 25 pts  
    - Overdue penalty: 20 pts
    - Recurring issues: 15 pts
    - Avg satisfaction: 15 pts
    """
    stats = get_complaint_stats(db)
    total = stats["total"]

    # Resolution rate (25 pts)
    resolved_total = stats["resolved"] + stats["closed"]
    resolution_rate = (resolved_total / total * 100) if total > 0 else 100
    resolution_score = (resolution_rate / 100) * 25

    # SLA compliance (25 pts)
    sla_pct = get_sla_compliance(db)
    sla_score = (sla_pct / 100) * 25

    # Overdue penalty (20 pts) — fewer overdue = higher score
    overdue_rate = (stats["overdue"] / total * 100) if total > 0 else 0
    overdue_score = max(0, (1 - overdue_rate / 100)) * 20

    # Recurring rate (15 pts) — estimated from is_recurring flag
    from app.models.complaint import Complaint
    from sqlalchemy import func
    recurring = db.query(func.count(Complaint.id)).filter(Complaint.is_recurring == True).scalar() or 0
    recurring_rate = (recurring / total * 100) if total > 0 else 0
    recurring_score = max(0, (1 - recurring_rate / 100)) * 15

    # Satisfaction (15 pts)
    avg_sat = get_satisfaction_avg(db)
    sat_score = (avg_sat / 5) * 15

    total_score = resolution_score + sla_score + overdue_score + recurring_score + sat_score
    total_score = round(min(100, max(0, total_score)), 1)

    grade = "A+" if total_score >= 90 else "A" if total_score >= 80 else "B" if total_score >= 70 else "C" if total_score >= 60 else "D"

    return {
        "score": total_score,
        "grade": grade,
        "breakdown": {
            "resolution_rate": round(resolution_rate, 1),
            "sla_compliance": round(sla_pct, 1),
            "overdue_rate": round(overdue_rate, 1),
            "recurring_rate": round(recurring_rate, 1),
            "avg_satisfaction": round(avg_sat, 2),
        },
        "component_scores": {
            "resolution": round(resolution_score, 1),
            "sla": round(sla_score, 1),
            "overdue": round(overdue_score, 1),
            "recurring": round(recurring_score, 1),
            "satisfaction": round(sat_score, 1),
        },
    }
