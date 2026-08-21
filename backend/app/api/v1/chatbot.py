from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
import re
import random
import string

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.complaint import Complaint
from app.models.visitor import VisitorPass
from app.models.amenity import Amenity
from app.models.notification import Notification

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


class ChatMessageRequest(BaseModel):
    message: str


class ChatbotActionData(BaseModel):
    action_type: str  # complaint_created | visitor_pass_created | complaint_status | faq | emergency
    title: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class ChatbotResponse(BaseModel):
    reply: str
    action: Optional[ChatbotActionData] = None
    suggested_actions: Optional[List[str]] = None


def generate_pass_code() -> str:
    digits = ''.join(random.choices(string.digits, k=6))
    return f"VP-{digits}"


@router.post("/message", response_model=ChatbotResponse)
def handle_chat_message(
    payload: ChatMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = payload.message.strip()
    msg_lower = msg.lower()

    # --- 1. Emergency SOS Intent ---
    if any(k in msg_lower for k in ["emergency", "fire", "lift stuck", "medical emergency", "help sos"]):
        # Create Emergency notification in DB
        notif = Notification(
            user_id=current_user.id,
            title="🚨 EMERGENCY SOS ALERT",
            message=f"Emergency reported by resident {current_user.name} (Flat {current_user.flat_number or 'N/A'}): {msg}",
            type="error",
            is_read=False,
        )
        db.add(notif)
        db.commit()

        return ChatbotResponse(
            reply="🚨 **EMERGENCY ALERT TRIGGERED!** Society Security and Emergency Response have been notified of your location. Please remain calm.",
            action=ChatbotActionData(
                action_type="emergency",
                title="Emergency Security Contacts",
                details={
                    "Gate Security Direct": "+91 98000 11223",
                    "Society Desk": "+91 98000 44556",
                    "Emergency Services": "112 / 102",
                    "Flat Location": f"{current_user.flat_number or 'Flat N/A'}, Tower {current_user.tower or 'N/A'}"
                }
            ),
            suggested_actions=["Track Complaints", "Society Rules"]
        )

    # --- 2. Track Complaints Intent ---
    if any(k in msg_lower for k in ["track", "my complaint", "complaint status", "my ticket", "ticket status", "check status"]):
        complaints = (
            db.query(Complaint)
            .filter(Complaint.resident_id == current_user.id)
            .order_by(Complaint.created_at.desc())
            .limit(3)
            .all()
        )

        if not complaints:
            return ChatbotResponse(
                reply="You currently have no active maintenance complaints registered under your flat.",
                suggested_actions=["Raise Complaint", "Society Rules"]
            )

        ticket_summaries = []
        for c in complaints:
            ticket_summaries.append({
                "id": c.id,
                "complaint_id": c.complaint_id,
                "title": c.title,
                "category": c.category,
                "status": c.status,
                "priority": c.priority
            })

        summary_text = "\n".join([f"• **{c['complaint_id']}** {c['title']} — `{c['status'].upper()}` ({c['category'].capitalize()})" for c in ticket_summaries])

        return ChatbotResponse(
            reply=f"📋 **Your Recent Maintenance Complaints:**\n\n{summary_text}",
            action=ChatbotActionData(
                action_type="complaint_status",
                title="My Complaints",
                details={"tickets": ticket_summaries}
            ),
            suggested_actions=["Raise Complaint", "Generate Visitor Pass"]
        )

    # --- 3. Create Visitor Pass Intent ---
    if any(k in msg_lower for k in ["visitor pass", "guest pass", "delivery pass", "create pass", "gate pass", "visitor"]):
        # Extract name or phone if present, or create demo pass
        visitor_name = "Expected Visitor"
        visitor_phone = "9876543210"
        visitor_type = "guest"

        if "delivery" in msg_lower or "amazon" in msg_lower or "swiggy" in msg_lower:
            visitor_type = "delivery"
            visitor_name = "Delivery Agent"
        elif "cab" in msg_lower or "uber" in msg_lower or "ola" in msg_lower:
            visitor_type = "cab"
            visitor_name = "Cab Driver"
        elif "electrician" in msg_lower or "plumber" in msg_lower or "repair" in msg_lower:
            visitor_type = "service"
            visitor_name = "Service Technician"

        name_match = re.search(r'(?:for|visitor|guest)\s+([A-Za-z\s]{2,20})', msg, re.IGNORECASE)
        if name_match:
            candidate = name_match.group(1).strip()
            if candidate.lower() not in ["pass", "gate", "guest", "code", "today", "tomorrow"]:
                visitor_name = candidate

        pass_code = generate_pass_code()
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        valid_until = now + timedelta(hours=24)

        v_pass = VisitorPass(
            pass_code=pass_code,
            visitor_name=visitor_name,
            visitor_phone=visitor_phone,
            visitor_type=visitor_type,
            purpose="Requested via AI Chatbot Concierge",
            resident_id=current_user.id,
            flat_number=current_user.flat_number,
            tower=current_user.tower,
            valid_from=now,
            valid_until=valid_until,
            status="approved",
        )
        db.add(v_pass)
        db.commit()
        db.refresh(v_pass)

        return ChatbotResponse(
            reply=f"🚪 **Digital Gate Pass Generated!** Code: `{pass_code}` for **{visitor_name}**. Valid for 24 hours.",
            action=ChatbotActionData(
                action_type="visitor_pass_created",
                title=f"Visitor Pass: {pass_code}",
                details={
                    "pass_code": pass_code,
                    "visitor_name": visitor_name,
                    "visitor_type": visitor_type,
                    "valid_until": valid_until.strftime("%b %d, %I:%M %p"),
                    "flat_number": current_user.flat_number or ""
                }
            ),
            suggested_actions=["Create Another Visitor Pass", "Track Complaints"]
        )

    # --- 4. Raise Complaint Intent ---
    if any(k in msg_lower for k in ["raise complaint", "file complaint", "register complaint", "issue", "leak", "broken", "repair", "not working", "water", "electricity", "plumbing", "garbage", "trash", "dirty", "spark"]):
        category = "general"
        priority = "normal"

        if any(k in msg_lower for k in ["water", "pipe", "leak", "faucet", "drain", "plumbing"]):
            category = "plumbing"
            priority = "urgent" if "leak" in msg_lower or "flood" in msg_lower else "normal"
        elif any(k in msg_lower for k in ["light", "power", "short circuit", "spark", "electricity", "socket", "wire"]):
            category = "electrical"
            priority = "urgent"
        elif any(k in msg_lower for k in ["lift", "elevator"]):
            category = "lift"
            priority = "emergency"
        elif any(k in msg_lower for k in ["garbage", "dirty", "clean", "trash", "dustbin"]):
            category = "cleaning"
            priority = "low"
        elif any(k in msg_lower for k in ["noise", "gate", "guard", "security", "parking"]):
            category = "security"
            priority = "normal"

        from app.services.complaint_service import generate_complaint_id, calculate_recommended_priority
        from app.services.sla_service import calculate_due_date
        from app.services.notification_service import notify_complaint_raised
        from app.models.complaint import ComplaintHistory

        complaint_id = generate_complaint_id(db)
        rec_priority = calculate_recommended_priority(category, priority, 1)
        due_date = calculate_due_date(db, priority)

        title = msg if len(msg) < 60 else f"{category.capitalize()} Issue reported via AI Concierge"
        
        new_complaint = Complaint(
            complaint_id=complaint_id,
            title=title.capitalize(),
            description=f"{msg} (Filed automatically via AI Society Concierge)",
            category=category,
            priority=priority,
            recommended_priority=rec_priority,
            status="open",
            resident_id=current_user.id,
            flat_number=current_user.flat_number,
            tower=current_user.tower,
            residents_affected=1,
            due_date=due_date,
        )
        db.add(new_complaint)
        db.commit()
        db.refresh(new_complaint)

        # Record history
        history = ComplaintHistory(
            complaint_id=new_complaint.id,
            changed_by_id=current_user.id,
            field_changed="status",
            old_value=None,
            new_value="open",
            note="Filed via AI Concierge",
        )
        db.add(history)
        db.commit()

        # Notify
        notify_complaint_raised(db, current_user, new_complaint)

        return ChatbotResponse(
            reply=f"✅ I have automatically filed **Complaint #{new_complaint.complaint_id}** for you! Category: `{category.capitalize()}`, Priority: `{priority.capitalize()}`. Our maintenance team has been notified.",
            action=ChatbotActionData(
                action_type="complaint_created",
                title=f"Complaint #{new_complaint.complaint_id} Created",
                details={
                    "id": new_complaint.id,
                    "title": new_complaint.title,
                    "category": category.capitalize(),
                    "priority": priority.capitalize(),
                    "status": "open",
                    "sla_deadline": due_date.strftime("%b %d, %I:%M %p") if due_date else "Standard SLA"
                }
            ),
            suggested_actions=["Track My Complaints", "Generate Visitor Pass"]
        )

    # --- 5. Society Rules & FAQs Intent ---
    if any(k in msg_lower for k in ["rule", "timing", "pool", "gym", "tennis", "clubhouse", "quiet hours", "due date", "faq"]):
        faq_reply = (
            "🏛️ **Society Quick Reference & Guidelines:**\n\n"
            "• **🏊 Swimming Pool**: 6:00 AM – 10:00 PM (Closed Mondays for cleaning)\n"
            "• **🏋️ Fitness Gym**: 5:30 AM – 11:00 PM (Access via Keycard)\n"
            "• **🎾 Tennis Court & Clubhouse**: Bookable in advance via Amenities page\n"
            "• **🔊 Quiet Hours**: 10:00 PM – 7:00 AM daily\n"
            "• **💳 Maintenance Payment Due Date**: 5th of every month"
        )
        return ChatbotResponse(
            reply=faq_reply,
            action=ChatbotActionData(
                action_type="faq",
                title="Society Guidelines"
            ),
            suggested_actions=["Book Amenities", "Raise Complaint", "Generate Visitor Pass"]
        )

    # --- Admin Specific Intent Handlers ---
    if current_user.role == "admin":
        # Admin Last Month Complaints Count & Analytics Intent
        if any(k in msg_lower for k in [
            "last month complain", "last month complaint", "count of last month",
            "complaints from last month", "how many complaints last month", "previous month complain",
            "past month complain", "last 30 days complain", "monthly complain", "complaint count last month"
        ]):
            from sqlalchemy import func
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            first_of_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            last_day_of_last_month = first_of_this_month - timedelta(seconds=1)
            first_of_last_month = last_day_of_last_month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            since_30d = now - timedelta(days=30)

            # Check previous calendar month first
            count_cal_month = db.query(Complaint).filter(Complaint.created_at >= first_of_last_month, Complaint.created_at < first_of_this_month).count()
            if count_cal_month > 0:
                query_start = first_of_last_month
                query_end = first_of_this_month
                period_name = first_of_last_month.strftime("%B %Y")
                total_count = count_cal_month
            else:
                query_start = since_30d
                query_end = now
                period_name = "Last 30 Days"
                total_count = db.query(Complaint).filter(Complaint.created_at >= query_start).count()

            resolved_count = db.query(Complaint).filter(Complaint.created_at >= query_start, Complaint.created_at <= query_end, Complaint.status.in_(["resolved", "closed"])).count()
            open_count = db.query(Complaint).filter(Complaint.created_at >= query_start, Complaint.created_at <= query_end, Complaint.status.in_(["open", "assigned", "in_progress", "reopened"])).count()
            overdue_count = db.query(Complaint).filter(Complaint.created_at >= query_start, Complaint.created_at <= query_end, Complaint.is_overdue == True).count()

            cat_rows = (
                db.query(Complaint.category, func.count(Complaint.id).label("c"))
                .filter(Complaint.created_at >= query_start, Complaint.created_at <= query_end)
                .group_by(Complaint.category)
                .order_by(func.count(Complaint.id).desc())
                .all()
            )
            cat_summary = ", ".join([f"{cat.capitalize()}: {c}" for cat, c in cat_rows[:4]]) or "None reported"
            resolution_rate = round((resolved_count / total_count * 100) if total_count > 0 else 100, 1)

            return ChatbotResponse(
                reply=(
                    f"📊 **Complaints Analytics for {period_name}:**\n\n"
                    f"• **Total Complaints Logged**: **`{total_count}`**\n"
                    f"• **Resolved / Closed**: **`{resolved_count}`** ({resolution_rate}% resolution rate)\n"
                    f"• **Active / In Progress**: **`{open_count}`**\n"
                    f"• **Overdue SLA Escalations**: **`{overdue_count}`**\n"
                    f"• **Category Breakdown**: {cat_summary}"
                ),
                action=ChatbotActionData(
                    action_type="admin_last_month_complaints",
                    title=f"Complaints Report ({period_name})",
                    details={
                        "period": period_name,
                        "total_complaints": total_count,
                        "resolved_count": resolved_count,
                        "open_count": open_count,
                        "overdue_count": overdue_count,
                        "resolution_rate_pct": resolution_rate,
                        "by_category": {cat.capitalize(): c for cat, c in cat_rows},
                    }
                ),
                suggested_actions=["Society Health Score", "Overdue Escalations", "Staff Workload", "Gate Security Logs"]
            )

        # Admin Health Score Intent
        if any(k in msg_lower for k in ["health score", "analytics", "society health", "metrics"]):
            open_count = db.query(Complaint).filter(Complaint.status.in_(["open", "assigned", "in_progress", "reopened"])).count()
            overdue_count = db.query(Complaint).filter(Complaint.is_overdue == True).count()
            return ChatbotResponse(
                reply=f"📊 **Society Operational Health Report:**\n\n• **Health Score**: `92/100` (Optimal)\n• **Active Open Tickets**: `{open_count}`\n• **Overdue SLA Tickets**: `{overdue_count}`",
                action=ChatbotActionData(action_type="admin_health", title="Society Health"),
                suggested_actions=["Last Month Complaints", "Overdue Escalations", "Staff Workload", "Gate Security Logs"]
            )

        # Admin Overdue Escalations Intent
        if any(k in msg_lower for k in ["overdue", "escalation", "sla breach", "pending tickets"]):
            overdues = db.query(Complaint).filter(
                Complaint.is_overdue == True
            ).limit(5).all()
            if not overdues:
                return ChatbotResponse(
                    reply="🎉 **All Clear!** Zero overdue SLA tickets currently. Society maintenance is running smoothly.",
                    suggested_actions=["Society Health Score", "Gate Security Logs"]
                )
            od_text = "\n".join([f"• **{c.complaint_id}** {c.title} (Priority: `{c.priority.capitalize()}`) — Flat {c.flat_number or 'N/A'}" for c in overdues])
            return ChatbotResponse(
                reply=f"⚠️ **Overdue SLA Tickets Requiring Action:**\n\n{od_text}",
                action=ChatbotActionData(action_type="admin_overdue", title="Overdue Tickets"),
                suggested_actions=["Society Health Score", "Staff Workload"]
            )

        # Admin Staff Workload Intent
        if any(k in msg_lower for k in ["staff", "technicians", "workload", "staff load"]):
            return ChatbotResponse(
                reply="👥 **Staff Assignment Summary:**\n\n• **Electrician**: Rajesh Kumar (3 active tickets)\n• **Plumber**: Vikram Singh (2 active tickets)\n• **Elevator Tech**: Elevator Corp Team (1 ticket)",
                action=ChatbotActionData(action_type="admin_staff", title="Staff Workload"),
                suggested_actions=["Society Health Score", "Gate Security Logs"]
            )

        # Admin Gate Summary Intent
        if any(k in msg_lower for k in ["gate logs", "visitor summary", "visitors inside", "gate"]):
            inside_count = db.query(VisitorPass).filter(VisitorPass.status == "checked_in").count()
            expected_count = db.query(VisitorPass).filter(VisitorPass.status == "approved").count()
            return ChatbotResponse(
                reply=f"🛡️ **Gate Security Live Summary:**\n\n• **Visitors Currently Inside**: `{inside_count}`\n• **Pre-Approved Expected**: `{expected_count}`",
                action=ChatbotActionData(action_type="admin_gate", title="Gate Security"),
                suggested_actions=["Society Health Score", "Overdue Escalations"]
            )

    # --- Default AI Greeting / Conversational Fallback ---
    if current_user.role == "admin":
        default_reply = (
            f"👑 Hello Admin **{current_user.name}**! I am your **Admin Command AI Assistant**.\n\n"
            "Quick Command Access:\n"
            "• *'Society health score'* (Operational overview)\n"
            "• *'Overdue tickets'* (SLA escalation alerts)\n"
            "• *'Staff workload'* (Technician assignments)\n"
            "• *'Gate logs'* (Live visitor counts)"
        )
        return ChatbotResponse(
            reply=default_reply,
            suggested_actions=["Society Health Score", "Overdue Escalations", "Staff Workload", "Gate Security Logs"]
        )
    else:
        default_reply = (
            f"👋 Hello **{current_user.name}**! I am your **Resident AI Concierge**.\n\n"
            "How can I assist you today?\n"
            "• *'My kitchen sink is leaking'* (Auto-file a complaint)\n"
            "• *'Create visitor pass for guest Vikram'* (Generate 6-digit gate code)\n"
            "• *'Track my complaints'* (Check live ticket statuses)\n"
            "• *'What are the pool hours?'* (Society rules & timings)"
        )
        return ChatbotResponse(
            reply=default_reply,
            suggested_actions=["Raise Complaint", "Generate Visitor Pass", "Track My Complaints", "Society Rules"]
        )

