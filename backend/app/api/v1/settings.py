from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.deps import get_db, get_current_admin
from app.models.user import User
from app.models.sla_setting import SLASetting
from app.schemas.misc import SLASettingOut, SLASettingUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/sla", response_model=List[SLASettingOut])
def list_sla_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    return db.query(SLASetting).all()


@router.put("/sla/{priority}", response_model=SLASettingOut)
def update_sla(
    priority: str,
    payload: SLASettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    setting = db.query(SLASetting).filter(SLASetting.priority == priority).first()
    if not setting:
        raise HTTPException(status_code=404, detail="SLA setting not found")
    setting.resolution_hours = payload.resolution_hours
    setting.warning_threshold_pct = payload.warning_threshold_pct
    db.commit()
    db.refresh(setting)
    return setting
