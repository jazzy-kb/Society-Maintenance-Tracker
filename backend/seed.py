"""
Seed script — creates demo data for development.
Run: python seed.py
"""
import sys
import os
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta, timezone
from app.core.database import SessionLocal, create_tables
from app.core.security import get_password_hash
from app.models.user import User
from app.models.complaint import Complaint, ComplaintHistory, Feedback
from app.models.staff import MaintenanceStaff
from app.models.notice import Notice
from app.models.notification import Notification
from app.models.sla_setting import SLASetting
from app.models.amenity import Amenity
from app.models.booking import Booking
from app.models.visitor import VisitorPass

def seed():
    create_tables()
    db = SessionLocal()

    # Clear existing data
    for model in [Feedback, ComplaintHistory, Notification, Complaint, Notice, MaintenanceStaff, SLASetting, Booking, Amenity, VisitorPass, User]:
        db.query(model).delete()

    db.commit()
    print("Cleared existing data.")

    # --- SLA Settings ---
    sla_defaults = [
        SLASetting(priority="low", resolution_hours=72, warning_threshold_pct=80),
        SLASetting(priority="normal", resolution_hours=48, warning_threshold_pct=80),
        SLASetting(priority="urgent", resolution_hours=24, warning_threshold_pct=75),
        SLASetting(priority="emergency", resolution_hours=4, warning_threshold_pct=70),
    ]
    db.add_all(sla_defaults)
    db.commit()
    print("SLA settings seeded.")

    # --- Users ---
    admin = User(
        name="Admin Manager",
        email="admin@society.com",
        hashed_password=get_password_hash("Admin@123"),
        role="admin",
        flat_number="A-001",
        tower="A",
        phone="9900000001",
    )
    residents = [
        User(name="Rahul Sharma", email="resident1@society.com", hashed_password=get_password_hash("Resident@123"),
             role="resident", flat_number="B-204", tower="B", phone="9900000002"),
        User(name="Priya Patel", email="resident2@society.com", hashed_password=get_password_hash("Resident@123"),
             role="resident", flat_number="C-105", tower="C", phone="9900000003"),
        User(name="Amit Kumar", email="resident3@society.com", hashed_password=get_password_hash("Resident@123"),
             role="resident", flat_number="B-301", tower="B", phone="9900000004"),
        User(name="Sunita Verma", email="resident4@society.com", hashed_password=get_password_hash("Resident@123"),
             role="resident", flat_number="A-502", tower="A", phone="9900000005"),
        User(name="Rajesh Gupta", email="resident5@society.com", hashed_password=get_password_hash("Resident@123"),
             role="resident", flat_number="C-303", tower="C", phone="9900000006"),
    ]
    db.add(admin)
    db.add_all(residents)
    db.commit()
    db.refresh(admin)
    for r in residents:
        db.refresh(r)
    print(f"Created 1 admin + {len(residents)} residents.")

    # --- Staff ---
    staff_list = [
        MaintenanceStaff(name="Ramesh Electrician", department="electrical", phone="9811111111", email="ramesh@staff.com"),
        MaintenanceStaff(name="Suresh Plumber", department="plumbing", phone="9811111112", email="suresh@staff.com"),
        MaintenanceStaff(name="Mukesh Civil", department="civil", phone="9811111113", email="mukesh@staff.com"),
        MaintenanceStaff(name="Dinesh Cleaner", department="cleaning", phone="9811111114", email="dinesh@staff.com"),
        MaintenanceStaff(name="Ganesh Lift", department="lift", phone="9811111115", email="ganesh@staff.com"),
    ]
    db.add_all(staff_list)
    db.commit()
    for s in staff_list:
        db.refresh(s)
    print(f"Created {len(staff_list)} staff members.")

    # --- Complaints ---
    now = datetime.now(timezone.utc)
    complaints_data = [
        # Resolved complaints
        dict(title="Lift not working in Tower B", description="The lift has been stuck on floor 3 since morning. Multiple residents affected.", 
             category="lift", priority="urgent", status="resolved", tower="B", residents_affected=15,
             resident_id=residents[0].id, assigned_staff_id=staff_list[4].id,
             created_at=now - timedelta(days=10), resolved_at=now - timedelta(days=8)),
        dict(title="Water leakage in bathroom", description="Water is leaking from the bathroom ceiling in my flat B-204.",
             category="plumbing", priority="normal", status="resolved", tower="B", residents_affected=1,
             resident_id=residents[0].id, assigned_staff_id=staff_list[1].id,
             created_at=now - timedelta(days=7), resolved_at=now - timedelta(days=5)),
        dict(title="Street light not working", description="The street light near Gate 2 has been non-functional for 3 days.",
             category="electrical", priority="normal", status="closed", tower="A", residents_affected=30,
             resident_id=residents[3].id, assigned_staff_id=staff_list[0].id,
             created_at=now - timedelta(days=15), resolved_at=now - timedelta(days=12)),
        dict(title="Garbage not collected for 2 days", description="The garbage collection service has skipped our wing for 2 days now.",
             category="garbage", priority="urgent", status="resolved", tower="C", residents_affected=20,
             resident_id=residents[1].id, assigned_staff_id=staff_list[3].id,
             created_at=now - timedelta(days=5), resolved_at=now - timedelta(days=3)),
        # Recurring lift issues
        dict(title="Lift door sensor malfunction Tower B", description="Lift door doesn't close properly, keeps reopening.", 
             category="lift", priority="urgent", status="in_progress", tower="B", residents_affected=12,
             resident_id=residents[2].id, assigned_staff_id=staff_list[4].id,
             created_at=now - timedelta(days=3)),
        dict(title="Lift making noise Tower B", description="Loud grinding noise from lift motor in Tower B.", 
             category="lift", priority="normal", status="assigned", tower="B", residents_affected=10,
             resident_id=residents[0].id, assigned_staff_id=staff_list[4].id,
             created_at=now - timedelta(days=1)),
        # Open/active complaints
        dict(title="Power fluctuation in Tower C", description="Voltage fluctuation causing appliances to trip every evening.",
             category="electrical", priority="urgent", status="open", tower="C", residents_affected=25,
             resident_id=residents[1].id,
             created_at=now - timedelta(hours=18)),
        dict(title="Clogged drain outside Tower A", description="Main drain outside Tower A entrance is overflowing with dirty water.",
             category="plumbing", priority="emergency", status="in_progress", tower="A", residents_affected=40,
             resident_id=residents[3].id, assigned_staff_id=staff_list[1].id,
             created_at=now - timedelta(hours=6)),
        dict(title="Parking gate broken", description="The automatic parking gate is stuck open, security risk.",
             category="parking", priority="urgent", status="assigned", tower="A", residents_affected=50,
             resident_id=residents[4].id, assigned_staff_id=staff_list[2].id,
             created_at=now - timedelta(hours=12)),
        dict(title="Common area cleaning needed", description="Common area on 3rd floor has not been cleaned in 2 days.",
             category="cleaning", priority="low", status="open", tower="C", residents_affected=5,
             resident_id=residents[1].id,
             created_at=now - timedelta(days=2)),
        # Overdue complaint
        dict(title="Leaking water pipe main road", description="Water pipe burst near main building entrance. Urgent repair needed.",
             category="water", priority="emergency", status="open", tower="A", residents_affected=100,
             resident_id=residents[3].id,
             created_at=now - timedelta(days=5),
             due_date=now - timedelta(days=4),  # already past due
             is_overdue=True),
        dict(title="Internet cable damaged", description="Underground internet cable damaged during road repair work.",
             category="internet", priority="normal", status="in_progress", tower="B", residents_affected=8,
             resident_id=residents[2].id, assigned_staff_id=staff_list[2].id,
             created_at=now - timedelta(days=4)),
    ]

    created_complaints = []
    for i, c_data in enumerate(complaints_data):
        extra = {k: v for k, v in c_data.items() if k in [
            "created_at", "resolved_at", "due_date", "is_overdue"
        ]}
        base = {k: v for k, v in c_data.items() if k not in extra}
        
        year = (extra.get("created_at") or now).year
        complaint = Complaint(
            complaint_id=f"CMP-{year}-{i+1:04d}",
            recommended_priority=base.get("priority", "normal"),
            due_date=extra.get("due_date") or (extra.get("created_at", now) + timedelta(hours=48)),
            is_overdue=extra.get("is_overdue", False),
            **{k: v for k, v in base.items()},
        )
        # Set created_at manually
        db.add(complaint)
        db.flush()
        if "created_at" in extra:
            db.execute(
                Complaint.__table__.update().where(Complaint.id == complaint.id).values(created_at=extra["created_at"])
            )
        if "resolved_at" in extra:
            complaint.resolved_at = extra["resolved_at"]
        created_complaints.append(complaint)

    db.commit()
    for c in created_complaints:
        db.refresh(c)
    print(f"Created {len(created_complaints)} complaints.")

    # --- Feedback ---
    feedbacks = [
        Feedback(complaint_id=created_complaints[0].id, resident_id=residents[0].id, rating=5, comment="Very quick response! Thanks."),
        Feedback(complaint_id=created_complaints[1].id, resident_id=residents[0].id, rating=4, comment="Good work, took little longer than expected."),
        Feedback(complaint_id=created_complaints[2].id, resident_id=residents[3].id, rating=3, comment="Average response time."),
        Feedback(complaint_id=created_complaints[3].id, resident_id=residents[1].id, rating=5, comment="Excellent service!"),
    ]
    db.add_all(feedbacks)
    db.commit()
    print(f"Created {len(feedbacks)} feedbacks.")

    # --- Notices ---
    notices = [
        Notice(title="Water Supply Maintenance", content="Water supply will be interrupted on August 22 from 10 AM to 2 PM due to tank cleaning. Please store water accordingly.", 
               category="maintenance", is_pinned=True, created_by_id=admin.id),
        Notice(title="Annual General Meeting", content="The Annual General Meeting of residents will be held on August 25 at 7 PM in the community hall. All residents are requested to attend.", 
               category="event", is_pinned=False, created_by_id=admin.id),
        Notice(title="New Parking Rules", content="Effective September 1, all residents must display the new parking sticker issued by the office. Vehicles without stickers will be fined.", 
               category="general", is_pinned=True, created_by_id=admin.id),
        Notice(title="EMERGENCY: Gas Leak Detected", content="A minor gas leak has been detected in the C wing kitchen area. Residents of C wing please ventilate your kitchens and avoid using gas until further notice.", 
               category="emergency", is_pinned=True, created_by_id=admin.id),
        Notice(title="Diwali Celebration", content="Society Diwali celebration on October 31 at 6 PM in the garden area. All residents welcome. Please participate in the rangoli competition!", 
               category="event", is_pinned=False, created_by_id=admin.id),
    ]
    db.add_all(notices)
    db.commit()
    print(f"Created {len(notices)} notices.")

    # --- In-app Notifications ---
    notifs = [
        Notification(user_id=residents[0].id, title="Complaint Registered — CMP-2024-0001", message="Your complaint 'Lift not working in Tower B' has been successfully registered.", type="success", is_read=True),
        Notification(user_id=residents[0].id, title="Status Update — CMP-2024-0001", message="Your complaint has been resolved!", type="success", is_read=True),
        Notification(user_id=residents[0].id, title="Status Update — CMP-2024-0005", message="Your complaint 'Lift door sensor malfunction' is now in progress.", type="info", is_read=False),
        Notification(user_id=residents[1].id, title="Complaint Registered — CMP-2024-0004", message="Your complaint 'Garbage not collected' has been received.", type="success", is_read=True),
        Notification(user_id=residents[1].id, title="New Notice: EMERGENCY: Gas Leak", message="A minor gas leak has been detected in the C wing kitchen area.", type="error", is_read=False),
        Notification(user_id=residents[3].id, title="⚠️ Overdue — CMP-2024-0011", message="Your complaint 'Leaking water pipe main road' is overdue and has been escalated.", type="error", is_read=False),
        Notification(user_id=residents[2].id, title="Status Update — CMP-2024-0012", message="Work has started on your complaint 'Internet cable damaged'.", type="info", is_read=False),
    ]
    db.add_all(notifs)
    db.commit()
    print(f"Created {len(notifs)} notifications.")

    # --- Amenities ---
    amenities = [
        Amenity(
            name="Tennis Court",
            description="Outdoor court in Tower A. Exclusive booking (capacity = 1).",
            hourly_fee=10.0,
            max_daily_hours_per_flat=2,
            capacity=1
        ),
        Amenity(
            name="Clubhouse Hall",
            description="Air-conditioned party hall for special family gatherings.",
            hourly_fee=25.0,
            max_daily_hours_per_flat=4,
            capacity=1
        ),
        Amenity(
            name="Gym slots",
            description="Equipped gym. Up to 5 residents can book concurrently.",
            hourly_fee=0.0,
            max_daily_hours_per_flat=2,
            capacity=5
        ),
        Amenity(
            name="Swimming Pool",
            description="Community outdoor swimming pool. Up to 10 slots per hour concurrent limit.",
            hourly_fee=5.0,
            max_daily_hours_per_flat=2,
            capacity=10
        ),
    ]
    db.add_all(amenities)
    db.commit()
    for a in amenities:
        db.refresh(a)
    print(f"Created {len(amenities)} amenities.")

    # --- Bookings ---
    # We will seed future bookings (for tomorrow)
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    
    dt1_start = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0).replace(tzinfo=None)
    dt1_end = tomorrow.replace(hour=11, minute=0, second=0, microsecond=0).replace(tzinfo=None)
    
    dt2_start = tomorrow.replace(hour=9, minute=0, second=0, microsecond=0).replace(tzinfo=None)
    dt2_end = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0).replace(tzinfo=None)
    
    dt3_start = tomorrow.replace(hour=9, minute=30, second=0, microsecond=0).replace(tzinfo=None)
    dt3_end = tomorrow.replace(hour=10, minute=30, second=0, microsecond=0).replace(tzinfo=None)
    
    bookings = [
        Booking(
            amenity_id=amenities[0].id,
            resident_id=residents[0].id,
            start_time=dt1_start,
            end_time=dt1_end,
            total_fee=10.0,
            status="approved"
        ),
        Booking(
            amenity_id=amenities[2].id,
            resident_id=residents[1].id,
            start_time=dt2_start,
            end_time=dt2_end,
            total_fee=0.0,
            status="approved"
        ),
        Booking(
            amenity_id=amenities[2].id,
            resident_id=residents[2].id,
            start_time=dt3_start,
            end_time=dt3_end,
            total_fee=0.0,
            status="approved"
        ),
    ]
    db.add_all(bookings)
    db.commit()
    print(f"Created {len(bookings)} bookings.")

    # --- Visitor Passes ---
    v_now = datetime.now(timezone.utc).replace(tzinfo=None)
    visitor_passes = [
        VisitorPass(
            pass_code="VP-849201",
            visitor_name="Vikram Seth",
            visitor_phone="9876543210",
            visitor_type="guest",
            purpose="Family Dinner",
            vehicle_number="MH-02-AB-1234",
            resident_id=residents[0].id,
            flat_number="B-204",
            tower="B",
            valid_from=v_now - timedelta(hours=1),
            valid_until=v_now + timedelta(hours=23),
            status="checked_in",
            entry_time=v_now - timedelta(minutes=45),
        ),
        VisitorPass(
            pass_code="VP-302914",
            visitor_name="Amazon Delivery",
            visitor_phone="9812345678",
            visitor_type="delivery",
            purpose="Parcel Package",
            resident_id=residents[1].id,
            flat_number="C-105",
            tower="C",
            valid_from=v_now,
            valid_until=v_now + timedelta(hours=12),
            status="approved",
        ),
        VisitorPass(
            pass_code="VP-592810",
            visitor_name="Sunita Electrician",
            visitor_phone="9899887766",
            visitor_type="service",
            purpose="AC Maintenance",
            vehicle_number="KA-05-MN-9988",
            resident_id=residents[2].id,
            flat_number="B-301",
            tower="B",
            valid_from=v_now - timedelta(hours=5),
            valid_until=v_now + timedelta(hours=19),
            status="checked_out",
            entry_time=v_now - timedelta(hours=4),
            exit_time=v_now - timedelta(hours=2),
        ),
        VisitorPass(
            pass_code="VP-102938",
            visitor_name="Uber Driver - Cab",
            visitor_phone="9711223344",
            visitor_type="cab",
            purpose="Airport Drop Pickup",
            resident_id=residents[0].id,
            flat_number="B-204",
            tower="B",
            valid_from=v_now,
            valid_until=v_now + timedelta(hours=4),
            status="approved",
        ),
    ]
    db.add_all(visitor_passes)
    db.commit()
    print(f"Created {len(visitor_passes)} visitor passes.")

    db.close()
    print("\n[SUCCESS] Seed complete!")

    print("\nDemo credentials:")
    print("  Admin:      admin@society.com       / Admin@123")
    print("  Resident 1: resident1@society.com   / Resident@123")
    print("  Resident 2: resident2@society.com   / Resident@123")
    print("  Resident 3: resident3@society.com   / Resident@123")
    print("\nRun the API: cd backend && uvicorn app.main:app --reload")


if __name__ == "__main__":
    seed()
