# LeadFlowPro — Backend Modules Reference

**Framework:** Express.js + TypeScript  
**Architecture Pattern:** Modular, domain-driven design  
**Total Modules:** 18 specialized business domain modules

---

## 📦 Module Organization

```
src/
├── modules/          ← 18 domain-specific modules
│   ├── auth/
│   ├── companies/
│   ├── leads/
│   ├── campaigns/
│   ├── telephony/
│   ├── workflows/
│   ├── ai/
│   ├── analytics/
│   ├── billing/
│   ├── notifications/
│   ├── webhooks/
│   ├── agents/
│   ├── audit/
│   ├── reports/
│   ├── tasks/
│   ├── settings/
│   ├── growth/
│   └── optimization/
├── shared/           ← Common middleware, utilities, types
│   ├── middleware/   ← CORS, auth, rate-limiting, error handling
│   ├── websocket/    ← Socket.io real-time updates
│   ├── types/        ← Shared TypeScript interfaces
│   └── utils/        ← Helper functions
├── config.ts         ← Environment configuration
└── index.ts          ← Server entry point
```

---

## 🔐 Auth Module

**Purpose:** User authentication, JWT tokens, two-factor authentication

**Key Files:**
- `auth.router.ts` — Route definitions
- `auth.service.ts` — Business logic
- `auth.types.ts` — Request/response types

**Authentication Methods:**
- Email/password with bcrypt hashing
- JWT tokens (15m access, 7d refresh)
- Two-factor authentication (TOTP/OTP)
- Session management

**Endpoints:**
```
POST   /auth/login              — Login with credentials
POST   /auth/register           — Account creation
POST   /auth/refresh-token      — Refresh JWT
POST   /auth/logout             — Logout & invalidate token
POST   /auth/2fa/setup          — Enable 2FA
POST   /auth/2fa/verify         — Verify OTP code
```

**Key Logic:**
- Password hashing with bcryptjs
- TOTP secret generation for 2FA
- JWT payload includes userId, tenantId, role
- Rate-limited login attempts
- Auto-create dev super admin on first startup

---

## 🏢 Companies Module

**Purpose:** Tenant/company management, company profiles

**Key Files:**
- `companies.router.ts`
- `companies.service.ts`
- `company.types.ts`

**Features:**
- Company profile management
- Target geography & lead criteria configuration
- Industry classification
- Settings & preferences

**Endpoints:**
```
GET    /companies/:id           — Get company profile
PUT    /companies/:id           — Update company info
GET    /companies/settings      — Get company settings
PUT    /companies/settings      — Update settings
```

**Key Logic:**
- Tenant ID as company identifier
- Company-wide settings JSON storage
- Lead quality rule configuration
- Industry-specific defaults

---

## 👥 Leads Module

**Purpose:** Lead management, assignment, scoring, quality assessment

**Key Files:**
- `leads.router.ts`
- `leads.service.ts`
- `lead-assignment.router.ts`
- `lead-assignment.service.ts`
- `lead.types.ts`

**Features:**
- Lead ingestion from multiple platforms
- AI-powered quality scoring (0-100)
- Lead assignment to team members
- Status tracking (new → qualified → contacted)
- Custom field support
- Churn risk assessment

**Endpoints:**
```
GET    /leads                   — List leads (paginated, filtered)
GET    /leads/:id               — Get lead detail
POST   /leads                   — Create lead
PUT    /leads/:id               — Update lead
DELETE /leads/:id               — Archive lead
POST   /leads/:id/notes         — Add note to lead
GET    /leads/:id/activity      — Get lead activity timeline
PUT    /leads/:id/qualification — Change lead status
POST   /leads/assignment        — Assign lead to user
GET    /leads/assignment/rules  — Get assignment rules
```

**Quality Scoring:**
- OpenAI integration for intelligent scoring
- Custom rules based on lead criteria
- Dynamic recalculation on updates
- Score breakdown with reasoning

**Assignment Logic:**
- Manual assignment
- Round-robin distribution
- Skills-based routing
- Load balancing across team

---

## 📢 Campaigns Module

**Purpose:** Ad campaign management, targeting, budget allocation

**Key Files:**
- `campaigns.router.ts`
- `campaigns.service.ts`
- `campaign.types.ts`

**Features:**
- Multi-platform campaign creation (Meta, Google, LinkedIn, etc.)
- Daily/total budget management
- Daily lead targets with day-of-week breakdown
- Campaign status lifecycle
- Performance metric tracking

**Endpoints:**
```
GET    /campaigns                — List campaigns
GET    /campaigns/:id            — Get campaign detail
POST   /campaigns                — Create campaign
PUT    /campaigns/:id            — Update campaign
DELETE /campaigns/:id            — Archive campaign
GET    /campaigns/:id/metrics    — Get performance metrics
POST   /campaigns/sync-status    — Sync with ad platform
```

