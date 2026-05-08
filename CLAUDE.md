# VENDOR COLLECTION CRM — MASTER PROJECT GRAPH

> This file is the single source of truth. Every requirement, schema, route, component, rule, and connection is here. Never ask the user to re-explain the project — read this first.

---

## STACK

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React.js (Vite), React Router v6  |
| Backend  | Node.js + Express.js              |
| Database | PostgreSQL (raw SQL or Knex.js)   |
| Auth     | JWT (jsonwebtoken + bcryptjs)     |
| Charts   | Recharts                          |
| Forms    | React Hook Form                   |
| HTTP     | Axios + TanStack Query (v5)       |
| Styles   | Tailwind CSS                      |

---

## ROLES

```
SUPER ADMIN (1)
  └── Full access to everything

COLLECTOR (many)
  └── Login
  └── View all vendors + bills (with alert flags)
  └── Submit collection update (amount + date + notes)
  └── Cannot: edit, delete, confirm, generate bills, view dashboard
```

---

## DATABASE SCHEMA

### TABLE: users
```
id            SERIAL PRIMARY KEY
name          VARCHAR(150) NOT NULL
email         VARCHAR(255) UNIQUE NOT NULL
password_hash TEXT NOT NULL
role          ENUM('ADMIN','COLLECTOR') NOT NULL
is_active     BOOLEAN DEFAULT true
created_at    TIMESTAMP DEFAULT NOW()
```

### TABLE: vendors
```
id             SERIAL PRIMARY KEY
name           VARCHAR(200) NOT NULL
contact_person VARCHAR(150)
phone          VARCHAR(20)
address        TEXT
is_active      BOOLEAN DEFAULT true
created_by     INT REFERENCES users(id)
created_at     TIMESTAMP DEFAULT NOW()
```

### TABLE: bills
```
id             SERIAL PRIMARY KEY
vendor_id      INT REFERENCES vendors(id) NOT NULL
amount         NUMERIC(12,2) NOT NULL
generated_date DATE NOT NULL
status         ENUM('ACTIVE','PAID','CANCELLED') DEFAULT 'ACTIVE'
generated_by   INT REFERENCES users(id)
created_at     TIMESTAMP DEFAULT NOW()
```
> CONSTRAINT: vendor can have only ONE bill where status='ACTIVE' at a time (enforced in API + partial unique index)

### TABLE: collections
```
id               SERIAL PRIMARY KEY
bill_id          INT REFERENCES bills(id) NOT NULL
vendor_id        INT REFERENCES vendors(id) NOT NULL
collector_id     INT REFERENCES users(id) NOT NULL
amount           NUMERIC(12,2) NOT NULL
collection_date  DATE NOT NULL
notes            TEXT
status           ENUM('PENDING','CONFIRMED','REJECTED') DEFAULT 'PENDING'
rejection_reason TEXT
submitted_at     TIMESTAMP DEFAULT NOW()
confirmed_at     TIMESTAMP
confirmed_by     INT REFERENCES users(id)
```

### TABLE: audit_logs
```
id          SERIAL PRIMARY KEY
user_id     INT REFERENCES users(id)
action      VARCHAR(100) NOT NULL
entity_type VARCHAR(50)
entity_id   INT
details     JSONB
created_at  TIMESTAMP DEFAULT NOW()
```

### KEY RELATIONSHIPS
```
vendors ──< bills          (1 vendor → many bills, only 1 ACTIVE)
bills   ──< collections    (1 bill → many collection attempts)
users   ──< bills          (generated_by)
users   ──< collections    (collector_id, confirmed_by)
users   ──< audit_logs     (who did what)
vendors ──< collections    (denormalized for query speed)
```

### OUTSTANDING BALANCE FORMULA
```
outstanding = bill.amount - SUM(collections WHERE bill_id=X AND status='CONFIRMED')

IF outstanding <= 0  →  UPDATE bills SET status='PAID'
```

### ALERT FLAG LOGIC
```
days = TODAY - bill.generated_date

status='PAID'          →  DONE  (green)
days  0–6              →  OK    (no flag)
days  7–14             →  WARN  (yellow)
days  15+              →  CRIT  (red)
```
> Calculated at query time, not stored. Run in a shared util on both backend (API response field) and frontend (display).

---

## BACKEND STRUCTURE

