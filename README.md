## Zyoris – Autonomous Business Intelligence Platform (v3 Central Intelligence Layer)

Zyoris is an enterprise-grade full-stack SaaS platform that ingests data from CRM, ERP, Accounting, Marketing, and Inventory systems into a central warehouse, runs analytics and forecasting, and surfaces strategic recommendations via role-based dashboards.

### Stack

- **Backend**: Node.js, Express, PostgreSQL, Prisma, modular services (ingestion, transformation, analytics, recommendations, auth, dashboards)
- **Frontend**: Next.js 14 (App Router), React 18
- **Auth**: JWT with role-based authorization
- **Deployment**: Docker + docker-compose

### Project structure

- `backend/` – API, services, Prisma schema
- `frontend/` – Next.js app and dashboards
- `Dockerfile.backend` / `Dockerfile.frontend` – container builds
- `docker-compose.yml` – local full-stack + Postgres

### Getting started (local)

1. **Backend**

   ```bash
   cd backend
   cp .env.example .env
   # adjust DATABASE_URL if needed
   npm install
   npx prisma migrate dev --name init
   npm run prisma:generate
   npm run seed
   npm run dev
   ```

   Backend runs on `http://localhost:4000`.

2. **Frontend**

   ```bash
   cd ../frontend
   cp .env.example .env
   npm install
   npm run dev
   ```

   Frontend runs on `http://localhost:3000`.

### Docker (full stack)

```bash
docker-compose up --build
```

This starts:

- Postgres on `5432`
- Backend on `4000`
- Frontend on `3000`

### Seed users and roles

After running `npm run seed` in `backend`, the following users exist (all with password `ChangeMe123!`):

- `admin@zyoris.local` – `ADMIN`
- `ceo@zyoris.local` – `CEO`
- `cfo@zyoris.local` – `CFO`
- `sales@zyoris.local` – `SALES_HEAD`
- `ops@zyoris.local` – `OPERATIONS_HEAD`

Additionally, a dedicated demo user exists:

- `Demo@zyoris.local` – `ADMIN` (password `Zyoris!`)

### Key backend endpoints

- `POST /auth/login` – JWT login
- `POST /ingestion/run` – simulate API pulls (CRM, ERP, Accounting, Marketing, Inventory) and populate warehouse tables
- `POST /ingestion/webhook/crm` – secure webhook for CRM events (HMAC validation)
- `GET /analytics/revenue/forecast` – time-series forecasting
- `GET /analytics/demand/trends` – demand + inventory risk
- `GET /analytics/segments` – segment clustering simulation
- `GET /analytics/conversion/scores` – conversion probability scoring
- `GET /analytics/revenue/drivers` – revenue driver and ROI analysis
- `GET /recommendations` – strategic recommendations with confidence and financial impact
- `GET /dashboard/ceo` – CEO summary view API
- `GET /dashboard/cfo` – CFO summary view API
- `GET /dashboard/sales` – Sales summary view API
- `GET /dashboard/operations` – Operations summary view API

### Frontend dashboards

- **Login** (`/login`): connects to backend `/auth/login`, stores JWT client-side (for demo) and initializes role.
- **Overview** (`/dashboard`): executive summary (revenue run-rate, margin, demand trend, recommendation panel).
- **CEO** (`/dashboard/ceo`): revenue forecast table (90-day horizon).
- **CFO** (`/dashboard/cfo`): margin trends, expenses summary, channel ROI.
- **Sales** (`/dashboard/sales`): pipeline quality score and conversion probabilities per deal.
- **Operations** (`/dashboard/operations`): demand forecast, inventory risk alerts, production optimization hints.

### Security notes

- JWT auth with role-based guards per dashboard route.
- HMAC webhook validation for CRM webhook (`WEBHOOK_SECRET`).
- Audit logging middleware records user actions and response metadata.
- Environment variables are loaded from `.env` and should be secured in production.

