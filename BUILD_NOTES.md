# BUILD NOTES — Vendor Collection CRM

**Built:** 05 May 2026  |  **Status:** Complete, builds clean

---

## What Was Built

80 files total across backend + frontend.

### Backend (Node.js + Express + PostgreSQL)
| Layer | Files |
|---|---|
| Entry | server.js |
| Config | db.js (pg Pool), env.js |
| Middleware | auth.js (JWT), requireRole.js, errorHandler.js, validate.js |
| Routes | auth, vendors, bills, collections, collectors, dashboard, audit |
| Controllers | auth, vendors, bills, collections, collectors, dashboard, audit |
| Services | alert.service.js, balance.service.js |
| Validators | auth, vendor, bill, collection |
| Database | schema.sql, seed.sql, scripts/seed.js |

### Frontend (React + Vite + Tailwind)
| Layer | Files |
|---|---|
| Foundation | App.jsx, main.jsx, index.css |
| API Layer | axios.js + 7 api files |
| Context | AuthContext.jsx |
| Shared Components | Layout, Sidebar, AlertBadge, LoadingSpinner, ConfirmModal, Toast |
| Admin Components | KPICards, MonthlyChart, DailyCollectionTable, VendorOutstandingTable |
| Pages | Login, Dashboard, Vendors, Bills, Payments, Collectors, Audit |
| Collector Pages | CollectorVendorsPage, CollectPage |

---

## To Run the Project

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Setup the Database
```bash
createdb vendor_crm
psql -U <your_pg_user> -d vendor_crm -f backend/database/schema.sql
```

### 2. Configure Backend
```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET
npm install
node scripts/seed.js   # seeds admin + 2 collectors + sample vendors
npm run dev            # starts on port 5000
```

### 3. Run Frontend
```bash
cd frontend
npm install
npm run dev            # starts on port 5173
```

### 4. Open the App
```
http://localhost:5173
```

---

## Login Credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@crm.com | Admin@123 |
| Collector | collector1@crm.com | Collect@123 |
| Collector | collector2@crm.com | Collect@123 |

---

## Design System

- **Font:** Inter (Google Fonts)
- **Sidebar:** slate-900 dark, 256px fixed
- **Accent:** indigo-600 / purple-600 gradient
- **Alert CRIT:** red-500 with animated pulse dot
- **Alert WARN:** amber-500 with animated dot
- **Icons:** Lucide React
- **Charts:** Recharts (BarChart, custom tooltip)

---

## Build Status

| Check | Result |
|---|---|
| Backend node --check (all files) | PASS |
| Frontend vite build | PASS (0 errors) |
| Bundle size warning | Expected (Recharts + RR6) |