**Metric Tracking:**
- Daily spend & impressions
- Click-through rate (CTR)
- Cost per lead (CPL)
- Lead count & quality distribution

---

## ☎️ Telephony Module

**Purpose:** Phone number management, call routing, recording storage

**Key Files:**
- `telephony.router.ts`
- `telephony.service.ts`
- `providers/exotel.adapter.ts`
- `providers/twilio.adapter.ts`
- `call-routing.service.ts`

**Features:**
- Support for multiple providers (Exotel, Twilio, Plivo)
- Phone number purchase & management
- Inbound/outbound call routing
- Call recording to S3
- Lead-call matching (confidence scoring)

**Endpoints:**
```
GET    /telephony/numbers       — List purchased numbers
POST   /telephony/numbers       — Purchase number
DELETE /telephony/numbers/:id   — Release number
GET    /telephony/call-logs     — List call history
GET    /telephony/call-logs/:id — Get call detail
POST   /telephony/webhook       — Receive call events
GET    /telephony/recordings/:id — Get call recording URL
```

**Call Routing:**
- Forward routing
- IVR (Interactive Voice Response)
- Round-robin distribution
- Lead-specific routing

**Recording Management:**
- Automatic upload to S3
- Presigned URLs for playback
- Retention policies

---

## 🔄 Workflows Module

**Purpose:** Workflow automation engine, trigger execution, action orchestration

**Key Files:**
- `workflows.router.ts`
- `workflows.service.ts`
- `workflow-builder.service.ts`
- `workflow-execution.service.ts`
- `triggers.ts` — Cron job initialization & execution
- `actions/` — Action handlers
- `workflow.types.ts`

**Features:**
- Visual workflow builder (drag-drop steps)
- Multiple trigger types: scheduled, webhook, event-based
- Conditional logic & branching
- Step versioning & rollback
- Execution history & debugging

**Workflow Trigger Types:**
1. **Scheduled** — Cron expression (daily, weekly, etc.)
2. **Webhook** — External system triggers
3. **Lead Score Change** — When quality score changes
4. **Lead Engagement** — Call, email, call completion
5. **Time Since Event** — "X days since last contact"
6. **Campaign Performance** — Based on metrics
7. **Batch Execution** — Process multiple leads

**Action Types:**
- Send SMS
- Send email
- Make outbound call
- Webhook call
- Send WhatsApp
- Update lead status
- Assign task
- Pause/delay
- Conditional branch
- Custom action

**Endpoints:**
```
GET    /workflows                — List workflows
GET    /workflows/:id            — Get workflow detail
POST   /workflows                — Create workflow
PUT    /workflows/:id            — Update workflow
DELETE /workflows/:id            — Delete workflow
POST   /workflows/:id/publish    — Publish version
POST   /workflows/:id/test       — Test on sample lead
GET    /workflows/:id/executions — Get execution history
GET    /workflows/:id/executions/:executionId — Get execution detail
GET    /workflows/templates      — List templates
POST   /workflows/templates/:id/use — Instantiate template
```

**Execution Model:**
- Trigger → Check conditions → Execute steps → Log results
- Step-level result tracking
- Conditional branching based on previous step output
- Error handling & retry logic
- Real-time WebSocket updates during execution

---

## 🤖 AI Module

**Purpose:** AI-powered lead scoring, suggestions, enrichment

**Key Files:**
- `ai.router.ts`
- `ai.service.ts`
- `openai.client.ts`
- `scoring-engine.ts`
- `enrichment.service.ts`

**Features:**
- OpenAI GPT integration
- Lead quality scoring
- Lead enrichment (company info, decision-maker detection)
- Campaign optimization suggestions
- Budget allocation recommendations

**Endpoints:**
```
POST   /ai/score-lead            — Score a lead
POST   /ai/bulk-score            — Score multiple leads
POST   /ai/enrich-lead           — Enrich lead data
POST   /ai/campaign-suggestions  — Get campaign improvements
POST   /ai/budget-allocate       — Calculate optimal budget split
```

**Scoring Model:**
- Uses company's lead criteria rules
- Analyzes: name, email, phone, company, location, source
- Returns: 0-100 score + reasoning breakdown
- Caches score for performance

**Suggestions:**
- Targeting adjustments
- Budget reallocation
- Creative recommendations
- Lead re-scoring after status changes

---

## 📊 Analytics Module

**Purpose:** Campaign metrics, reporting, KPI tracking

