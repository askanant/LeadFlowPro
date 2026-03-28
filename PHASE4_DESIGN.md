# Phase 4: Real-Time Intelligence & Task Management

## Overview

Phase 4 extends LeadFlowPro with **real-time capabilities**, an **activity/task management system**, **enhanced AI features**, and **production hardening**. This phase bridges the gap between the existing workflow automation (Phase 3) and a fully-operational team productivity platform.

### Current State (Post-Phase 3)

| Module | Status |
|--------|--------|
| Auth & RBAC | Complete (JWT + refresh, 3 roles, tenant isolation) |
| Companies / Campaigns / Leads | Complete (full CRUD, metrics) |
| AI Scoring & Insights | Complete (multi-factor scoring, ICP matching, conversion prediction) |
| Telephony | Complete (phone numbers, call logs, lead-call matching) |
| Workflows | Complete (DAG builder, 14 action types, 9 trigger types, templates, versioning, cloning, analytics dashboard, debug trace) |
| Billing | Complete (Stripe integration) |
| Notifications | Complete (email/Slack preferences) |
| Security | Complete (rate limiting, input sanitization, audit logging, CORS) |

### Phase 4 Goals
1. **Real-time updates** — WebSocket layer for live data push (executions, notifications, dashboards)
2. **Task & Activity management** — Team-facing task system with assignments, due dates, and activity timeline
3. **Advanced AI** — Churn prediction, lead routing recommendations, smart scheduling
4. **Reporting upgrades** — Scheduled email reports, PDF export, custom report builder
5. **Production hardening** — Redis-backed rate limiting, 2FA, audit log viewer

---

## Phase 4 Features

### 1. Real-Time WebSocket Layer
**Goal**: Push live updates to connected clients instead of polling

#### Architecture
- Socket.IO server attached to the existing Express app (port 3000)
- JWT-authenticated WebSocket connections (verify token on handshake)
- Room-based isolation: each tenant gets a private room (`tenant:{tenantId}`)
- Event channels:
  - `workflow:execution` — live execution status updates (step started/completed/failed)
  - `notification:new` — push new notifications instantly
  - `lead:updated` — lead status/score changes
  - `dashboard:metrics` — periodic dashboard stat refreshes

#### Schema Changes
None — WebSocket is transport-only, no new models.

#### Implementation
**Server:**
```typescript
// src/shared/websocket/socket.ts
import { Server as SocketIOServer } from 'socket.io';

export function initializeWebSocket(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, { cors: { origin: ... } });

  io.use(async (socket, next) => {
    // Verify JWT from handshake auth
  });

  io.on('connection', (socket) => {
    socket.join(`tenant:${socket.data.tenantId}`);
  });

  return io;
}
```

**Emit Pattern:**
```typescript
// Inside WorkflowEngine after step execution:
io.to(`tenant:${tenantId}`).emit('workflow:execution', {
  executionId, stepId, status, result
});
```

**Frontend:**
```typescript
// src/hooks/useSocket.ts — React hook for socket connection
// Auto-connect on auth, auto-disconnect on logout
// useSocketEvent('workflow:execution', handler) for subscriptions
```

---

### 2. Task & Activity Management
**Goal**: CRM-style task tracking with assignments, due dates, and lead activity timeline

#### Schema Changes
```prisma
model Task {
  id          String    @id @default(uuid())
  tenantId    String
  title       String
  description String?
  status      String    @default("open")   // open | in_progress | completed | cancelled
  priority    String    @default("medium") // low | medium | high | urgent
  dueDate     DateTime?
  assigneeId  String?
  leadId      String?
  workflowExecutionId String?
  createdBy   String
  completedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  assignee    User?     @relation("TaskAssignee", fields: [assigneeId], references: [id])
  lead        Lead?     @relation(fields: [leadId], references: [id])
  creator     User      @relation("TaskCreator", fields: [createdBy], references: [id])

  @@index([tenantId])
  @@index([assigneeId])
  @@index([leadId])
  @@index([dueDate])
  @@map("tasks")
}

model Activity {
  id         String   @id @default(uuid())
  tenantId   String
  leadId     String?
  userId     String?
  type       String   // note | call | email | status_change | score_change | task_created | workflow_run
  summary    String
  metadata   Json?
  createdAt  DateTime @default(now())

  lead       Lead?    @relation(fields: [leadId], references: [id])
  user       User?    @relation(fields: [userId], references: [id])

  @@index([tenantId])
  @@index([leadId])
  @@index([createdAt])
  @@map("activities")
}
```

