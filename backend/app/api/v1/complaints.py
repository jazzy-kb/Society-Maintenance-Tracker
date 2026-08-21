from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from app.core.deps import get_db, get_current_user, get_current_admin
from app.models.user import User
from app.models.complaint import Complaint, ComplaintHistory, Feedback
from app.models.staff import MaintenanceStaff
from app.schemas.complaint import (
    ComplaintCreate, ComplaintUpdate, ComplaintOut, ComplaintDetailOut,
    FeedbackCreate, FeedbackOut,
)
from app.services.complaint_service import generate_complaint_id, calculate_recommended_priority
from app.services.sla_service import calculate_due_date
from app.services.notification_service import notify_complaint_raised, notify_status_change
from app.core.config import settings
import os
import uuid
import aiofiles

router = APIRouter(prefix="/complaints", tags=["complaints"])

VALID_STATUS_TRANSITIONS = {
    "open": ["assigned", "in_progress", "resolved", "closed"],
    "assigned": ["in_progress", "open", "resolved", "closed"],
    "in_progress": ["resolved", "open", "assigned", "closed"],
    "resolved": ["closed", "reopened", "in_progress"],
    "closed": ["reopened"],
    "reopened": ["assigned", "in_progress", "resolved", "closed"],
}


@router.get("", response_model=List[ComplaintOut])
@router.get("/", response_model=List[ComplaintOut])
def list_complaints(
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    tower: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Complaint)
    if current_user.role != "admin":
        q = q.filter(Complaint.resident_id == current_user.id)
    if status:
        q = q.filter(Complaint.status == status)
    if category:
        q = q.filter(Complaint.category == category)
    if priority:
        q = q.filter(Complaint.priority == priority)
    if tower:
        q = q.filter(Complaint.tower == tower)
    if search:
        q = q.filter(Complaint.title.ilike(f"%{search}%"))
    return q.order_by(Complaint.created_at.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=ComplaintOut, status_code=201)
@router.post("/", response_model=ComplaintOut, status_code=201)
async def create_complaint(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    priority: str = Form("normal"),
    tower: Optional[str] = Form(None),
    flat_number: Optional[str] = Form(None),
    residents_affected: int = Form(1),
    photo: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    photo_url = None
    if photo and photo.filename:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        ext = photo.filename.rsplit(".", 1)[-1].lower()
        filename = f"{uuid.uuid4()}.{ext}"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)
        async with aiofiles.open(filepath, "wb") as f:
            content = await photo.read()
            await f.write(content)
        photo_url = f"/uploads/{filename}"

    complaint_id = generate_complaint_id(db)
    rec_priority = calculate_recommended_priority(category, priority, residents_affected)
    due_date = calculate_due_date(db, priority)

    complaint = Complaint(
        complaint_id=complaint_id,
        title=title,
        description=description,
        category=category,
        priority=priority,
        recommended_priority=rec_priority,
        tower=tower or current_user.tower,
        flat_number=flat_number or current_user.flat_number,
        residents_affected=residents_affected,
        photo_url=photo_url,
        resident_id=current_user.id,
        due_date=due_date,
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # Record history
    history = ComplaintHistory(
        complaint_id=complaint.id,
        changed_by_id=current_user.id,
        field_changed="status",
        old_value=None,
        new_value="open",
        note="Complaint created",
    )
    db.add(history)
    db.commit()

    # Notify
    notify_complaint_raised(db, current_user, complaint)

    return complaint


@router.get("/{complaint_id}", response_model=ComplaintDetailOut)
def get_complaint(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if current_user.role != "admin" and complaint.resident_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    history = (
        db.query(ComplaintHistory)
        .filter(ComplaintHistory.complaint_id == complaint.id)
        .order_by(ComplaintHistory.created_at)
        .all()
    )
    feedback = db.query(Feedback).filter(Feedback.complaint_id == complaint.id).first()

    result = ComplaintDetailOut.model_validate(complaint)
    result.history = history
    result.feedback = feedback
    return result


@router.patch("/{complaint_id}", response_model=ComplaintOut)
def update_complaint(
    complaint_id: int,
    payload: ComplaintUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    old_status = complaint.status

    if payload.status and payload.status != old_status:
        allowed = VALID_STATUS_TRANSITIONS.get(old_status, [])
        if payload.status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot transition from {old_status} to {payload.status}",
            )
        complaint.status = payload.status
        if payload.status in ("resolved", "closed"):
            complaint.resolved_at = datetime.now(timezone.utc)
        
        # Add history
        history = ComplaintHistory(
            complaint_id=complaint.id,
            changed_by_id=current_user.id,
            field_changed="status",
            old_value=old_status,
            new_value=payload.status,
            note=payload.admin_notes,
        )
        db.add(history)

        # Notify resident
        resident = db.query(User).filter(User.id == complaint.resident_id).first()
        if resident:
            notify_status_change(db, resident, complaint, payload.status)

    if payload.assigned_staff_id is not None:
        old_staff = complaint.assigned_staff_id
        complaint.assigned_staff_id = payload.assigned_staff_id

        # Update staff workload
        if old_staff:
            old = db.query(MaintenanceStaff).filter(MaintenanceStaff.id == old_staff).first()
            if old and old.current_workload > 0:
                old.current_workload -= 1
        new_staff = db.query(MaintenanceStaff).filter(MaintenanceStaff.id == payload.assigned_staff_id).first()
        if new_staff:
            new_staff.current_workload += 1

        history = ComplaintHistory(
            complaint_id=complaint.id,
            changed_by_id=current_user.id,
            field_changed="assigned_staff_id",
            old_value=str(old_staff) if old_staff else None,
            new_value=str(payload.assigned_staff_id),
            note="Staff assigned",
        )
        db.add(history)

    if payload.priority:
        complaint.priority = payload.priority
    if payload.admin_notes:
        complaint.admin_notes = payload.admin_notes

    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/{complaint_id}/feedback", response_model=FeedbackOut, status_code=201)
def add_feedback(
    complaint_id: int,
    payload: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if complaint.resident_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if complaint.status not in ("resolved", "closed"):
        raise HTTPException(status_code=400, detail="Can only rate resolved or closed complaints")
    
    existing = db.query(Feedback).filter(Feedback.complaint_id == complaint_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Feedback already submitted")

    if not 1 <= payload.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")

    feedback = Feedback(
        complaint_id=complaint_id,
        resident_id=current_user.id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback
