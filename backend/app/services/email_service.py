import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, html_body: str, text_body: str = "") -> bool:
    """Send an email. In mock mode, logs to console instead."""
    if settings.MOCK_EMAIL:
        logger.info("=" * 60)
        logger.info(f"[MOCK EMAIL] To: {to_email}")
        logger.info(f"[MOCK EMAIL] Subject: {subject}")
        logger.info(f"[MOCK EMAIL] Body: {text_body or html_body[:200]}")
        logger.info("=" * 60)
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.FROM_NAME} <{settings.FROM_EMAIL}>"
        msg["To"] = to_email

        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.FROM_EMAIL, to_email, msg.as_string())
        logger.info(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_complaint_raised_email(to_email: str, user_name: str, complaint_id: str, title: str):
    subject = f"Complaint Received — {complaint_id}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Society Maintenance Tracker</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937;">Complaint Received ✅</h2>
        <p>Dear <strong>{user_name}</strong>,</p>
        <p>Your complaint has been successfully registered.</p>
        <div style="background: white; border-left: 4px solid #667eea; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Complaint ID:</strong> {complaint_id}</p>
          <p style="margin: 5px 0 0;"><strong>Title:</strong> {title}</p>
        </div>
        <p>Our team will review and respond to your complaint soon. You can track the status in your dashboard.</p>
        <p style="color: #6b7280; font-size: 14px;">This is an automated message from Society Maintenance Tracker.</p>
      </div>
    </div>
    """
    text = f"Dear {user_name},\n\nYour complaint {complaint_id} - '{title}' has been received.\n\nTrack it in your dashboard."
    send_email(to_email, subject, html, text)


def send_status_update_email(to_email: str, user_name: str, complaint_id: str, title: str, new_status: str):
    status_colors = {
        "assigned": "#f59e0b",
        "in_progress": "#3b82f6",
        "resolved": "#10b981",
        "closed": "#6b7280",
        "reopened": "#ef4444",
    }
    color = status_colors.get(new_status, "#667eea")
    subject = f"Complaint Update — {complaint_id} is now {new_status.upper()}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Society Maintenance Tracker</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937;">Status Update</h2>
        <p>Dear <strong>{user_name}</strong>,</p>
        <div style="background: white; border-left: 4px solid {color}; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Complaint ID:</strong> {complaint_id}</p>
          <p style="margin: 5px 0;"><strong>Title:</strong> {title}</p>
          <p style="margin: 5px 0 0;"><strong>New Status:</strong> <span style="color: {color}; font-weight: bold;">{new_status.upper()}</span></p>
        </div>
        <p>Log in to your dashboard to view full details and timeline.</p>
        <p style="color: #6b7280; font-size: 14px;">This is an automated message from Society Maintenance Tracker.</p>
      </div>
    </div>
    """
    text = f"Dear {user_name},\n\nYour complaint {complaint_id} status has changed to {new_status}."
    send_email(to_email, subject, html, text)


def send_overdue_alert_email(to_email: str, user_name: str, complaint_id: str, title: str):
    subject = f"⚠️ Overdue Alert — {complaint_id}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #ef4444; padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">⚠️ Overdue Complaint Alert</h1>
      </div>
      <div style="background: #fef2f2; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Dear <strong>{user_name}</strong>,</p>
        <p>Your complaint has exceeded its SLA resolution time and is now marked as <strong>OVERDUE</strong>.</p>
        <div style="background: white; border-left: 4px solid #ef4444; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Complaint ID:</strong> {complaint_id}</p>
          <p style="margin: 5px 0 0;"><strong>Title:</strong> {title}</p>
        </div>
        <p>We apologize for the delay. Our team has been notified and will prioritize this complaint.</p>
      </div>
    </div>
    """
    text = f"Your complaint {complaint_id} is now overdue."
    send_email(to_email, subject, html, text)
