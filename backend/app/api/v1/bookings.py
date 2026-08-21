from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from app.core.deps import get_db, get_current_user, get_current_admin
from app.models.user import User
from app.models.amenity import Amenity
from app.models.booking import Booking
from app.models.audit_log import AuditLog
from app.schemas.booking import (
    AmenityCreate, AmenityUpdate, AmenityOut,
    BookingCreate, BookingOut, BookingOutDetailed
)

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.get("/amenities", response_model=List[AmenityOut])
def get_amenities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all active facilities/amenities."""
    return db.query(Amenity).filter(Amenity.is_active == True).all()


@router.post("/amenities", response_model=AmenityOut, status_code=status.HTTP_201_CREATED)
def create_amenity(
    payload: AmenityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Admin-only: Create a new physical amenity or reactivate a soft-deleted one."""
    existing = db.query(Amenity).filter(Amenity.name == payload.name).first()
    if existing:
        if not existing.is_active:
            # Reactivate
            existing.is_active = True
            for k, v in payload.model_dump().items():
                setattr(existing, k, v)
            db.commit()
            db.refresh(existing)
            return existing
        raise HTTPException(status_code=400, detail="Amenity name already exists")

    amenity = Amenity(**payload.model_dump())
    db.add(amenity)
    db.commit()
    db.refresh(amenity)

    # Audit Log
    log = AuditLog(
        user_id=current_user.id,
        action="create_amenity",
        resource_type="amenity",
        resource_id=amenity.id,
        details=f"Created amenity: {amenity.name} (hourly fee: {amenity.hourly_fee}, cap: {amenity.capacity})"
    )
    db.add(log)
    db.commit()

    return amenity


