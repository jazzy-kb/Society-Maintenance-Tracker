# 🏢 Society Maintenance Tracker

A full-stack platform for apartment societies to manage maintenance complaints, amenity bookings, visitor gate passes, notice boards, and resident communications — with admin analytics, AI chatbot, and automated workflows.

Built with **FastAPI** (Python) + **React** (TypeScript) + **SQLite**.



> ### 🌐 Live Demo
>
> | | URL |
> |---|---|
> | **Frontend** | https://society-maintenance-tracker-front.onrender.com|
> | **Backend API** | [`https://society-tracker-api.onrender.com`](https://society-tracker-api.onrender.com/docs) |
>
> **Demo Credentials:** Admin — `admin@society.com` / `Admin@123` · Resident — `resident1@society.com` / `Resident@123`

---

## 📸 Features at a Glance

### 🔧 Complaint Management System
- Residents raise complaints with category, description, priority, and optional photo upload
- Unique complaint IDs (e.g., `CMP-2026-0001`) for tracking
- Full status workflow: `Pending → In Progress → Resolved → Closed`
- Admin assigns priority, adds notes, and manages resolution
- Residents submit satisfaction feedback (1–5 star rating) after resolution
- Complete status history timeline for every complaint
- Email notifications on status changes (configurable SMTP or mock mode)

### 🏊 Amenity Booking & Autonomous Allotment
- Admin creates and configures amenities (Pool, Gym, Tennis Court, etc.) with operating hours, capacity, and hourly fees
- **Operating Hours Enforcement**: Bookings outside `open_time` – `close_time` are automatically rejected
- **Autonomous Auto-Approval**: If no slot clash exists, bookings are instantly approved without admin intervention
- **Clash Detection & Flagging**: Overlapping bookings are flagged with `flagged_conflict` status for admin review
- **30-Day Performance Analytics**: Utilization rates, daily booking trends, and per-amenity statistics
- **Amenity Data Logs**: Full audit trail of every booking action (created, approved, cancelled, flagged)

### 🚪 Digital Visitor Passes & Gate Security
- Residents generate 6-digit gate access codes (`VP-XXXXXX`) for visitors
- **5 Visitor Categories**: Guest, Service Technician, Daily Help, Delivery, Cab
- **Fixed Pass Limits Per Flat Per Day**:

  | Category | Daily Limit |
  |----------|-------------|
  | Guest / Relative | Max 3 / day |
  | Service Technician | Max 2 / day |
  | Daily Help (Maid/Cook) | Max 2 active concurrent |
  | Delivery Agent | Max 5 / day |
  | Cab / Taxi | Max 5 / day |

- **Live Quota Status API & Dashboard**: Real-time used/remaining counters for all categories
- **Multi-Month Daily Help Passes**: 1 Month, 2 Months, or 6 Months validity
- Pass verification, check-in/check-out flow for gate security
- One-click share pass code via WhatsApp/SMS
- Pass history with delete capability

### 📋 Notice Board
- Admin publishes society notices (maintenance, events, rules, emergency)
- Pin important notices to the top
- Broadcast notifications to all residents on new notice

### 🤖 AI Chatbot Concierge
- **Resident intents**: Auto-file complaints, generate visitor passes, track complaint status, emergency SOS
- **Admin intents**: Society health score queries, last month complaints analytics
- Natural language processing with keyword-based intent detection

### 👤 Resident Profile & Critical Detail Verification
- Dedicated profile page for viewing and editing personal details
- **2-Step Verification Workflow** for critical changes (Flat Number, Tower, Phone):
  1. Resident submits change → Admin receives alert with old vs. new comparison
  2. Admin sends verification prompt → Resident confirms → Details officially updated
- Full audit log of all profile changes

### 📊 Admin Dashboard & Deep Analytics
- **Society Health Score**: Composite metric based on resolution rates, SLA compliance, and satisfaction
- **30-Day Complaint Trends**: Line charts, category breakdowns, tower-wise distribution
- **SLA Compliance Tracking**: Configurable SLA timers per priority level with warning thresholds
- **Recurring Issue Detection**: Identifies repeat complaint patterns by category and location
- **Priority Distribution**: Visual breakdown of urgent/high/normal/low complaints
- **Audit Logs**: Complete trail of all admin and system actions

### 🔔 Notifications & Automation
- Real-time in-app notifications for status updates, visitor arrivals, admin alerts
- **90-Day Auto-Pruning**: Background scheduler automatically deletes notifications older than 3 months
- **SLA Overdue Checker**: Runs every 15 minutes to flag overdue complaints
- Mark read, mark all read, unread count badge

### 👨‍💼 Staff Management
- Admin manages maintenance staff with department, availability, and contact info
- Full CRUD operations for staff records

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.12, FastAPI 0.111, SQLAlchemy 2.0, Pydantic 2.7 |
| **Frontend** | React 18, TypeScript 5.6, Vite 5.4, Tailwind CSS 3.4 |
| **Database** | SQLite (dev) / PostgreSQL (production-ready) |
| **Auth** | JWT (HS256) via python-jose + passlib bcrypt |
| **State** | Zustand 5.0 |
| **Charts** | Recharts 2.13 |
| **Icons** | Lucide React |
| **HTTP** | Axios (frontend), HTTPX (backend) |
| **Scheduler** | APScheduler (background SLA checks & notification cleanup) |
| **Email** | SMTP (configurable) with mock mode for development |

---

## 📁 Project Structure

```
Society-Maintenance-Tracker/
├── backend/
│   ├── app/
│   │   ├── api/v1/              # API route handlers
│   │   │   ├── auth.py          # Login, register, profile requests
│   │   │   ├── complaints.py    # Complaint CRUD & feedback
│   │   │   ├── bookings.py      # Amenity bookings & analytics
│   │   │   ├── visitors.py      # Visitor passes & quota system
│   │   │   ├── chatbot.py       # AI chatbot concierge
│   │   │   ├── admin.py         # Admin dashboard & profile reviews
│   │   │   ├── notifications.py # Notification management
│   │   │   ├── notices.py       # Notice board CRUD
│   │   │   ├── staff.py         # Staff management
│   │   │   └── settings.py      # SLA configuration
│   │   ├── models/              # SQLAlchemy ORM models
│   │   │   ├── user.py          # User (Resident/Admin)
│   │   │   ├── complaint.py     # Complaints & feedback
│   │   │   ├── amenity.py       # Amenities with operating hours
│   │   │   ├── booking.py       # Bookings with clash detection
│   │   │   ├── visitor.py       # Visitor passes
│   │   │   ├── notification.py  # In-app notifications
│   │   │   ├── notice.py        # Society notices
│   │   │   ├── staff.py         # Maintenance staff
│   │   │   ├── audit_log.py     # Audit trail
│   │   │   ├── sla_setting.py   # SLA configuration
│   │   │   └── profile_request.py # Profile change requests
│   │   ├── schemas/             # Pydantic request/response models
│   │   ├── services/            # Business logic layer
│   │   │   ├── analytics_service.py
│   │   │   ├── complaint_service.py
│   │   │   ├── email_service.py
│   │   │   ├── health_score_service.py
│   │   │   ├── notification_service.py
│   │   │   ├── recurring_service.py
│   │   │   └── sla_service.py
│   │   └── core/                # Config, DB, auth, security
│   ├── seed.py                  # Database seeder with sample data
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/            # Login, Register
│   │   │   ├── resident/        # Dashboard, Complaints, Bookings,
│   │   │   │                    # Visitor Passes, Notices, Profile
│   │   │   ├── admin/           # Dashboard, Analytics, Complaint Mgmt,
│   │   │   │                    # Booking Mgmt, Visitor Logs, Staff,
│   │   │   │                    # Notices, Settings, Audit Log
│   │   │   └── Landing.tsx
│   │   ├── components/
│   │   │   ├── layout/          # AppLayout, Header, Sidebar
│   │   │   ├── chat/            # ChatbotWidget
│   │   │   └── ui/              # Reusable UI components
│   │   ├── api/                 # Axios client config
│   │   ├── store/               # Zustand auth store
│   │   ├── types/               # TypeScript interfaces
│   │   └── App.tsx              # Route definitions
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Python** 3.10+ ([Download](https://www.python.org/downloads/))
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))

### 1. Clone the Repository

```bash
git clone https://github.com/jazzy-kb/Society-Maintenance-Tracker.git
cd Society-Maintenance-Tracker
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings (defaults work for development)

# Seed database with sample data (creates admin + resident accounts)
python seed.py

# Start the backend server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`.

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### 4. Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@society.com` | `Admin@123` |
| **Resident** | `resident1@society.com` | `Resident@123` |

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Application
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Database (SQLite for dev, PostgreSQL for production)
DATABASE_URL=sqlite:///./society_tracker.db
# DATABASE_URL=postgresql://user:password@localhost:5432/society_tracker

# CORS
FRONTEND_URL=http://localhost:5173

# Email (set MOCK_EMAIL=true to log emails to console)
MOCK_EMAIL=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@society.com
FROM_NAME=Society Maintenance Tracker

# File Storage
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=5
```

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Register new resident |
| `POST` | `/api/v1/auth/login` | Login (returns JWT) |
| `GET` | `/api/v1/auth/me` | Get current user profile |
| `POST` | `/api/v1/auth/profile-request` | Submit profile change request |

### Complaints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/complaints` | List complaints |
| `POST` | `/api/v1/complaints` | Create complaint (with photo upload) |
| `GET` | `/api/v1/complaints/{id}` | Get complaint detail with history |
| `PATCH` | `/api/v1/complaints/{id}` | Update status/priority (admin) |
| `POST` | `/api/v1/complaints/{id}/feedback` | Submit resolution feedback |

### Amenity Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/bookings/amenities` | List all amenities |
| `POST` | `/api/v1/bookings/amenities` | Create amenity (admin) |
| `POST` | `/api/v1/bookings` | Book a slot (auto-approved or flagged) |
| `PUT` | `/api/v1/bookings/{id}/cancel` | Cancel booking |
| `PUT` | `/api/v1/bookings/{id}/approve` | Approve flagged booking (admin) |
| `GET` | `/api/v1/bookings/analytics-30d` | 30-day booking analytics |
| `GET` | `/api/v1/bookings/logs` | Amenity data logs |

### Visitor Passes
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/visitors/passes` | Create visitor pass |
| `GET` | `/api/v1/visitors/my-passes` | List my passes |
| `GET` | `/api/v1/visitors/quota-status` | Live quota usage per category |
| `POST` | `/api/v1/visitors/verify` | Verify pass code (gate security) |
| `POST` | `/api/v1/visitors/check-in/{id}` | Check-in visitor |
| `POST` | `/api/v1/visitors/check-out/{id}` | Check-out visitor |
| `DELETE` | `/api/v1/visitors/passes/{id}` | Delete pass history |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/dashboard` | Dashboard with health score & stats |
| `GET` | `/api/v1/admin/analytics` | Deep analytics (trends, categories) |
| `GET` | `/api/v1/admin/recurring-issues` | Detect recurring complaint patterns |
| `GET` | `/api/v1/admin/health-score` | Society health score |
| `GET` | `/api/v1/admin/audit-logs` | Full audit trail |
| `GET` | `/api/v1/admin/residents` | List all residents |

### Chatbot
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/chatbot/message` | AI chatbot (complaints, passes, status, SOS) |

> 📖 Full interactive API documentation available at `http://localhost:8000/docs`

---

## 🧪 Running Tests

```bash
# From the project root
python backend/venv/Scripts/python test_api.py
```

The test suite covers 16 comprehensive test categories including authentication, complaints workflow, amenity bookings with clash detection, visitor pass quotas, profile verification, chatbot intents, and more.

---

## 🏗️ Architecture

```
┌─────────────────┐         ┌─────────────────┐
│                 │  HTTP    │                 │
│   React SPA     │◄───────►│   FastAPI        │
│   (Vite + TS)   │  REST   │   Backend        │
│                 │  JSON   │                 │
└─────────────────┘         └────────┬────────┘
                                     │
                            ┌────────▼────────┐
                            │                 │
                            │   SQLite /       │
                            │   PostgreSQL     │
                            │                 │
                            └─────────────────┘

Background Jobs (APScheduler):
  • SLA Overdue Check ─── every 15 minutes
  • Notification Cleanup ─ every 24 hours (deletes 90+ day old)
```

---

## 🔐 Authentication & Authorization

- **JWT-based authentication** with HS256 signing
- **Role-based access control**: `admin` and `resident` roles
- Protected routes with dependency injection (`get_current_user`, `get_current_admin`)
- Token expiry configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`
- Passwords hashed with **bcrypt**

---

## 🌍 Free Deployment (Get Your Live Link)

Deploy the app for free using **Render** (backend) + **Vercel** (frontend). Both have generous free tiers.

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/jazzy-kb/Society-Maintenance-Tracker.git
git branch -M main
git push -u origin main
```

### Step 2 — Deploy Backend on Render (Free)

1. Go to [render.com](https://render.com) → Sign up with GitHub
2. Click **New → Web Service**
3. Connect your `Society-Maintenance-Tracker` repository
4. Configure:

   | Setting | Value |
   |---------|-------|
   | **Name** | `society-tracker-api` |
   | **Root Directory** | `backend` |
   | **Runtime** | `Python 3` |
   | **Build Command** | `chmod +x build.sh && ./build.sh` |
   | **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

5. Add these **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `SECRET_KEY` | *(click Generate)* |
   | `ALGORITHM` | `HS256` |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` |
   | `DATABASE_URL` | `sqlite:///./society_tracker.db` |
   | `MOCK_EMAIL` | `true` |
   | `UPLOAD_DIR` | `uploads` |
   | `MAX_FILE_SIZE_MB` | `5` |
   | `FRONTEND_URL` | *(add after Step 3 — your Vercel URL)* |

6. Click **Create Web Service** → wait for deploy
7. Your backend API will be live at `https://society-tracker-api.onrender.com`

### Step 3 — Deploy Frontend on Vercel (Free)

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **Add New → Project** → Import your `Society-Maintenance-Tracker` repo
3. Configure:

   | Setting | Value |
   |---------|-------|
   | **Root Directory** | `frontend` |
   | **Framework Preset** | `Vite` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |

4. Add this **Environment Variable**:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://society-tracker-api.onrender.com/api/v1` |

5. Click **Deploy** → wait for build
6. Your frontend will be live at `https://society-maintenance-tracker.vercel.app`

### Step 4 — Link Them Together

1. Go back to **Render** → your backend service → **Environment**
2. Set `FRONTEND_URL` = your Vercel URL (e.g. `https://society-maintenance-tracker.vercel.app`)
3. Render will auto-redeploy

### Step 5 — Add the Live Link to GitHub

1. Go to your GitHub repo → click the ⚙️ gear icon next to **About**
2. Paste your Vercel URL in the **Website** field
3. Now anyone opening your repo sees the live link at the top!

> **💡 Tip:** After deploying, update the demo URLs in this README to match your actual deployed URLs.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👨‍💻 Author

Built as a comprehensive society management solution demonstrating full-stack development with modern technologies.

---

<p align="center">
  <b>⭐ Star this repo if you found it useful!</b>
</p>