```
/backend
  server.js                   ← Express app entry, middleware setup
  /src
    /config
      db.js                   ← pg Pool connection
      env.js                  ← dotenv validation
    /middleware
      auth.js                 ← JWT verify → req.user
      requireRole.js          ← requireRole('ADMIN') guard
      errorHandler.js         ← global error handler
      validate.js             ← express-validator wrapper
    /routes
      auth.routes.js
      vendors.routes.js
      bills.routes.js
      collections.routes.js
      collectors.routes.js
      dashboard.routes.js
      audit.routes.js
    /controllers
      auth.controller.js
      vendors.controller.js
      bills.controller.js
      collections.controller.js
      collectors.controller.js
      dashboard.controller.js
      audit.controller.js
    /services
      alert.service.js        ← getAlertFlag(generated_date, status)
      balance.service.js      ← recalcOutstanding(bill_id), markPaidIfZero(bill_id)
    /validators
      auth.validator.js
      vendor.validator.js
      bill.validator.js
      collection.validator.js
  package.json
  .env
```

---

## API ENDPOINTS

All routes prefixed `/api`. Auth header: `Authorization: Bearer <jwt>`

### AUTH
```
POST   /api/auth/login          → { token, user }         PUBLIC
POST   /api/auth/logout         → 200                      AUTH
GET    /api/auth/me             → user object              AUTH
```

### VENDORS
```
GET    /api/vendors             → list + active_bill + alert_flag    AUTH (both)
GET    /api/vendors/:id         → vendor + bill history              AUTH (both)
POST   /api/vendors             → create vendor                      ADMIN
PUT    /api/vendors/:id         → edit vendor                        ADMIN
DELETE /api/vendors/:id         → soft delete (is_active=false)      ADMIN
```

### BILLS
```
GET    /api/bills               → all bills (with vendor name + alert)   ADMIN
GET    /api/bills/:id           → bill detail + collections              ADMIN
POST   /api/bills               → generate new bill                      ADMIN
                                  RULE: reject if vendor has ACTIVE bill
PUT    /api/bills/:id/cancel    → set status=CANCELLED                   ADMIN
```

### COLLECTIONS
```
GET    /api/collections         → ADMIN: all | COLLECTOR: own             AUTH
POST   /api/collections         → submit collection (status=PENDING)      AUTH (both)
PUT    /api/collections/:id/confirm → approve → recalc balance → maybe PAID  ADMIN
PUT    /api/collections/:id/reject  → reject with reason                      ADMIN
```

### COLLECTORS (users with role=COLLECTOR)
```
GET    /api/collectors          → list collectors          ADMIN
POST   /api/collectors          → create collector         ADMIN
PUT    /api/collectors/:id      → edit collector           ADMIN
DELETE /api/collectors/:id      → soft delete              ADMIN
```

### DASHBOARD (ADMIN only)
```
GET    /api/dashboard/stats           → { total_billed, total_collected, outstanding, active_alerts }
GET    /api/dashboard/monthly-chart   → last 6 months { month, billed, collected }[]
GET    /api/dashboard/daily           → last 30 days { date, collected }[]
GET    /api/dashboard/vendor-table    → { vendor, billed, outstanding, alert_flag }[]
```

### AUDIT
```
GET    /api/audit               → paginated log of all actions     ADMIN
```

---

## FRONTEND STRUCTURE

```
/frontend
  index.html
  vite.config.js
  tailwind.config.js
  /src
    main.jsx
    App.jsx                     ← Router setup, QueryClientProvider, AuthProvider
    /api
      axios.js                  ← Axios instance, base URL, auth interceptor
      auth.api.js
      vendors.api.js
      bills.api.js
      collections.api.js
      collectors.api.js
      dashboard.api.js
    /context
      AuthContext.jsx            ← user state, login(), logout()
    /hooks
      useAuth.js
      useAlertFlag.js            ← returns { label, color } from days + status
    /utils
      alertUtils.js              ← getAlertFlag(generated_date, status)
      currency.js                ← formatINR(amount)
      date.js                   ← formatDate(), daysDiff()
    /components
      /shared
        ProtectedRoute.jsx       ← redirects if no auth or wrong role
        Navbar.jsx
        Sidebar.jsx
        AlertBadge.jsx           ← <AlertBadge flag="CRIT" />
        LoadingSpinner.jsx
        ConfirmModal.jsx
        ErrorMessage.jsx
      /admin
        KPICards.jsx
        MonthlyChart.jsx         ← Recharts BarChart
        DailyCollectionTable.jsx
        VendorOutstandingTable.jsx
        VendorForm.jsx
        CollectorForm.jsx
        BillGenerationForm.jsx
        PaymentConfirmQueue.jsx
        AuditLogTable.jsx
      /collector
        VendorBillList.jsx
        CollectionForm.jsx
    /pages
      /auth
        LoginPage.jsx
      /admin
        DashboardPage.jsx
        VendorsPage.jsx
        VendorDetailPage.jsx
        CollectorsPage.jsx
        BillsPage.jsx
        PaymentsPage.jsx
        AuditPage.jsx
      /collector
        CollectorVendorsPage.jsx
        CollectPage.jsx
    /routes
      adminRoutes.jsx            ← all /admin/* wrapped in ProtectedRoute role=ADMIN
      collectorRoutes.jsx        ← all /collector/* wrapped in ProtectedRoute role=COLLECTOR
```

