from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.deps import get_db, get_current_admin
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.misc import AuditLogOut
from app.services.analytics_service import (
    get_complaint_stats, get_complaints_by_category, get_complaints_by_status,
    get_complaints_by_tower, get_complaints_trend, get_avg_resolution_time,
    get_sla_compliance, get_satisfaction_avg, get_priority_distribution,
)
from app.services.recurring_service import detect_recurring_issues
from app.services.health_score_service import calculate_health_score

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard")
def admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    stats = get_complaint_stats(db)
    health = calculate_health_score(db)
    return {
        "stats": stats,
        "health_score": health,
        "avg_resolution_hours": get_avg_resolution_time(db),
        "sla_compliance_pct": get_sla_compliance(db),
        "satisfaction_avg": get_satisfaction_avg(db),
        "by_category": get_complaints_by_category(db),
        "by_status": get_complaints_by_status(db),
        "by_tower": get_complaints_by_tower(db),
        "trend_30d": get_complaints_trend(db, 30),
        "priority_distribution": get_priority_distribution(db),
    }


@router.get("/analytics")
def analytics(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    return {
        "trend": get_complaints_trend(db, days),
        "by_category": get_complaints_by_category(db),
        "by_status": get_complaints_by_status(db),
        "by_tower": get_complaints_by_tower(db),
        "priority_distribution": get_priority_distribution(db),
        "avg_resolution_hours": get_avg_resolution_time(db),
        "sla_compliance_pct": get_sla_compliance(db),
        "satisfaction_avg": get_satisfaction_avg(db),
    }


@router.get("/recurring-issues")
def recurring_issues(
    days: int = 30,
    threshold: int = 2,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    return detect_recurring_issues(db, days, threshold)


@router.get("/health-score")
def health_score(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    return calculate_health_score(db)


@router.get("/audit-logs", response_model=List[AuditLogOut])
def audit_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/residents")
def list_residents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    users = db.query(User).filter(User.role == "resident").all()
    return [{"id": u.id, "name": u.name, "email": u.email, "flat_number": u.flat_number, "tower": u.tower, "phone": u.phone} for u in users]


@router.get("/profile-requests")
def list_profile_requests(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Admin view of all resident critical profile change requests"""
    from app.models.profile_request import ProfileUpdateRequest
    query = db.query(ProfileUpdateRequest)
    if status:
        query = query.filter(ProfileUpdateRequest.status == status)
    
    requests = query.order_by(ProfileUpdateRequest.created_at.desc()).all()
    out = []
    for r in requests:
        user_name = r.user.name if r.user else "Unknown"
        user_email = r.user.email if r.user else "Unknown"
        out.append({
            "id": r.id,
            "user_id": r.user_id,
            "user_name": user_name,
            "user_email": user_email,
            "old_name": r.old_name,
            "new_name": r.new_name,
            "old_flat_number": r.old_flat_number,
            "new_flat_number": r.new_flat_number,
            "old_tower": r.old_tower,
            "new_tower": r.new_tower,
            "old_phone": r.old_phone,
            "new_phone": r.new_phone,
            "status": r.status,
            "admin_note": r.admin_note,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        })
    return out


@router.post("/profile-requests/{req_id}/prompt")
def prompt_resident_confirmation(
    req_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Admin verifies requested critical changes and triggers confirmation prompt notification to resident:
    'Are you sure you want to change your flat/phone details?'
    """
    from app.models.profile_request import ProfileUpdateRequest
    from app.models.notification import Notification

    req = db.query(ProfileUpdateRequest).filter(ProfileUpdateRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Profile request not found")

    req.status = "awaiting_resident_confirmation"
    db.commit()

    # Dispatched verification prompt notification to resident
    flat_change = f"Flat {req.old_flat_number or '—'} -> {req.new_flat_number}" if req.new_flat_number else ""
    phone_change = f"Phone {req.old_phone or '—'} -> {req.new_phone}" if req.new_phone else ""
    summary_text = " & ".join(filter(None, [flat_change, phone_change]))

    notif = Notification(
        user_id=req.user_id,
        title="⚠️ Action Required: Confirm Profile Changes",
        message=f"Admin has reviewed your critical detail request ({summary_text}). Please confirm: Are you sure you want to apply these changes?",
        type="warning",
        link="/resident/profile"
    )
    db.add(notif)
    db.commit()

    return {"ok": True, "message": "Confirmation prompt successfully dispatched to resident!"}


@router.post("/profile-requests/{req_id}/reject")
def reject_profile_request(
    req_id: int,
    reason: Optional[str] = "Details could not be verified by society management",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Admin rejects a critical profile change request"""
    from app.models.profile_request import ProfileUpdateRequest
    from app.models.notification import Notification

    req = db.query(ProfileUpdateRequest).filter(ProfileUpdateRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Profile request not found")

    req.status = "rejected"
    req.admin_note = reason
    db.commit()

    # Notify resident
    notif = Notification(
        user_id=req.user_id,
        title="Profile Change Request Declined",
        message=f"Your request to update flat/phone details was declined by admin: {reason}",
        type="error",
        link="/resident/profile"
    )
    db.add(notif)
    db.commit()

    return {"ok": True, "message": "Profile request rejected"}