#### API Endpoints
```
POST   /api/v1/tasks                — Create task
GET    /api/v1/tasks                — List tasks (filter: status, assignee, lead, priority, due date range)
GET    /api/v1/tasks/:id            — Get task
PATCH  /api/v1/tasks/:id            — Update task (status, assignee, due date)
DELETE /api/v1/tasks/:id            — Delete task
GET    /api/v1/tasks/my             — My assigned tasks (current user)
GET    /api/v1/tasks/overdue        — Overdue tasks

GET    /api/v1/activities           — List activities (filter: leadId, userId, type, date range)
POST   /api/v1/activities           — Log activity manually
GET    /api/v1/leads/:id/activities — Lead activity timeline
GET    /api/v1/leads/:id/tasks      — Tasks linked to a lead
```

#### Frontend Pages
- **Tasks page** (`/tasks`) — Kanban board view (open → in progress → completed), list view toggle, filters, create task modal
- **My Tasks widget** — Dashboard card showing upcoming/overdue tasks
- **Lead Activity Timeline** — Tab on LeadDetail showing chronological activity feed (calls, emails, status changes, notes, workflow runs)

---

### 3. Advanced AI Features
**Goal**: Leverage existing AI infrastructure for proactive intelligence

#### 3a. Churn Prediction
- Analyze lead engagement patterns (last activity, email opens, call frequency)
- Score each lead with a churn risk (0-100)
- Surface high-churn-risk leads on dashboard
- API: `GET /api/v1/ai/leads/:id/churn-risk`

#### 3b. Smart Lead Routing
- Recommend best agent for a lead based on agent performance, workload, and specialization
- API: `GET /api/v1/ai/leads/:id/routing-recommendation`
- Returns: `{ recommendedAgentId, reason, confidence }`

#### 3c. Smart Scheduling
- Suggest optimal contact times based on lead timezone, historical response data
- API: `GET /api/v1/ai/leads/:id/best-contact-time`
- Returns: `{ bestTimes: [{ day, hour, confidence }] }`

#### Schema Changes
```prisma
// Add to Lead model:
  churnRisk     Float?
  lastActivityAt DateTime?
  activities    Activity[]
  tasks         Task[]
```

---

### 4. Reporting Upgrades
**Goal**: Move beyond live dashboards to shareable, exportable reports

#### 4a. PDF Report Export
- Server-side PDF generation for:
  - Campaign performance report
  - Lead scoring summary
  - Workflow execution summary
- API: `GET /api/v1/reports/:type/pdf?filters=...` → returns PDF stream
- Uses: `@react-pdf/renderer` or `puppeteer` for HTML→PDF

#### 4b. Scheduled Email Reports
- Users configure weekly/monthly report delivery
- New model:

```prisma
model ScheduledReport {
  id          String   @id @default(uuid())
  tenantId    String
  name        String
  reportType  String   // campaign_performance | lead_scoring | workflow_summary
  schedule    String   // cron expression
  recipients  String[] // email addresses
  filters     Json?
  isActive    Boolean  @default(true)
  lastSentAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([tenantId])
  @@map("scheduled_reports")
}
```

- API: Full CRUD on `/api/v1/reports/scheduled`
- Cron job sends reports via existing nodemailer integration

#### 4c. Custom Report Builder
- Frontend page where users select metrics, dimensions, date ranges, and chart types
- Save/load report configurations
- Share reports via link

---

### 5. Production Hardening
**Goal**: Close remaining security and infrastructure gaps

#### 5a. Two-Factor Authentication (2FA)
- TOTP-based 2FA using `otpauth` library
- New fields on User: `twoFactorSecret`, `twoFactorEnabled`
- Enrollment flow: generate secret → QR code → verify code → enable
- Login flow: after password verification, require TOTP code if 2FA is enabled
- API:
  - `POST /api/v1/auth/2fa/setup` → returns QR code + secret
  - `POST /api/v1/auth/2fa/verify` → verify code and enable
  - `POST /api/v1/auth/2fa/validate` → validate code during login
  - `POST /api/v1/auth/2fa/disable` → disable 2FA

