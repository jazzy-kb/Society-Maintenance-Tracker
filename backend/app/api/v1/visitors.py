from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import random
import string

from app.core.deps import get_db, get_current_user, get_current_admin
from app.models.user import User
from app.models.visitor import VisitorPass
from app.models.notification import Notification
from app.schemas.visitor import VisitorPassCreate, VisitorPassOut, PassVerifyRequest

router = APIRouter(prefix="/visitors", tags=["visitors"])


def generate_pass_code() -> str:
    """Generate a unique 6-digit access code: VP-XXXXXX"""
    digits = ''.join(random.choices(string.digits, k=6))
    return f"VP-{digits}"


PASS_LIMITS = {
    "guest": 3,        # Max 3 guest passes per flat per day
    "service": 2,      # Max 2 service technician passes per flat per day
    "daily_help": 2,   # Max 2 active multi-month daily help passes per flat
    "delivery": 5,     # Max 5 delivery agent passes per flat per day
    "cab": 5,          # Max 5 cab driver passes per flat per day
}


@router.get("/quota-status")
def get_pass_quota_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns live quota usage and limits for the current flat across all visitor pass categories:
    - Guest: Max 3/day
    - Service Technician (Tech): Max 2/day
    - Daily Help (Maid/Cook): Max 2 active passes
    - Delivery: Max 5/day
    - Cab: Max 5/day
    """
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    today_end = today_start + timedelta(days=1)

    # Flat passes created today
    flat_passes_today = db.query(VisitorPass).filter(
        VisitorPass.tower == current_user.tower,
        VisitorPass.flat_number == current_user.flat_number,
        VisitorPass.created_at >= today_start,
        VisitorPass.created_at < today_end,
        VisitorPass.status != "cancelled"
    ).all()

    # Active daily help passes currently valid
    active_daily_help = db.query(VisitorPass).filter(
        VisitorPass.tower == current_user.tower,
        VisitorPass.flat_number == current_user.flat_number,
        VisitorPass.visitor_type == "daily_help",
        VisitorPass.status.in_(["approved", "checked_in"]),
        VisitorPass.valid_until >= now.replace(tzinfo=None)
    ).all()

    guest_used = sum(1 for p in flat_passes_today if p.visitor_type == "guest")
    service_used = sum(1 for p in flat_passes_today if p.visitor_type == "service")
    delivery_used = sum(1 for p in flat_passes_today if p.visitor_type == "delivery")
    cab_used = sum(1 for p in flat_passes_today if p.visitor_type == "cab")
    daily_help_used = len(active_daily_help)

    return {
        "guest": {
            "used": guest_used,
            "limit": PASS_LIMITS["guest"],
            "remaining": max(0, PASS_LIMITS["guest"] - guest_used),
            "is_exhausted": guest_used >= PASS_LIMITS["guest"],
            "period": "daily",
            "label": "Guest / Relative"
        },
        "service": {
            "used": service_used,
            "limit": PASS_LIMITS["service"],
            "remaining": max(0, PASS_LIMITS["service"] - service_used),
            "is_exhausted": service_used >= PASS_LIMITS["service"],
            "period": "daily",
            "label": "Service Technician"
        },
        "daily_help": {
            "used": daily_help_used,
            "limit": PASS_LIMITS["daily_help"],
            "remaining": max(0, PASS_LIMITS["daily_help"] - daily_help_used),
            "is_exhausted": daily_help_used >= PASS_LIMITS["daily_help"],
            "period": "active",
            "label": "Daily Help (Maid/Cook)"
        },
        "delivery": {
            "used": delivery_used,
            "limit": PASS_LIMITS["delivery"],
            "remaining": max(0, PASS_LIMITS["delivery"] - delivery_used),
            "is_exhausted": delivery_used >= PASS_LIMITS["delivery"],
            "period": "daily",
            "label": "Delivery Agent"
        },
        "cab": {
            "used": cab_used,
            "limit": PASS_LIMITS["cab"],
            "remaining": max(0, PASS_LIMITS["cab"] - cab_used),
            "is_exhausted": cab_used >= PASS_LIMITS["cab"],
            "period": "daily",
            "label": "Cab / Taxi"
        }
    }


@router.post("/passes", response_model=VisitorPassOut)
def create_visitor_pass(
    pass_in: VisitorPassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Resident creates a new digital visitor pass with enforced flat limits:
    - Guest: Max 3 passes per flat per day
    - Service Technician: Max 2 passes per flat per day
    - Daily Help: Max 2 active passes per flat (Duration 1, 2, or 6 Months)
    - Delivery: Max 5 passes per flat per day
    - Cab: Max 5 passes per flat per day
    """
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    today_end = today_start + timedelta(days=1)

    # 1. Quota checks per flat per day
    flat_passes_today = db.query(VisitorPass).filter(
        VisitorPass.tower == current_user.tower,
        VisitorPass.flat_number == current_user.flat_number,
        VisitorPass.created_at >= today_start,
        VisitorPass.created_at < today_end,
        VisitorPass.status != "cancelled"
    ).all()

    if pass_in.visitor_type == "guest":
        guest_count = sum(1 for p in flat_passes_today if p.visitor_type == "guest")
        if guest_count >= PASS_LIMITS["guest"]:
            raise HTTPException(
                status_code=400,
                detail=f"Daily limit reached: Maximum {PASS_LIMITS['guest']} Guest passes allowed per flat per day."
            )

    elif pass_in.visitor_type == "service":
        service_count = sum(1 for p in flat_passes_today if p.visitor_type == "service")
        if service_count >= PASS_LIMITS["service"]:
            raise HTTPException(
                status_code=400,
                detail=f"Daily limit reached: Maximum {PASS_LIMITS['service']} Service Technician passes allowed per flat per day."
            )

    elif pass_in.visitor_type == "delivery":
        delivery_count = sum(1 for p in flat_passes_today if p.visitor_type == "delivery")
        if delivery_count >= PASS_LIMITS["delivery"]:
            raise HTTPException(
                status_code=400,
                detail=f"Daily limit reached: Maximum {PASS_LIMITS['delivery']} Delivery passes allowed per flat per day."
            )

    elif pass_in.visitor_type == "cab":
        cab_count = sum(1 for p in flat_passes_today if p.visitor_type == "cab")
        if cab_count >= PASS_LIMITS["cab"]:
            raise HTTPException(
                status_code=400,
                detail=f"Daily limit reached: Maximum {PASS_LIMITS['cab']} Cab passes allowed per flat per day."
            )

    elif pass_in.visitor_type == "daily_help":
        # Check active daily help passes count
        active_dh_count = db.query(VisitorPass).filter(
            VisitorPass.tower == current_user.tower,
            VisitorPass.flat_number == current_user.flat_number,
            VisitorPass.visitor_type == "daily_help",
            VisitorPass.status.in_(["approved", "checked_in"]),
            VisitorPass.valid_until >= now.replace(tzinfo=None)
        ).count()
        if active_dh_count >= PASS_LIMITS["daily_help"]:
            raise HTTPException(
                status_code=400,
                detail=f"Active pass limit reached: Maximum {PASS_LIMITS['daily_help']} concurrent active Daily Help passes allowed per flat."
            )

    # 2. Daily Help duration restriction (1 month, 2 months, 6 months)
    valid_hours = pass_in.valid_hours
    if pass_in.visitor_type == "daily_help":
        # Accept standard hours for 30d (720), 60d (1440), 180d (4320) or defaults
        if valid_hours not in [720, 1440, 4320, 30, 60, 180]:
            # Default to 1 Month (720h / 30 days)
            valid_hours = 720
        elif valid_hours in [30, 60, 180]:
            valid_hours = valid_hours * 24  # convert days to hours

    code = generate_pass_code()
    while db.query(VisitorPass).filter(VisitorPass.pass_code == code).first():
        code = generate_pass_code()

    valid_until = now + timedelta(hours=valid_hours)

    pass_obj = VisitorPass(
        pass_code=code,
        visitor_name=pass_in.visitor_name,
        visitor_phone=pass_in.visitor_phone,
        visitor_type=pass_in.visitor_type,
        purpose=pass_in.purpose,
        vehicle_number=pass_in.vehicle_number,
        resident_id=current_user.id,
        flat_number=current_user.flat_number,
        tower=current_user.tower,
        valid_from=now.replace(tzinfo=None),
        valid_until=valid_until.replace(tzinfo=None),
        status="approved",
    )
    db.add(pass_obj)
    db.commit()
    db.refresh(pass_obj)

    res_out = VisitorPassOut.model_validate(pass_obj)
    res_out.resident_name = current_user.name
    return res_out


