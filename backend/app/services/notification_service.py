from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.services import email_service


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    type: str = "info",
    link: str = None,
) -> Notification:
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        link=link,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def notify_complaint_raised(db: Session, user, complaint):
    """In-app + email: complaint successfully raised."""
    create_notification(
        db,
        user_id=user.id,
        title=f"Complaint Registered — {complaint.complaint_id}",
        message=f"Your complaint '{complaint.title}' has been successfully registered.",
        type="success",
        link=f"/complaints/{complaint.id}",
    )
    email_service.send_complaint_raised_email(
        to_email=user.email,
        user_name=user.name,
        complaint_id=complaint.complaint_id,
        title=complaint.title,
    )


def notify_status_change(db: Session, user, complaint, new_status: str):
    """In-app + email: complaint status changed."""
    status_messages = {
        "assigned": f"Your complaint {complaint.complaint_id} has been assigned to maintenance staff.",
        "in_progress": f"Work has started on your complaint {complaint.complaint_id}.",
        "resolved": f"Your complaint {complaint.complaint_id} has been resolved! Please provide feedback.",
        "closed": f"Your complaint {complaint.complaint_id} has been closed.",
        "reopened": f"Your complaint {complaint.complaint_id} has been reopened.",
    }
    type_map = {
        "assigned": "info",
        "in_progress": "info",
        "resolved": "success",
        "closed": "info",
        "reopened": "warning",
    }
    message = status_messages.get(new_status, f"Complaint {complaint.complaint_id} status updated to {new_status}.")
    notif_type = type_map.get(new_status, "info")

    create_notification(
        db,
        user_id=user.id,
        title=f"Status Update — {complaint.complaint_id}",
        message=message,
        type=notif_type,
        link=f"/complaints/{complaint.id}",
    )
    email_service.send_status_update_email(
        to_email=user.email,
        user_name=user.name,
        complaint_id=complaint.complaint_id,
        title=complaint.title,
        new_status=new_status,
    )


def notify_overdue(db: Session, user, complaint):
    """In-app + email: complaint is overdue."""
    create_notification(
        db,
        user_id=user.id,
        title=f"⚠️ Overdue — {complaint.complaint_id}",
        message=f"Your complaint '{complaint.title}' is overdue and has been escalated.",
        type="error",
        link=f"/complaints/{complaint.id}",
    )
    email_service.send_overdue_alert_email(
        to_email=user.email,
        user_name=user.name,
        complaint_id=complaint.complaint_id,
        title=complaint.title,
    )


def notify_new_notice(db: Session, users: list, notice):
    """Notify all active residents of a new notice."""
    for user in users:
        create_notification(
            db,
            user_id=user.id,
            title=f"New Notice: {notice.title}",
            message=notice.content[:150] + ("..." if len(notice.content) > 150 else ""),
            type="info",
            link="/notices",
        )


def cleanup_old_notifications(db: Session, days: int = 90) -> int:
    """Automatically delete in-app notifications older than N days (default 3 months / 90 days)."""
    from datetime import datetime, timedelta, timezone
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    deleted_count = (
        db.query(Notification)
        .filter(Notification.created_at < cutoff)
        .delete(synchronize_session=False)
    )
    db.commit()
    return deleted_count
