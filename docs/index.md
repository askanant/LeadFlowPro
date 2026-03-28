# LeadFlowPro — Complete System Documentation

**Version:** 1.0.0  
**Generated:** March 29, 2026  
**Status:** Initial Comprehensive Documentation (Exhaustive Scan)

---

## 📋 Overview

**LeadFlowPro** is a comprehensive lead management and optimization platform designed for B2B marketing teams. The system integrates with multiple advertising platforms (Meta, Google, LinkedIn), manages lead ingestion from various channels, orchestrates intelligent lead workflows, and provides advanced analytics and optimization recommendations.

### Core Value Proposition

- **Multi-platform Lead Ingestion** — Capture leads from Meta, Google, LinkedIn, Taboola, Microsoft Ads
- **Intelligent Lead Scoring** — AI-powered lead quality assessment with OpenAI integration
- **Workflow Automation** — Complex, multi-step lead handling workflows with conditional logic
- **Telephony Integration** — Inbound/outbound call routing, recording, and lead matching
- **Advanced Analytics** — Campaign metrics, lead performance, ROI tracking
- **Billing & Subscription** — Stripe integration with tiered plans
- **Notification System** — Multi-channel alerts (email, Slack, in-app)
- **WhatsApp Integration** — Template-based WhatsApp messaging

---

## 🏗️ Architecture Overview

### Repository Structure

```
LeadFlowPro (Monorepo)
├── apps/
│   ├── api/                 ← Express.js Node.js backend (TypeScript)
│   └── web/                 ← React 19 + Vite frontend (TypeScript)
├── packages/                ← Shared utilities & types
├── e2e/                     ← Playwright automated tests
├── docs/                    ← This documentation
└── scripts/                 ← Utility scripts
```

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend Language** | Node.js + TypeScript | ^20.0 |
| **Backend Framework** | Express.js | ^4.18 |
| **Frontend Framework** | React | ^19.2 |
| **Frontend Build** | Vite | ^7.3 |
| **Database** | PostgreSQL | 15 |
| **Cache** | Redis | 7 |
| **ORM** | Prisma | ^7.4 |
| **Real-time** | Socket.io | 4.8 |
| **Authentication** | JWT + 2FA (TOTP) | — |
| **Payment** | Stripe | ^20.4 |
| **AI** | OpenAI GPT | ^6.27 |
| **Testing** | Playwright | Latest |

---

## 📚 Documentation Index

### 1. **[api-contracts.md](api-contracts.md)** — API Endpoints & Contracts
   - Complete REST API specification
   - 18+ route modules with full endpoint documentation
   - Request/response contracts for all operations
   - Authentication & authorization patterns
   - Rate limiting & error handling

### 2. **[data-models.md](data-models.md)** — Database Schema & Models
   - 40+ Prisma data models
   - Entity relationship diagrams
   - Key relationships (1-to-many, many-to-many)
   - Indexed fields and unique constraints
   - Tenant isolation patterns

### 3. **[backend-modules.md](backend-modules.md)** — Backend Module Reference
   - 18 specialized business domain modules
   - Module structure, services, and patterns
   - Key files and responsibilities per module
   - Integration points and dependencies
   - Critical business logic flows

### 4. **[frontend-architecture.md](frontend-architecture.md)** — Frontend & UI Guide
   - React component hierarchy
   - 35+ pages and their purposes
   - Component library organization
   - State management (Zustand) patterns
   - API communication layer (Axios + React Query)
   - Routing & layout structure

### 5. **[workflow-system.md](workflow-system.md)** — Workflow Automation Engine
   - Workflow architecture & execution model
   - Trigger types: scheduled, webhook, event-based
   - Workflow steps & action types
   - Step conditions & branching logic
   - Workflow templates & versioning

### 6. **[integration-guide.md](integration-guide.md)** — External Integrations
   - Ad platform integrations (Meta, Google, LinkedIn, Taboola)
   - Telephony providers (Exotel, Twilio)
   - AI/ML integration (OpenAI)
   - Stripe billing integration
   - Webhook event handling
   - WhatsApp messaging integration

### 7. **[authentication-security.md](authentication-security.md)** — Auth & Security
   - JWT-based authentication
   - Role-based access control (RBAC)
   - Two-factor authentication (TOTP)
   - Tenant isolation & multi-tenancy
   - Security best practices & middleware

### 8. **[setup-development.md](setup-development.md)** — Local Development Setup
   - Prerequisites & dependencies
   - Docker setup for PostgreSQL & Redis
   - Environment configuration
   - Database migrations & seeding
   - Running API & Web dev servers
   - Common troubleshooting

---

## 🎯 Key Modules & Domains

### Backend Modules (18 specialized domains)

| Module | Purpose |
|--------|---------|
| **auth** | User authentication, login, 2FA |
| **companies** | Tenant management, company profiles |
| **leads** | Lead storage, assignment, scoring |
| **campaigns** | Campaign creation & management |
| **telephony** | Phone number management, call handling |
| **workflows** | Workflow builder, execution engine |
| **ai** | OpenAI integration, lead scoring |
| **analytics** | Campaign metrics, performance tracking |
| **billing** | Stripe integration, subscriptions |
| **notifications** | Email, Slack, in-app notifications |
| **webhooks** | Inbound webhook handling & validation |
| **agents** | AI agent configuration |
| **audit** | User actions & audit logging |
| **reports** | Report generation & scheduling |
| **tasks** | Task management & assignment |
| **settings** | System configuration |
| **growth** | Growth optimization features |
| **optimization** | Lead & budget optimization |

### Frontend Pages (35+ major pages)

| Category | Pages |
|----------|-------|
| **Core** | Dashboard, Login, Register, Setup |
| **Leads** | Leads List, Lead Detail, Lead Insights |
| **Campaigns** | Campaigns, Campaign Detail, Campaign Optimizer |
| **Workflows** | Workflows, Workflow Builder, Workflow Templates |
| **Analytics** | Advanced Reporting, Analytics, Workflow Analytics |
| **Operational** | Tasks, Notifications, Audit Logs |
| **Admin** | Companies, Settings, Billing, Telephony |
| **Tools** | Lead Assignment, Lead Scoring, Spend Optimizer |

---

## 🔄 Core Data Flow

### Lead Ingestion → Scoring → Assignment → Engagement Workflow

```
Ad Platform (Meta/Google)
        ↓
[Lead Webhook] → Capture & Validate
        ↓
[AI Scoring Module] → Calculate Quality Score
        ↓
[Lead Assignment] → Route to correct user/team
        ↓
[Workflow Trigger] → Execute automation
        ↓
[Action Execution] → Send notification, call, etc.
        ↓
[Activity Tracking] → Log all interactions
```

---

## 📊 Database Schema Highlights

### Core Entities

- **Company** — Tenant (SaaS multi-tenancy)
- **User** — Team members with roles
- **Lead** — Lead records with quality scores
- **Campaign** — Ad campaigns with metrics
- **Workflow** — Automation workflows
- **WorkflowExecution** — Workflow run instances
- **CallLog** — Phone interactions
- **Subscription** — Billing & plan management

### Total Models: 40+
### Total Relationships: 80+
### Indexed Fields: 50+

---

## 🔐 Security & Multi-tenancy

- **Tenant Isolation** — All data keyed by `tenantId`
- **Role-Based Access** — super_admin, company_admin, viewer
- **JWT Authentication** — Secure token-based auth
- **Two-Factor Auth** — TOTP/OTP support
- **Audit Logging** — All user actions tracked
- **Encrypted Credentials** — API keys & secrets encrypted at rest
- **Rate Limiting** — Global, auth-specific, and API-wide limits
- **CORS & HTTPS** — Security headers via Helmet

---

## 🚀 Deployment Architecture

### Development Environment
- Local Docker: PostgreSQL, Redis
- Hot-reload servers (tsx watch + Vite)
- Seed data for testing

### Production Considerations
- Containerized deployment (Docker)
- Database migrations via Prisma
- Environment-based configuration
- Scheduled jobs (Cron-based triggers)
- WebSocket support for real-time updates
- S3 integration for call recordings

---

## 📈 Key Metrics & Tracking

### Campaign Metrics
- Spend, Impressions, Clicks, Lead Count
- CPL (Cost Per Lead)
- Daily targeting & budget allocation

### Lead Quality
- 0-100 quality score (AI-calculated)
- Churn risk assessment
- Status tracking (new → qualified → contacted)

### Workflow Performance
- Execution count & success rate
- Step-level success/error tracking
- Trigger execution logs

---

## 🛠️ Common Development Tasks

### Setting Up Locally
See [setup-development.md](setup-development.md)

```bash
# Install dependencies
npm install

# Start Docker services
npm run docker:up

# Create API .env file
# Push database schema
npm run db:push

# Terminal 1: Start API
npm run dev --workspace=apps/api

# Terminal 2: Start Web
npm run dev --workspace=apps/web
```

### Running Tests
```bash
# E2E tests
npx playwright test e2e/smoke-sprint13.spec.ts --headed
```

### Database Operations
```bash
# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# GUI schema browser
npm run db:studio

# Seed test data
npm run seed --workspace=apps/api
```

---

## 📖 Reading Guide for Different Roles

### For Backend Developers
1. Start with [setup-development.md](setup-development.md)
2. Read [backend-modules.md](backend-modules.md)
3. Reference [api-contracts.md](api-contracts.md) for specific endpoints
4. Deep-dive: [data-models.md](data-models.md) and [workflow-system.md](workflow-system.md)

### For Frontend Developers
1. Start with [setup-development.md](setup-development.md)
2. Read [frontend-architecture.md](frontend-architecture.md)
3. Reference [api-contracts.md](api-contracts.md) for backend integration
4. Review [authentication-security.md](authentication-security.md)

### For DevOps/Infrastructure
1. Review [setup-development.md](setup-development.md) — Docker & environment setup
2. Check [integration-guide.md](integration-guide.md) — External service credentials
3. Reference [authentication-security.md](authentication-security.md) — Security config

### For Product/Business
1. Start with this index & overview
2. Read [backend-modules.md](backend-modules.md) — Understand feature set
3. Review [integration-guide.md](integration-guide.md) — Supported platforms
4. Check [workflow-system.md](workflow-system.md) — Automation capabilities

---

## 🔗 External Resources

- **Prisma Docs** — Database ORM
- **Express.js Docs** — Backend framework
- **React Docs** — Frontend framework
- **Stripe API** — Payment processing
- **OpenAI API** — AI integration
- **Meta Ads API** — Facebook/Instagram lead integration
- **Playwright Docs** — E2E testing

---

## 📝 Notes

- All API endpoints require JWT authentication (except /auth/login, /auth/register)
- Tenant isolation is enforced at database level (all queries filtered by `tenantId`)
- WebSocket connection established for real-time notifications
- Database uses UTC timestamps throughout
- All prices/decimals use PostgreSQL Decimal(12,2) type

---

**Last Updated:** March 29, 2026  
**Documentation Version:** 1.0.0  
**Scan Level:** Exhaustive (All source files analyzed)
