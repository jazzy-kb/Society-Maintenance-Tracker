from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# SQLite needs check_same_thread=False
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def create_tables():
    from app.models import user, complaint, staff, notice, notification, audit_log, sla_setting, amenity, booking, visitor, profile_request  # noqa
    Base.metadata.create_all(bind=engine)

    # Safe lightweight schema auto-migration for SQLite
    if settings.DATABASE_URL.startswith("sqlite"):
        with engine.begin() as conn:
            try:
                # Bookings columns
                b_res = conn.exec_driver_sql("PRAGMA table_info(bookings)").fetchall()
                b_cols = [row[1] for row in b_res]
                if "is_flagged" not in b_cols:
                    conn.exec_driver_sql("ALTER TABLE bookings ADD COLUMN is_flagged BOOLEAN DEFAULT 0")
                if "conflict_note" not in b_cols:
                    conn.exec_driver_sql("ALTER TABLE bookings ADD COLUMN conflict_note VARCHAR(300)")
                if "auto_allotted" not in b_cols:
                    conn.exec_driver_sql("ALTER TABLE bookings ADD COLUMN auto_allotted BOOLEAN DEFAULT 1")

                # Amenities columns
                a_res = conn.exec_driver_sql("PRAGMA table_info(amenities)").fetchall()
                a_cols = [row[1] for row in a_res]
                if "open_time" not in a_cols:
                    conn.exec_driver_sql("ALTER TABLE amenities ADD COLUMN open_time VARCHAR(10) DEFAULT '06:00'")
                if "close_time" not in a_cols:
                    conn.exec_driver_sql("ALTER TABLE amenities ADD COLUMN close_time VARCHAR(10) DEFAULT '22:00'")
            except Exception as e:
                print(f"Migration notice: {e}")


# Run on startup
create_tables()