**Key Files:**
- `analytics.router.ts`
- `analytics.service.ts`:
- `metrics.service.ts`
- `reporting.service.ts`

**Features:**
- Campaign performance metrics (spend, leads, ROI)
- Lead quality distribution tracking
- Workflow execution statistics
- Geographic & demographic breakdowns
- Time-series analytics

**Endpoints:**
```
GET    /analytics/dashboard      — High-level KPIs
GET    /analytics/campaigns      — Campaign performance
GET    /analytics/leads          — Lead quality metrics
GET    /analytics/workflows      — Workflow metrics
GET    /analytics/export         — Export analytics (CSV/PDF)
```

**Key Metrics:**
- Spend & budget utilization
- Lead count & quality score distribution
- Cost per lead (CPL)
- Conversation rate
- Churn risk trending

---

## 💳 Billing Module

**Purpose:** Stripe integration, subscription management, plan handling

**Key Files:**
- `billing.router.ts`
- `billing.service.ts`
- `stripe.client.ts`
- `subscription.service.ts`
- `plan.types.ts`

**Features:**
- Stripe subscription management
- Plan tiers (Starter, Professional, Enterprise)
- Invoice management
- Usage-based tracking
- Auto-renewal & cancellation

**Endpoints:**
```
GET    /billing/subscription     — Get current subscription
POST   /billing/subscribe        — Create subscription
PUT    /billing/subscription     — Update plan
POST   /billing/cancel           — Cancel subscription
GET    /billing/invoices         — List invoices
GET    /billing/plans            — List plans
```

**Plan Tiers:**
- **Starter** — Essential features
- **Professional** — Advanced features + integrations
- **Enterprise** — Full platform + custom support

---

## 🔔 Notifications Module

**Purpose:** Multi-channel notifications (email, Slack, in-app)

**Key Files:**
- `notification.router.ts`
- `notification.service.ts`
- `email.service.ts`
- `slack.service.ts`

**Features:**
- Email notifications
- Slack integration & webhooks
- In-app notification queue
- User notification preferences
- Notification templating

**Notification Types:**
- Workflow execution (success/failure)
- Lead assignment
- Lead status change
- Task creation
- Report ready
- Campaign alerts

**Endpoints:**
```
POST   /notifications/preferences — Set user preferences
GET    /notifications/preferences — Get preferences
POST   /notifications/send        — Send manual notification
GET    /notifications/history     — Get notification history
```

---

## 🪝 Webhooks Module

**Purpose:** Inbound webhook ingestion from ad platforms

**Key Files:**
- `webhooks.router.ts`
- `webhooks.service.ts`
- `lead-ingestion.service.ts`
- `signature-verification.ts`

**Features:**
- Platform webhook routing (Meta, Google, LinkedIn)
- Signature verification & security
- Lead data transformation
- Duplicate detection
- Error handling & retry

**Endpoints:**
```
POST   /webhooks/meta            — Meta lead webhook
POST   /webhooks/google          — Google lead webhook
POST   /webhooks/linkedin        — LinkedIn webhook
POST   /webhooks/custom          — Custom platform webhook
```

**Security:**
- Webhook signature verification
- Timestamp validation
- Rate limiting per platform
- Replay attack prevention

---

## 👤 Agents Module

**Purpose:** AI agent configuration & management

**Key Files:**
- `agents.router.ts`
- `agents.service.ts`
- `agent-config.types.ts`

**Features:**
- Define AI agents for workflows
- Agent personality configuration
- Behavior parameters
- Knowledge base integration

**Endpoints:**
```
GET    /agents                   — List agents
POST   /agents                   — Create agent
PUT    /agents/:id               — Update agent
DELETE /agents/:id               — Delete agent
```

---

## 📋 Audit Module

**Purpose:** Complete audit trail of all user actions

**Key Files:**
- `audit.router.ts`
- `audit.service.ts`
- `audit-logger.middleware.ts`

**Features:**
- Log all CRUD operations
- Track user, timestamp, IP address
- Queryable audit history
- Compliance & security review

**Endpoints:**
```
GET    /audit/logs               — Query audit logs
GET    /audit/user/:userId       — User's action history
GET    /audit/resource/:resourceId — Changes to resource
```

---

## 📈 Reports Module

**Purpose:** Report generation, scheduling, export

**Key Files:**
- `reports.router.ts`
- `reports.service.ts`
- `scheduled-report.service.ts`
- `report-generators/` — Per-report-type generators

**Features:**
- Scheduled report generation
- Custom report building
- Export to CSV, PDF, email
- Dashboard insights

**Report Types:**
- Campaign Performance
- Lead Quality Distribution
- Workflow Metrics
- ROI Analysis
- Custom queries