@router.get("/my-passes", response_model=List[VisitorPassOut])
def get_my_passes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get active and past visitor passes for current resident"""
    passes = (
        db.query(VisitorPass)
        .filter(VisitorPass.resident_id == current_user.id)
        .order_by(VisitorPass.created_at.desc())
        .all()
    )

    out = []
    for p in passes:
        p_out = VisitorPassOut.model_validate(p)
        p_out.resident_name = current_user.name
        out.append(p_out)
    return out


@router.put("/passes/{pass_id}/cancel", response_model=VisitorPassOut)
def cancel_visitor_pass(
    pass_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resident cancels a visitor pass"""
    pass_obj = db.query(VisitorPass).filter(VisitorPass.id == pass_id).first()
    if not pass_obj:
        raise HTTPException(status_code=404, detail="Visitor pass not found")

    if current_user.role != "admin" and pass_obj.resident_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this pass")

    pass_obj.status = "cancelled"
    db.commit()
    db.refresh(pass_obj)

    res_out = VisitorPassOut.model_validate(pass_obj)
    if pass_obj.resident:
        res_out.resident_name = pass_obj.resident.name
    return res_out


@router.get("/logs", response_model=List[VisitorPassOut])
def get_visitor_logs(
    status: Optional[str] = Query(None),
    tower: Optional[str] = Query(None),
    visitor_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get visitor entry logs (Admin & Gatekeeper view)"""
    query = db.query(VisitorPass)
    if status:
        query = query.filter(VisitorPass.status == status)
    if tower:
        query = query.filter(VisitorPass.tower == tower)
    if visitor_type:
        query = query.filter(VisitorPass.visitor_type == visitor_type)

    passes = query.order_by(VisitorPass.created_at.desc()).all()

    out = []
    for p in passes:
        p_out = VisitorPassOut.model_validate(p)
        if p.resident:
            p_out.resident_name = p.resident.name
        out.append(p_out)
    return out


@router.post("/verify", response_model=VisitorPassOut)
def verify_pass_code(
    payload: PassVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gatekeeper verifies a pass code provided at security entry"""
    code_query = payload.pass_code.strip().upper()
    if not code_query.startswith("VP-") and len(code_query) == 6:
        code_query = f"VP-{code_query}"

    pass_obj = db.query(VisitorPass).filter(VisitorPass.pass_code == code_query).first()
    if not pass_obj:
        raise HTTPException(status_code=404, detail="Invalid pass code. Pass not found.")

    res_out = VisitorPassOut.model_validate(pass_obj)
    if pass_obj.resident:
        res_out.resident_name = pass_obj.resident.name
    return res_out


@router.post("/check-in/{pass_id}", response_model=VisitorPassOut)
def check_in_visitor(
    pass_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gatekeeper checks visitor in upon entry"""
    pass_obj = db.query(VisitorPass).filter(VisitorPass.id == pass_id).first()
    if not pass_obj:
        raise HTTPException(status_code=404, detail="Visitor pass not found")

    if pass_obj.status == "cancelled":
        raise HTTPException(status_code=400, detail="This pass has been cancelled by resident.")
    if pass_obj.status == "checked_in":
        raise HTTPException(status_code=400, detail="Visitor is already checked in.")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    pass_obj.status = "checked_in"
    pass_obj.entry_time = now
    
    # Notify host resident
    notif = Notification(
        user_id=pass_obj.resident_id,
        title=f"🚨 Gate Alert: {pass_obj.visitor_name} Arrived",
        message=f"Your visitor {pass_obj.visitor_name} ({pass_obj.visitor_type.capitalize()}) has entered through Gate Security for Flat {pass_obj.flat_number or ''}.",
        type="info",
        is_read=False,
    )
    db.add(notif)

    db.commit()
    db.refresh(pass_obj)

    res_out = VisitorPassOut.model_validate(pass_obj)
    if pass_obj.resident:
        res_out.resident_name = pass_obj.resident.name
    return res_out


@router.post("/check-out/{pass_id}", response_model=VisitorPassOut)
def check_out_visitor(
    pass_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gatekeeper checks visitor out upon exit"""
    pass_obj = db.query(VisitorPass).filter(VisitorPass.id == pass_id).first()
    if not pass_obj:
        raise HTTPException(status_code=404, detail="Visitor pass not found")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    pass_obj.status = "checked_out"
    pass_obj.exit_time = now
    db.commit()
    db.refresh(pass_obj)

    res_out = VisitorPassOut.model_validate(pass_obj)
    if pass_obj.resident:
        res_out.resident_name = pass_obj.resident.name
    return res_out


@router.delete("/passes/{pass_id}")
def delete_visitor_pass(
    pass_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a visitor pass record from history (Resident can delete own pass, Admin can delete any pass)"""
    pass_obj = db.query(VisitorPass).filter(VisitorPass.id == pass_id).first()
    if not pass_obj:
        raise HTTPException(status_code=404, detail="Visitor pass record not found")

    if current_user.role != "admin" and pass_obj.resident_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this pass record")

    db.delete(pass_obj)
    db.commit()
    return {"ok": True, "message": "Visitor pass history record deleted successfully"}