@router.put("/amenities/{id}", response_model=AmenityOut)
def update_amenity(
    id: int,
    payload: AmenityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Admin-only: Update configuration limits, pricing, or name of an amenity."""
    amenity = db.query(Amenity).filter(Amenity.id == id).first()
    if not amenity:
        raise HTTPException(status_code=404, detail="Amenity not found")

    if payload.name and payload.name != amenity.name:
        existing = db.query(Amenity).filter(Amenity.name == payload.name, Amenity.is_active == True).first()
        if existing:
            raise HTTPException(status_code=400, detail="Amenity name already exists")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(amenity, k, v)
    db.commit()
    db.refresh(amenity)

    # Audit Log
    log = AuditLog(
        user_id=current_user.id,
        action="update_amenity",
        resource_type="amenity",
        resource_id=amenity.id,
        details=f"Updated amenity details for: {amenity.name}"
    )
    db.add(log)
    db.commit()

    return amenity


@router.delete("/amenities/{id}")
def delete_amenity(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Admin-only: Soft-delete/deactivate a facility so it is hidden but preserves database linkages."""
    amenity = db.query(Amenity).filter(Amenity.id == id).first()
    if not amenity:
        raise HTTPException(status_code=404, detail="Amenity not found")

    amenity.is_active = False
    db.commit()

    # Audit Log
    log = AuditLog(
        user_id=current_user.id,
        action="delete_amenity",
        resource_type="amenity",
        resource_id=amenity.id,
        details=f"Deactivated/Deleted amenity: {amenity.name}"
    )
    db.add(log)
    db.commit()

    return {"ok": True, "message": "Amenity deleted and deactivated successfully"}


@router.get("", response_model=List[BookingOutDetailed])
@router.get("/", response_model=List[BookingOutDetailed])
def get_bookings(
    date: Optional[str] = None,
    amenity_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List bookings. Residents only view their own bookings. Admins view all booking audits."""
    query = db.query(Booking)

    if current_user.role != "admin":
        query = query.filter(Booking.resident_id == current_user.id)

    if amenity_id:
        query = query.filter(Booking.amenity_id == amenity_id)

    if date:
        try:
            query_date = datetime.datetime.strptime(date, "%Y-%m-%d").date()
            day_start = datetime.datetime.combine(query_date, datetime.time.min)
            day_end = datetime.datetime.combine(query_date, datetime.time.max)
            # Filter bookings overlapping the selected day
            query = query.filter(Booking.start_time < day_end, Booking.end_time > day_start)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD")

    return query.order_by(Booking.start_time.desc()).all()


@router.post("", response_model=BookingOutDetailed, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=BookingOutDetailed, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Autonomous Amenity Allocation & Auto-Approval Engine:
    - Auto-approves booking requests according to real-time vacancies & capacity.
    - If there is a slot clash/conflict, transparently flags the clashing request while preserving the earlier applicant's priority.
    """
    # Convert and format input datetimes to naive UTC
    start_time = payload.start_time
    end_time = payload.end_time

    if start_time.tzinfo is not None:
        start_time = start_time.astimezone(datetime.timezone.utc).replace(tzinfo=None)
    if end_time.tzinfo is not None:
        end_time = end_time.astimezone(datetime.timezone.utc).replace(tzinfo=None)

    now = datetime.datetime.utcnow()

    # 1. Date validation
    if start_time < now - datetime.timedelta(minutes=5):
        raise HTTPException(status_code=400, detail="Booking start time cannot be in the past")
    if end_time <= start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    amenity = db.query(Amenity).filter(Amenity.id == payload.amenity_id, Amenity.is_active == True).first()
    if not amenity:
        raise HTTPException(status_code=404, detail="Amenity not found or is currently inactive")

    # 1.1 Operating Hours Timing Validation
    open_t_str = amenity.open_time or "06:00"
    close_t_str = amenity.close_time or "22:00"
    try:
        open_time_val = datetime.time.fromisoformat(open_t_str)
        close_time_val = datetime.time.fromisoformat(close_t_str)
        booking_start_t = start_time.time()
        booking_end_t = end_time.time()

        if booking_start_t < open_time_val or (booking_end_t > close_time_val and booking_end_t != datetime.time.min):
            raise HTTPException(
                status_code=400,
                detail=f"⚠️ '{amenity.name}' operating hours are {open_t_str} to {close_t_str}. Requested slot ({booking_start_t.strftime('%H:%M')} - {booking_end_t.strftime('%H:%M')}) is outside open hours."
            )
    except ValueError:
        pass  # Fallback if custom non-standard string

    duration_hours = (end_time - start_time).total_seconds() / 3600.0

    # 2. Maximum booking hours per flat cap per day check
    flat_users = db.query(User).filter(
        User.tower == current_user.tower,
        User.flat_number == current_user.flat_number
    ).all()
    flat_user_ids = [u.id for u in flat_users]

    booking_date = start_time.date()
    day_start = datetime.datetime.combine(booking_date, datetime.time.min)
    day_end = datetime.datetime.combine(booking_date, datetime.time.max)

    existing_bookings = db.query(Booking).filter(
        Booking.resident_id.in_(flat_user_ids),
        Booking.amenity_id == amenity.id,
        Booking.status == "approved",
        Booking.start_time < day_end,
        Booking.end_time > day_start
    ).all()

    existing_hours = sum((b.end_time - b.start_time).total_seconds() / 3600.0 for b in existing_bookings)

    if existing_hours + duration_hours > amenity.max_daily_hours_per_flat:
        raise HTTPException(
            status_code=400,
            detail=f"This booking exceeds the maximum daily limit of {amenity.max_daily_hours_per_flat} hours per flat for '{amenity.name}'. (Current booked: {existing_hours:.1f} hours, Requested: {duration_hours:.1f} hours)"
        )

    # 3. Autonomous Vacancy & Capacity Clash Resolution
    overlapping_approved = db.query(Booking).filter(
        Booking.amenity_id == amenity.id,
        Booking.status == "approved",
        Booking.start_time < end_time,
        Booking.end_time > start_time
    ).order_by(Booking.created_at.asc()).all()

    total_fee = round(duration_hours * amenity.hourly_fee, 2)

    from app.services.notification_service import create_notification

    # Auto-Approve if within capacity
    if len(overlapping_approved) < amenity.capacity:
        booking_status = "approved"
        is_flagged = False
        conflict_note = None
        auto_allotted = True
        log_action = "auto_allotted_booking"
        log_details = f"Autonomous Auto-Approval: '{amenity.name}' ({start_time.strftime('%Y-%m-%d %H:%M')} to {end_time.strftime('%H:%M')}). Capacity available: {len(overlapping_approved)+1}/{amenity.capacity}."
        
        # In-app notification to resident
        create_notification(
            db,
            user_id=current_user.id,
            title=f"Reservation Confirmed: {amenity.name}",
            message=f"Your booking for {amenity.name} on {booking_date} ({start_time.strftime('%I:%M %p')} - {end_time.strftime('%I:%M %p')}) is autonomously auto-approved!",
            type="success",
            link="/resident/bookings"
        )
    else:
        # Clashing detected!
        first_booker = overlapping_approved[0]
        first_name = first_booker.resident.name if first_booker.resident else "Earlier Applicant"
        booking_status = "flagged_conflict"
        is_flagged = True
        conflict_note = f"Slot clash: Earlier booking by {first_name} occupies the slot (Capacity: {amenity.capacity}/{amenity.capacity} full)."
        auto_allotted = False
        log_action = "flagged_conflict_booking"
        log_details = f"Slot Clash Flagged: '{amenity.name}' ({start_time.strftime('%Y-%m-%d %H:%M')} to {end_time.strftime('%H:%M')}). Overlaps with prior booking #{first_booker.id}."

        # Notification to resident about flagged clash
        create_notification(
            db,
            user_id=current_user.id,
            title=f"⚠️ Slot Clash Flagged: {amenity.name}",
            message=f"Your booking for {amenity.name} conflicts with an earlier reservation. Flagged for admin review.",
            type="warning",
            link="/resident/bookings"
        )

    booking = Booking(
        amenity_id=amenity.id,
        resident_id=current_user.id,
        start_time=start_time,
        end_time=end_time,
        total_fee=total_fee,
        status=booking_status,
        is_flagged=is_flagged,
        conflict_note=conflict_note,
        auto_allotted=auto_allotted,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    # Audit Log
    log = AuditLog(
        user_id=current_user.id,
        action=log_action,
        resource_type="booking",
        resource_id=booking.id,
        details=log_details
    )
    db.add(log)
    db.commit()

    return booking


@router.put("/{booking_id}/approve", response_model=BookingOutDetailed)
def approve_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Admin-only: Manually approve / override an allotment or resolve a flagged conflict."""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = "approved"
    booking.is_flagged = False
    booking.conflict_note = f"Manually approved by Administrator ({current_user.name})"
    db.commit()
    db.refresh(booking)

    # Notify resident
    from app.services.notification_service import create_notification
    create_notification(
        db,
        user_id=booking.resident_id,
        title=f"✅ Booking Approved: {booking.amenity.name if booking.amenity else 'Facility'}",
        message=f"Your booking for {booking.amenity.name if booking.amenity else 'facility'} on {booking.start_time.strftime('%b %d, %I:%M %p')} has been approved by admin.",
        type="success",
        link="/resident/bookings"
    )

    # Audit Log
    log = AuditLog(
        user_id=current_user.id,
        action="admin_approve_booking",
        resource_type="booking",
        resource_id=booking.id,
        details=f"Admin manually approved booking #{booking.id} for {booking.amenity.name if booking.amenity else 'Facility'}"
    )
    db.add(log)
    db.commit()

    return booking


@router.put("/{booking_id}/reject", response_model=BookingOutDetailed)
def reject_booking(
    booking_id: int,
    reason: Optional[str] = "Slot unavailable due to capacity limit",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Admin-only: Reject a flagged conflicting booking."""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = "cancelled"
    booking.conflict_note = f"Rejected: {reason}"
    db.commit()
    db.refresh(booking)

    from app.services.notification_service import create_notification
    create_notification(
        db,
        user_id=booking.resident_id,
        title=f"Reservation Declined: {booking.amenity.name if booking.amenity else 'Facility'}",
        message=f"Your booking for {booking.amenity.name if booking.amenity else 'facility'} could not be accommodated: {reason}",
        type="error",
        link="/resident/bookings"
    )

    # Audit Log
    log = AuditLog(
        user_id=current_user.id,
        action="admin_reject_booking",
        resource_type="booking",
        resource_id=booking.id,
        details=f"Admin rejected booking #{booking.id}: {reason}"
    )
    db.add(log)
    db.commit()

    return booking


@router.put("/{booking_id}/cancel", response_model=BookingOutDetailed)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel booking reservation: Residents can cancel their own, Admins can cancel any booking."""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if current_user.role != "admin" and booking.resident_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")

    if booking.status == "cancelled":
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)

    # Audit Log
    log = AuditLog(
        user_id=current_user.id,
        action="cancel_booking",
        resource_type="booking",
        resource_id=booking.id,
        details=f"Cancelled booking for '{booking.amenity.name}' (Original Fee: {booking.total_fee})"
    )
    db.add(log)
    db.commit()

    return booking


@router.get("/analytics-30d")
def get_amenity_analytics_30d(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns 1-month (30-day) performance metrics, revenue, utilization rates, and daily trends for all amenities."""
    from sqlalchemy import func
    now = datetime.datetime.utcnow()
    since_30d = now - datetime.timedelta(days=30)

    amenities = db.query(Amenity).all()
    results = []

    for a in amenities:
        all_bookings_30d = db.query(Booking).filter(
            Booking.amenity_id == a.id,
            Booking.start_time >= since_30d
        ).all()

        approved = [b for b in all_bookings_30d if b.status == "approved"]
        cancelled = [b for b in all_bookings_30d if b.status == "cancelled"]
        flagged = [b for b in all_bookings_30d if b.status == "flagged_conflict" or b.is_flagged]

        total_hours = sum((b.end_time - b.start_time).total_seconds() / 3600.0 for b in approved)
        total_revenue = sum(b.total_fee for b in approved)

        # Utilization calculation: assuming 16 operating hours/day (6 AM to 10 PM) * 30 days * capacity
        max_possible_hours = 30 * 16 * max(1, a.capacity)
        utilization_rate = round(min(100.0, (total_hours / max_possible_hours * 100) if max_possible_hours > 0 else 0), 1)

        # 30-day daily trend
        daily_dict = {}
        for i in range(30):
            d_str = (since_30d + datetime.timedelta(days=i)).strftime("%Y-%m-%d")
            daily_dict[d_str] = {"date": d_str, "count": 0, "revenue": 0.0}

        for b in approved:
            b_date = b.start_time.strftime("%Y-%m-%d")
            if b_date in daily_dict:
                daily_dict[b_date]["count"] += 1
                daily_dict[b_date]["revenue"] += b.total_fee

        results.append({
            "amenity_id": a.id,
            "name": a.name,
            "hourly_fee": a.hourly_fee,
            "capacity": a.capacity,
            "is_active": a.is_active,
            "max_daily_hours_per_flat": a.max_daily_hours_per_flat,
            "total_bookings_30d": len(all_bookings_30d),
            "total_hours_30d": round(total_hours, 1),
            "total_revenue_30d": round(total_revenue, 2),
            "approved_count": len(approved),
            "cancelled_count": len(cancelled),
            "flagged_conflict_count": len(flagged),
            "utilization_rate_pct": utilization_rate,
            "daily_trend": list(daily_dict.values()),
        })

    return results


@router.get("/logs")
def get_amenity_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Admin-only: Retrieve chronological data logs of amenity allocations, auto-approvals, clashes, and edits."""
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.resource_type.in_(["booking", "amenity"]))
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )

    enriched_logs = []
    for l in logs:
        resident_name = "System / Admin"
        flat_number = "—"
        tower = "—"
        if l.user_id:
            u = db.query(User).filter(User.id == l.user_id).first()
            if u:
                resident_name = u.name
                flat_number = u.flat_number or "—"
                tower = u.tower or "—"

        enriched_logs.append({
            "id": l.id,
            "action": l.action,
            "timestamp": l.created_at.isoformat() if l.created_at else None,
            "resident_name": resident_name,
            "flat_number": flat_number,
            "tower": tower,
            "resource_id": l.resource_id,
            "resource_type": l.resource_type,
            "details": l.details or "—",
        })

    return enriched_logs
