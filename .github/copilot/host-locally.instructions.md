---
description: >
  Step-by-step skill for spinning up the full LeadFlowPro stack locally
  (PostgreSQL + Redis via Docker, Express API, React/Vite frontend).
  Invoke when asked to "start locally", "run in dev", "host LeadFlowPro",
  or when troubleshooting a local environment that won't start.
applyTo: "**"
---

# SKILL: Host LeadFlowPro Locally

## Goal
Start the complete LeadFlowPro monorepo dev environment so that:
- API is reachable at `http://localhost:3000`
- Web UI is reachable at `http://localhost:5174`
- Database (PostgreSQL) and cache (Redis) are running in Docker

---

## Prerequisites Check

Before Step 1, verify these are installed:

| Tool | Min Version | Check Command |
|------|------------|---------------|
| Node.js | v20+ | `node -v` |
| npm | v9+ | `npm -v` |
| Docker Desktop | any recent | `docker -v` |
| Git | any | `git --version` |

> **Decision:** If Docker is not available, the developer must provide an external PostgreSQL instance (`DATABASE_URL`) and skip all `docker` steps below.

---

## Step 1 — Install Dependencies

Run from the **monorepo root** (`c:\...\LeadFlowPro`):

```bash
npm install
```

This installs all workspace packages (`apps/api`, `apps/web`, `packages/*`) via npm workspaces in one pass.

**Verify:** `node_modules/` exists at root AND inside each `apps/*` directory.

---

## Step 2 — Start Infrastructure (Docker)

```bash
# From monorepo root
npm run docker:up
# or directly:
docker-compose up -d
```

This starts two containers:
- `leadflow_postgres` — PostgreSQL 15 on **port 5432**
- `leadflow_redis` — Redis 7 on **port 6379**

**Verify containers are healthy:**
```bash
docker ps
```
Both containers should show `(healthy)` status. If not, check logs:
```bash
npm run docker:logs
```

**Credentials (for manual DB connection):**
```
Host:     localhost:5432
Database: leadflow_dev
User:     leadflow
Password: leadflow_dev
```

---

## Step 3 — Create the API `.env` File

Create `apps/api/.env` (never commit this file — it is in `.gitignore`):

```env
# Core
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://leadflow:leadflow_dev@localhost:5432/leadflow_dev"
FRONTEND_URL="http://localhost:5174"
JWT_SECRET="change-me-local-dev-secret"

# Dev Super Admin (auto-created on first API start)
DEV_SUPER_ADMIN_EMAIL=admin@example.com
DEV_SUPER_ADMIN_PASSWORD=Admin@1234!
DEV_SUPER_ADMIN_TENANT_ID=dev-tenant-local

# Optional integrations (leave blank to skip; features gracefully degrade)
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

> **Security note:** `JWT_SECRET` must be a long random string in any shared environment. For local-only dev, any non-empty string works.

---

## Step 4 — Generate Prisma Client & Push Schema

```bash
# Generate the typed Prisma client
npm run db:generate

# Push the schema to the local DB (safe for dev; skips migration history)
npm run db:push
```

**When to use `db:migrate` instead of `db:push`:**
- Use `db:push` for fast iteration and schema exploration in local dev.
- Use `npm run db:migrate` when you need a repeatable migration file (e.g., before merging to main or deploying).

**Verify:** Prisma should print `✓ Your database is now in sync with your Prisma schema.`

---

## Step 5 — (Optional) Seed Test Data

```bash
npm run seed --workspace=apps/api
```

This creates sample tenants, leads, and campaigns for a richer dev experience.

> Skip if you want a clean empty database, or if seed has already run.

---

## Step 6 — Start the API Server

Open **Terminal 1**:

```bash
npm run dev --workspace=apps/api
```

The API uses `tsx watch` for hot-reload. Expected output:

```
═══════════════════════════════════════════════════════════
DEV SUPER ADMIN CREDENTIALS
═══════════════════════════════════════════════════════════
Email:    admin@example.com
Password: Admin@1234!
TenantID: dev-tenant-local
═══════════════════════════════════════════════════════════

