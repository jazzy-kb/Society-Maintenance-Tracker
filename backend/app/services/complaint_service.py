from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.complaint import Complaint
from app.models.sla_setting import SLASetting
from app.services.sla_service import get_sla_hours
import logging

logger = logging.getLogger(__name__)

CATEGORY_WEIGHTS = {
    "electrical": 3,
    "lift": 3,
    "water": 3,
    "structural": 2,
    "plumbing": 2,
    "security": 2,
    "gas": 3,
    "cleaning": 1,
    "parking": 1,
    "garbage": 1,
    "internet": 1,
    "general": 1,
}

PRIORITY_WEIGHTS = {
    "low": 1,
    "normal": 2,
    "urgent": 3,
    "emergency": 4,
}

COUNTER_KEY = "complaint_counter"
_counter_cache: dict = {}


def generate_complaint_id(db: Session) -> str:
    year = datetime.now().year
    prefix = f"CMP-{year}-"
    last_cmp = (
        db.query(Complaint.complaint_id)
        .filter(Complaint.complaint_id.like(f"{prefix}%"))
        .order_by(Complaint.id.desc())
        .first()
    )
    last_seq = 0
    if last_cmp and last_cmp[0]:
        try:
            last_seq = int(last_cmp[0].split("-")[-1])
        except (ValueError, IndexError):
            last_seq = 0
    
    candidate = f"{prefix}{last_seq + 1:04d}"
    while db.query(Complaint).filter(Complaint.complaint_id == candidate).first():
        last_seq += 1
        candidate = f"{prefix}{last_seq + 1:04d}"
    return candidate


def calculate_recommended_priority(
    category: str,
    priority: str,
    residents_affected: int,
    created_at: datetime = None,
) -> str:
    score = 0

    # User-stated priority weight
    score += PRIORITY_WEIGHTS.get(priority, 2)

    # Category criticality
    score += CATEGORY_WEIGHTS.get(category.lower(), 1)

    # Residents affected
    if residents_affected >= 20:
        score += 2
    elif residents_affected >= 6:
        score += 1

    # Age bonus (for existing complaints being re-evaluated)
    if created_at:
        now = datetime.now(timezone.utc)
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        age_hours = (now - created_at).total_seconds() / 3600
        if age_hours > 48:
            score += 2
        elif age_hours > 24:
            score += 1

    if score >= 8:
        return "emergency"
    elif score >= 6:
        return "urgent"
    elif score >= 3:
        return "normal"
    else:
        return "low"