**Endpoints:**
```
GET    /reports                  — List saved reports
POST   /reports                  — Create custom report
GET    /reports/:id/generate     — Generate report
POST   /reports/schedule         — Schedule recurring report
DELETE /reports/:id              — Delete report
```

---

## 📝 Tasks Module

**Purpose:** Task management & assignment, activity tracking

**Key Files:**
- `tasks.router.ts`
- `tasks.service.ts`
- `activities.router.ts`
- `activities.service.ts`

**Features:**
- Create & assign tasks
- Priority & due date tracking
- Task completion workflow
- Activity timeline for leads/users

**Endpoints:**
```
GET    /tasks                    — List tasks
POST   /tasks                    — Create task
PUT    /tasks/:id                — Update task
DELETE /tasks/:id                — Delete task
POST   /tasks/:id/complete       — Mark complete
GET    /activities                — Get activity timeline
```

---

## ⚙️ Settings Module

**Purpose:** System configuration, preferences, defaults

**Key Files:**
- `settings.router.ts`
- `settings.service.ts`

**Features:**
- Company-wide settings
- Default values
- Feature flags
- Integration credentials

**Endpoints:**
```
GET    /settings                 — Get all settings
PUT    /settings/:key            — Update setting
DELETE /settings/:key            — Delete setting
```

---

## 📊 Growth Module

**Purpose:** Growth optimization, expansion recommendations

**Key Files:**
- `growth.router.ts`
- `growth.service.ts`

**Features:**
- Growth potential analysis
- Expansion recommendations
- Usage trending

**Endpoints:**
```
GET    /growth/insights          — Get growth recommendations
GET    /growth/potential         — Calculate expansion potential
```

---

## 🎯 Optimization Module

**Purpose:** Lead & campaign optimization, intelligent suggestions

**Key Files:**
- `optimization.router.ts`
- `optimization.service.ts`
- `lead-optimizer.service.ts`
- `budget-optimizer.service.ts`

**Features:**
- AI-driven optimization
- Budget allocation recommendations
- Lead targeting improvements
- Performance prediction

**Endpoints:**
```
POST   /optimization/analyze-lead — Analyze lead for optimization
POST   /optimization/budget-split  — Calculate optimal budget
POST   /optimization/targeting     — Suggest targeting improvements
```

---

## 🔌 Shared Infrastructure

### Middleware

**HTTPS Enforcement**
- Requires HTTPS in production
- Allows HTTP in development

**Request ID Middleware**
- Generates unique ID per request
- Propagates through logs

**Rate Limiting**
- Global limiter: 100 req/minute
- Auth limiter: 5 attempts/15 minutes
- Register limiter: 3 attempts/hour
- API limiter: per-route limits

**Request Timeout**
- Default: 30 seconds
- Prevents hanging requests

**Timing Middleware**
- Adds X-Response-Time header
- Logs response duration

**Error Handler**
- Catches all errors
- Returns JSON error responses
- Logs errors for debugging

### WebSocket (Socket.io)

Setup:
```typescript
- Initialized with HTTP server
- Namespace: /api/v1
- Authentication: JWT validation
- Events:
  - workflow:execution:started
  - workflow:execution:step:completed
  - notification:sent
  - task:assigned
```

### Types & Utils

Located in `shared/`:
- `types.ts` — Shared interfaces
- `errors.ts` — Custom error classes
- `validators.ts` — Input validation
- `date-utils.ts` — Date manipulation
- `logger.ts` — Logging utility

---

## 🏗️ API Route Structure

```
/api/v1/
├── /auth                    ← Auth module
├── /companies               ← Companies module
├── /leads                   ← Leads module
├── /campaigns               ← Campaigns module
├── /telephony               ← Telephony module
├── /workflows               ← Workflows module
├── /ai                      ← AI module
├── /analytics               ← Analytics module
├── /billing                 ← Billing module
├── /notifications           ← Notifications module
├── /webhooks                ← Webhooks module
├── /agents                  ← Agents module
├── /audit                   ← Audit module
├── /reports                 ← Reports module
├── /tasks                   ← Tasks module
├── /activities              ← Activities module
├── /settings                ← Settings module
├── /growth                  ← Growth module
└── /optimization            ← Optimization module
```

---

## 🔐 Authorization Pattern

All routes follow this pattern:
1. Authentication middleware validates JWT
2. Tenant validation ensures user belongs to correct tenant
3. Authorization checks role (super_admin, company_admin, viewer)
4. Operation-specific permission checks
5. Data filtering by tenantId

---

**Last Updated:** March 29, 2026  
**Module Count:** 18  
**Total Endpoints:** 150+  
**Architecture:** Domain-Driven Design (DDD)