#### 5b. Redis-Backed Rate Limiting
- Replace in-memory rate limiter with Redis (`ioredis`)
- Survives server restarts, works across multiple instances
- Configuration via environment variables

#### 5c. Audit Log Viewer
- Frontend page (`/audit-log`) for super_admins
- Search, filter by user/action/date
- API: `GET /api/v1/audit-logs?user=&action=&from=&to=&page=&limit=`

---

## Sprint Breakdown

### Sprint 21: Task & Activity System (Backend + Frontend)
- [ ] Schema: Task and Activity models, prisma db push
- [ ] Task service (CRUD, my-tasks, overdue query)
- [ ] Task router with all endpoints
- [ ] Activity service (log, list, lead timeline)
- [ ] Activity router
- [ ] Frontend: Tasks page (Kanban + list views)
- [ ] Frontend: Create/edit task modal
- [ ] Frontend: Dashboard "My Tasks" widget
- [ ] Frontend: LeadDetail activity timeline tab
- [ ] Wire create-task workflow action to Task model

### Sprint 22: Real-Time WebSocket Layer
- [ ] Install socket.io + @types/socket.io
- [ ] WebSocket server initialization on Express httpServer
- [ ] JWT auth middleware for WebSocket handshake
- [ ] Tenant room isolation
- [ ] Emit workflow execution events from WorkflowEngine
- [ ] Emit notification events from notification service
- [ ] Frontend: useSocket hook (connect/disconnect/auth)
- [ ] Frontend: useSocketEvent hook (subscribe to events)
- [ ] Live execution status on WorkflowExecutionDetail
- [ ] Live notification badge count
- [ ] Dashboard auto-refresh via WebSocket

### Sprint 23: Advanced AI Features
- [ ] Churn prediction service (engagement scoring algorithm)
- [ ] Churn risk API endpoint
- [ ] Smart lead routing service (agent matching)
- [ ] Routing recommendation API endpoint
- [ ] Best contact time service (timezone + history analysis)
- [ ] Contact time API endpoint
- [ ] Frontend: Churn risk indicator on LeadDetail
- [ ] Frontend: Routing recommendation on LeadAssignment
- [ ] Frontend: Best contact time on LeadDetail
- [ ] Add lastActivityAt tracking to Lead model

### Sprint 24: Reporting Upgrades
- [ ] PDF report generation service (campaign, lead scoring, workflow)
- [ ] PDF export API endpoints
- [ ] ScheduledReport model + service + router
- [ ] Cron job for scheduled report delivery (via nodemailer)
- [ ] Frontend: Report export buttons on Analytics/Reporting pages
- [ ] Frontend: Scheduled Reports management page
- [ ] Frontend: Custom Report Builder page (metric/dimension selector, chart preview, save/load)

### Sprint 25: Production Hardening
- [ ] 2FA TOTP implementation (otpauth library)
- [ ] 2FA enrollment + login flow (backend)
- [ ] Frontend: 2FA setup page in Settings
- [ ] Frontend: 2FA verification during login
- [ ] Redis-backed rate limiting (ioredis)
- [ ] Audit Log Viewer page (frontend)
- [ ] Audit Log API with pagination + filters
- [ ] E2E tests for new features

---

## Testing Strategy

### Unit Tests
- Task service (CRUD, overdue, assignment filtering)
- Activity service (logging, timeline query)
- Churn prediction algorithm
- 2FA TOTP verification
- PDF generation output

### Integration Tests
- WebSocket connection + authentication
- Task creation via workflow action
- Scheduled report cron execution
- Redis rate limiting across requests

### E2E Tests
- Task lifecycle (create → assign → complete)
- Real-time execution updates (WebSocket)
- 2FA enrollment, login, and disable
- PDF export download
- Activity timeline rendering

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `socket.io` | WebSocket server |
| `socket.io-client` | Frontend WebSocket client |
| `otpauth` | TOTP 2FA generation/verification |
| `qrcode` | QR code generation for 2FA enrollment |
| `ioredis` | Redis client for rate limiting |
| `@react-pdf/renderer` or `puppeteer` | PDF report generation |

---

## Success Metrics

- WebSocket connection reliability > 99.5%
- Task creation-to-completion avg < 48h
- Churn prediction accuracy > 70% (validated against actual outcomes)
- PDF reports generated < 5s
- 2FA adoption > 50% of admin users
- Zero open critical security audit findings
