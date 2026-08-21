from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, TokenResponse, UserOut, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role="resident",
        flat_number=payload.flat_number,
        tower=payload.tower,
        phone=payload.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


from app.models.profile_request import ProfileUpdateRequest
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.schemas.user import (
    UserRegister, UserLogin, TokenResponse, UserOut, UserUpdate,
    ProfileUpdateRequestOut, ProfileUpdateSubmit
)


@router.post("/profile-request")
def submit_profile_update(
    payload: ProfileUpdateSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Resident profile update workflow:
    - Non-critical info (Name) updates immediately.
    - Critical info (Flat Number, Tower, Phone) creates a verification request for Admin review.
    """
    has_critical_change = (
        (payload.flat_number is not None and payload.flat_number != (current_user.flat_number or "")) or
        (payload.tower is not None and payload.tower != (current_user.tower or "")) or
        (payload.phone is not None and payload.phone != (current_user.phone or ""))
    )

    # If only name is updated and no critical change
    if not has_critical_change:
        if payload.name:
            current_user.name = payload.name
            db.commit()
            db.refresh(current_user)
        return {
            "ok": True,
            "requires_admin_review": False,
            "message": "Profile updated successfully.",
            "user": UserOut.model_validate(current_user)
        }

    # Cancel previous pending requests if any
    db.query(ProfileUpdateRequest).filter(
        ProfileUpdateRequest.user_id == current_user.id,
        ProfileUpdateRequest.status.in_(["pending_admin", "awaiting_resident_confirmation"])
    ).update({"status": "cancelled"})

    # Create new profile request
    req = ProfileUpdateRequest(
        user_id=current_user.id,
        old_name=current_user.name,
        new_name=payload.name or current_user.name,
        old_flat_number=current_user.flat_number,
        new_flat_number=payload.flat_number,
        old_tower=current_user.tower,
        new_tower=payload.tower,
        old_phone=current_user.phone,
        new_phone=payload.phone,
        status="pending_admin",
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Notify admins of critical profile change request
    admins = db.query(User).filter(User.role == "admin").all()
    for adm in admins:
        notif = Notification(
            user_id=adm.id,
            title="⚠️ Critical Profile Change Request",
            message=f"Resident {current_user.name} requested to update Flat ({current_user.flat_number} -> {payload.flat_number}) / Phone ({current_user.phone} -> {payload.phone}). Verification required.",
            type="warning",
            link="/admin/dashboard"
        )
        db.add(notif)
    db.commit()

    return {
        "ok": True,
        "requires_admin_review": True,
        "message": "Critical profile update submitted! Waiting for Admin verification and confirmation prompt.",
        "request_id": req.id,
        "status": "pending_admin"
    }


@router.get("/profile-requests/my")
def get_my_profile_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all profile requests for the current resident"""
    requests = (
        db.query(ProfileUpdateRequest)
        .filter(ProfileUpdateRequest.user_id == current_user.id)
        .order_by(ProfileUpdateRequest.created_at.desc())
        .all()
    )
    return requests


@router.post("/profile-requests/{req_id}/confirm")
def resident_confirm_profile_change(
    req_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Resident confirms the critical profile change prompt after Admin verification"""
    req = db.query(ProfileUpdateRequest).filter(ProfileUpdateRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Profile update request not found")

    if req.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to confirm this request")

    if req.status != "awaiting_resident_confirmation" and req.status != "pending_admin":
        raise HTTPException(status_code=400, detail=f"Request cannot be confirmed in current status: {req.status}")

    # Officially apply changes to User record
    if req.new_name:
        current_user.name = req.new_name
    if req.new_flat_number:
        current_user.flat_number = req.new_flat_number
    if req.new_tower:
        current_user.tower = req.new_tower
    if req.new_phone:
        current_user.phone = req.new_phone

    req.status = "applied"
    db.commit()
    db.refresh(current_user)
    db.refresh(req)

    # Audit Log
    log = AuditLog(
        user_id=current_user.id,
        action="profile_details_updated",
        resource_type="user",
        resource_id=current_user.id,
        details=f"Verified & applied profile changes for {current_user.name} (Flat: {current_user.flat_number}, Tower: {current_user.tower}, Phone: {current_user.phone})"
    )
    db.add(log)

    # In-app confirmation notification
    notif = Notification(
        user_id=current_user.id,
        title="✅ Profile Details Updated",
        message=f"Your profile changes (Flat {current_user.flat_number}, Tower {current_user.tower}, Phone {current_user.phone}) have been officially applied.",
        type="success",
        link="/resident/profile"
    )
    db.add(notif)
    db.commit()

    return {
        "ok": True,
        "message": "Profile changes confirmed and applied successfully!",
        "user": UserOut.model_validate(current_user)
    }


@router.post("/profile-requests/{req_id}/cancel")
def resident_cancel_profile_change(
    req_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Resident cancels a pending profile change request"""
    req = db.query(ProfileUpdateRequest).filter(ProfileUpdateRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Profile update request not found")

    if req.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to cancel this request")

    req.status = "cancelled"
    db.commit()
    return {"ok": True, "message": "Profile change request cancelled"}
