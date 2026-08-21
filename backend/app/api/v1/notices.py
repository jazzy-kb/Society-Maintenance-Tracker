from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.deps import get_db, get_current_user, get_current_admin
from app.models.user import User
from app.models.notice import Notice
from app.schemas.misc import NoticeCreate, NoticeOut
from app.services.notification_service import notify_new_notice

router = APIRouter(prefix="/notices", tags=["notices"])


@router.get("", response_model=List[NoticeOut])
@router.get("/", response_model=List[NoticeOut])
def list_notices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Notice).order_by(Notice.is_pinned.desc(), Notice.created_at.desc()).all()


@router.post("", response_model=NoticeOut, status_code=201)
@router.post("/", response_model=NoticeOut, status_code=201)
def create_notice(
    payload: NoticeCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    notice = Notice(
        title=payload.title,
        content=payload.content,
        category=payload.category,
        is_pinned=payload.is_pinned,
        created_by_id=current_user.id,
        valid_until=payload.valid_until,
    )
    db.add(notice)
    db.commit()
    db.refresh(notice)

    # Notify all active residents
    residents = db.query(User).filter(User.role == "resident", User.is_active == True).all()
    notify_new_notice(db, residents, notice)

    return notice


@router.put("/{notice_id}", response_model=NoticeOut)
def update_notice(
    notice_id: int,
    payload: NoticeCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    for k, v in payload.model_dump().items():
        setattr(notice, k, v)
    db.commit()
    db.refresh(notice)
    return notice


@router.delete("/{notice_id}")
def delete_notice(
    notice_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    db.delete(notice)
    db.commit()
    return {"ok": True}
