from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.deps import get_db, get_current_admin
from app.models.user import User
from app.models.staff import MaintenanceStaff
from app.schemas.misc import StaffCreate, StaffOut, StaffUpdate

router = APIRouter(prefix="/staff", tags=["staff"])


@router.get("", response_model=List[StaffOut])
@router.get("/", response_model=List[StaffOut])
def list_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    return db.query(MaintenanceStaff).order_by(MaintenanceStaff.name).all()


@router.post("", response_model=StaffOut, status_code=201)
@router.post("/", response_model=StaffOut, status_code=201)
def create_staff(
    payload: StaffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    staff = MaintenanceStaff(**payload.model_dump())
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


@router.put("/{staff_id}", response_model=StaffOut)
def update_staff(
    staff_id: int,
    payload: StaffUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    staff = db.query(MaintenanceStaff).filter(MaintenanceStaff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(staff, k, v)
    db.commit()
    db.refresh(staff)
    return staff


@router.delete("/{staff_id}")
def delete_staff(
    staff_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    staff = db.query(MaintenanceStaff).filter(MaintenanceStaff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    db.delete(staff)
    db.commit()
    return {"ok": True}
