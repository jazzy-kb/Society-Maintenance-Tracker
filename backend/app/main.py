from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
import os
import logging

from app.core.config import settings
from app.core.database import create_tables, SessionLocal
from app.api.v1 import auth, complaints, notifications, notices, staff, admin, settings as settings_router, bookings, visitors, chatbot
from app.services.sla_service import check_overdue_complaints

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def run_overdue_check():
    db = SessionLocal()
    try:
        check_overdue_complaints(db)
    finally:
        db.close()


def run_notification_cleanup():
    from app.services.notification_service import cleanup_old_notifications
    db = SessionLocal()
    try:
        purged = cleanup_old_notifications(db, days=90)
        if purged > 0:
            logger.info(f"Auto-deleted {purged} notifications older than 90 days (3 months)")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up Society Maintenance Tracker API...")
    create_tables()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # Start background scheduler for SLA overdue checks every 15 minutes & notification cleanup daily
    scheduler.add_job(run_overdue_check, "interval", minutes=15, id="sla_check")
    scheduler.add_job(run_notification_cleanup, "interval", hours=24, id="notif_cleanup")
    scheduler.start()
    logger.info("Background SLA checker (every 15 min) and 90-day Notification cleanup (daily) started")
    
    # Run once on startup
    run_overdue_check()
    run_notification_cleanup()
    
    yield
    
    # Shutdown
    scheduler.shutdown()
    logger.info("Shutting down...")


app = FastAPI(
    title="Society Maintenance Tracker API",
    description="Production-quality society maintenance management platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(complaints.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(notices.router, prefix="/api/v1")
app.include_router(staff.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(settings_router.router, prefix="/api/v1")
app.include_router(bookings.router, prefix="/api/v1")
app.include_router(visitors.router, prefix="/api/v1")
app.include_router(chatbot.router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "message": "Society Maintenance Tracker API",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