---

## FRONTEND ROUTES MAP

```
/login                             → LoginPage (public)

/admin/dashboard                   → DashboardPage       [ADMIN]
/admin/vendors                     → VendorsPage          [ADMIN]
/admin/vendors/new                 → VendorDetailPage (create mode) [ADMIN]
/admin/vendors/:id/edit            → VendorDetailPage (edit mode)   [ADMIN]
/admin/collectors                  → CollectorsPage       [ADMIN]
/admin/bills                       → BillsPage            [ADMIN]
/admin/payments                    → PaymentsPage         [ADMIN]
/admin/audit                       → AuditPage            [ADMIN]

/collector/vendors                 → CollectorVendorsPage [COLLECTOR]
/collector/collect                 → CollectPage          [COLLECTOR]

/                                  → redirect based on role
*                                  → 404 or redirect to login
```

---

## PAGE → API → DB CONNECTION MAP

```
LoginPage
  └── POST /api/auth/login → users table → returns JWT

DashboardPage
  ├── GET /api/dashboard/stats        → SUM queries on bills + collections
  ├── GET /api/dashboard/monthly-chart → GROUP BY month on bills + collections
  ├── GET /api/dashboard/daily        → GROUP BY date on collections (CONFIRMED)
  └── GET /api/dashboard/vendor-table → vendors JOIN bills JOIN collections

VendorsPage
  ├── GET /api/vendors                → vendors + active bill + alert_flag
  ├── POST /api/vendors               → INSERT vendors
  └── PUT /api/vendors/:id            → UPDATE vendors

BillsPage
  ├── GET /api/bills                  → bills JOIN vendors
  └── POST /api/bills                 → INSERT bills (RULE 1 checked here)

PaymentsPage (Confirmation Queue)
  ├── GET /api/collections?status=PENDING   → collections JOIN vendors JOIN users
  ├── PUT /api/collections/:id/confirm      → UPDATE collections → recalc balance → maybe PAID
  └── PUT /api/collections/:id/reject       → UPDATE collections status=REJECTED

CollectorsPage
  ├── GET /api/collectors             → users WHERE role=COLLECTOR
  ├── POST /api/collectors            → INSERT users (role=COLLECTOR, hashed pw)
  └── PUT /api/collectors/:id         → UPDATE users

AuditPage
  └── GET /api/audit                 → audit_logs JOIN users (paginated)

CollectorVendorsPage
  └── GET /api/vendors               → same endpoint, read-only view

CollectPage
  └── POST /api/collections          → INSERT collections (status=PENDING)
```

---

## BUSINESS RULES (enforce in backend, display in frontend)

```
RULE 1  Vendor active bill uniqueness
        → On POST /api/bills: SELECT count(*) FROM bills WHERE vendor_id=X AND status='ACTIVE'
        → If count > 0: return 409 "Vendor already has an active bill"

RULE 2  Any collector can update any vendor
        → No vendor-collector assignment table needed

RULE 3  Collection not final until Admin confirms
        → Outstanding balance query: SUM WHERE status='CONFIRMED' only

RULE 4  Alert flags auto-calculated, never stored
        → Calculated in alert.service.js, injected into every bill/vendor response

RULE 5  Collector cannot edit/delete submitted collection
        → PUT/DELETE /api/collections/:id blocked for COLLECTOR role
        → Only Admin can reject (with reason stored in rejection_reason field)
```

---

## ALERT BADGE DISPLAY

```
Flag   Color   Label
DONE   Green   Paid
OK     Gray    On Time
WARN   Yellow  Follow Up (7–14 days)
CRIT   Red     Urgent (15+ days)
```
> AlertBadge.jsx renders a colored pill. Both admin and collector see this on vendor lists.

---

## SECURITY RULES

```
- All routes except POST /api/auth/login require valid JWT
- Role checked per route via requireRole('ADMIN') middleware
- Passwords: bcryptjs, rounds=10
- JWT: expires in 8h, secret in .env
- SQL: parameterized queries only (no string concatenation)
- Input: express-validator on all POST/PUT bodies
- CORS: whitelist frontend origin only
- Helmet: enabled on all responses
```

---

## ENV VARIABLES

```
# Backend .env
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/vendor_crm
JWT_SECRET=<strong_random_secret>
NODE_ENV=development

# Frontend .env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## OUT OF SCOPE (do not implement)

- Mobile app
- Auto SMS / Email alerts
- Accounting software integration
- Vendor self-service login
- Multi-currency
- Collector-vendor fixed assignment

---

## WHAT IS NOT YET DECIDED (ask user if needed)

- Hosting platform (Vercel? Railway? VPS?)
- Whether to use Knex.js query builder or raw pg
- Seeding / demo data needed?
- Pagination page size default
