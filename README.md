# LeadFlowPro

A full-stack B2B lead management and sales automation platform built with Express, React, PostgreSQL, and real-time WebSocket capabilities.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Express.js, TypeScript, Prisma ORM |
| **Frontend** | React 19, Vite, TailwindCSS |
| **Database** | PostgreSQL (Neon) |
| **Auth** | JWT (access + refresh tokens), TOTP 2FA, CSRF protection |
| **Real-time** | Socket.IO with tenant-isolated rooms |
| **Payments** | Stripe (subscriptions, usage billing, webhooks) |
| **AI** | OpenAI (lead scoring, churn prediction, smart routing) |
| **Rate Limiting** | express-rate-limit + Redis (graceful memory fallback) |
| **Monitoring** | Sentry error tracking, structured logging |
| **API Docs** | OpenAPI 3.0.3 via swagger-ui at `/api/docs` |

## Project Structure

```
leadflow-pro/
├── apps/
│   ├── api/          # Express backend (TypeScript)
│   └── web/          # React frontend (Vite + TypeScript)
├── e2e/              # Playwright end-to-end tests
├── packages/         # Shared packages
├── docs/             # Project documentation
└── scripts/          # Utility scripts
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (or [Neon](https://neon.tech) account)
- npm 9+

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp apps/api/.env.example apps/api/.env
# Edit .env with your DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY

# Generate Prisma client & push schema
npm -w apps/api run db:generate
npm -w apps/api run db:push

# Seed test data
npm -w apps/api run seed
npm -w apps/api run seed:test-user

# Start development servers
npm -w apps/api run dev    # API on http://localhost:3000
npm -w apps/web run dev    # Web on http://localhost:5173
```

### Environment Variables

See [RENDER_ENV_VARS.md](RENDER_ENV_VARS.md) for the full list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing key (32+ chars) |
| `ENCRYPTION_KEY` | Yes | AES-256 key (64 hex chars) |
| `NODE_ENV` | Yes | `development` / `production` |
| `WEB_URL` | Yes | Frontend URL (for CORS) |
| `REDIS_URL` | No | Redis URL for rate limiting |
| `SENTRY_DSN` | No | Sentry error tracking DSN |
| `STRIPE_SECRET_KEY` | No | Stripe API key |

## Testing

```bash
# Unit tests (Vitest) — 86 tests
npm -w apps/api run test

# Unit tests in watch mode
npm -w apps/api run test:watch

# E2E tests (Playwright)
npm run test:e2e

# E2E with visible browser
npm run test:e2e:headed
```

## API Documentation

Interactive OpenAPI docs are available at `/api/docs` when the API server is running. Covers all 96+ endpoints across 20 modules.

## Key Features

- **Lead Management** — CRUD, scoring, deduplication, quality analysis, bulk import/export
- **Campaign Automation** — Multi-channel campaigns with A/B testing and analytics
- **AI Intelligence** — Lead scoring, churn prediction, smart routing, scheduling optimization
- **Workflow Engine** — Visual builder (ReactFlow), 14 action types, triggers, branching, templates
- **Real-time Updates** — WebSocket notifications for tasks, activities, and system events
- **Reports & Analytics** — PDF/CSV export, scheduled reports, pipeline and conversion analytics
- **Multi-tenant** — Tenant-isolated data with super admin oversight
- **Security** — 2FA, CSRF protection, rate limiting, audit logging, encryption at rest

## Deployment

| Service | Platform | Guide |
|---------|----------|-------|
| Backend API | [Render](https://render.com) | [RENDER_ENV_VARS.md](RENDER_ENV_VARS.md) |
| Frontend | [Vercel](https://vercel.com) | [vercel.json](vercel.json) |
| Database | [Neon](https://neon.tech) | PostgreSQL 15 |

## CI/CD

GitHub Actions runs on every push to `main` and on pull requests:
- Prisma client generation
- TypeScript compilation (API + Web)
- Unit test suite (Vitest)

See [.github/workflows/ci.yml](.github/workflows/ci.yml).

## License

Private — All rights reserved.