🚀 LeadFlow Pro API running on port 3000 [development]
```

**Verify:** `curl http://localhost:3000/health` returns a 200 response.

---

## Step 7 — Start the Web Dev Server

Open **Terminal 2**:

```bash
npm run dev --workspace=apps/web
```

Vite will print a local URL, usually `http://localhost:5174`.

**Verify:** Open the URL in your browser. The login page should appear.

---

## Step 8 — Log In

| Field | Value |
|-------|-------|
| URL | `http://localhost:5174` |
| Email | value of `DEV_SUPER_ADMIN_EMAIL` in your `.env` |
| Password | value of `DEV_SUPER_ADMIN_PASSWORD` in your `.env` |

On first login as super admin you have access to all tenants, billing settings, and the super admin panel.

---

## Smoke Checks

After logging in, confirm each area loads without console errors:

- [ ] `http://localhost:5174/dashboard` — main KPI dashboard
- [ ] `http://localhost:5174/leads` — lead list
- [ ] `http://localhost:5174/workflows` — workflow list
- [ ] `http://localhost:5174/campaigns` — campaign list

Run the full automated smoke suite:
```bash
npx playwright test e2e/smoke-sprint13.spec.ts --headed
```

---

## Common Problems & Fixes

### Port 5432 already in use
```bash
# Find what's using it
netstat -ano | findstr :5432
# Kill it or change the mapping in docker-compose.yml
```

### `prisma generate` fails — "engine not found"
```bash
npm install           # reinstall to restore Prisma binaries
npm run db:generate
```

### API starts but immediately crashes — "DATABASE_URL is not set"
- Confirm `apps/api/.env` exists and contains `DATABASE_URL`.
- The API dev script uses `--env-file=.env`; the file must be in `apps/api/`, not the root.

### Web shows blank page or 401 errors
- Check `FRONTEND_URL` in `apps/api/.env` matches the Vite port (e.g., `http://localhost:5174`).
- Check browser console for CORS errors.

### Docker containers exit immediately
```bash
docker-compose logs postgres
```
If it says "data directory has wrong ownership", delete the volume and recreate:
```bash
docker-compose down -v
docker-compose up -d
```

### Prisma schema out of sync after pulling new code
```bash
npm run db:push       # fast sync for dev
# or
npm run db:migrate    # if migration files were added
npm run db:generate   # always regenerate the client after schema changes
```

---

## Stopping the Environment

```bash
# Stop API and Web: Ctrl+C in each terminal

# Stop Docker containers (keeps data)
npm run docker:down

# Stop Docker and DELETE all data (full reset)
docker-compose down -v
```

---

## Environment Variables Reference

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `NODE_ENV` | Yes | — | Must be `development` locally |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Signing key for auth tokens |
| `FRONTEND_URL` | Yes | — | Allowed CORS origin |
| `PORT` | No | 3000 | API listen port |
| `OPENAI_API_KEY` | No | — | AI scoring / enrichment |
| `STRIPE_SECRET_KEY` | No | — | Billing (degrades gracefully) |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | No | — | Real email sending |
| `TWILIO_*` | No | — | Real SMS sending |
| `AWS_*` / `AWS_S3_BUCKET` | No | — | S3 file uploads |

---

## Quick Reference — All Commands

```bash
# Full start sequence (copy-paste)
npm install
npm run docker:up
# create apps/api/.env (see Step 3)
npm run db:generate
npm run db:push
# Terminal 1:
npm run dev --workspace=apps/api
# Terminal 2:
npm run dev --workspace=apps/web

# Useful day-to-day
npm run db:studio          # Prisma Studio GUI at localhost:5555
npm run docker:logs        # tail container logs
docker-compose down -v     # full reset
```
