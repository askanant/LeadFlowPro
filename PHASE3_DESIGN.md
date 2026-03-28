# Phase 3: Advanced Workflow Automation

## Overview
Phase 3 extends the existing workflow system (Phase 2 baseline) with enterprise-grade workflow automation capabilities including advanced triggers, complex conditional logic, rich action types, and visual workflow builder.

## Current State (Phase 2 Baseline)

### Existing Capabilities
- **Workflow CRUD**: Create, read, update, delete workflows and steps
- **Trigger Types**: `lead_status_change`, `lead_created`, `call_completed`, `manual`
- **Condition Evaluation**: Basic rules (qualityScore, status, customFields)
- **Action Executors** (5): notify-agents, update-quality, assign-agent, log-event, update-metrics
- **Execution Tracking**: Workflow execution + step execution records with status/error/timing
- **Workflow Status**: Active/Inactive with isDefault flag

### Data Model
```prisma
model Workflow
  id String
  tenantId String
  name String
  description String?
  triggerConfig Json?           // { type: 'lead_status_change', ... }
  conditions Json?              // { minQualityScore: 50, status: 'qualified' }
  status 'active' | 'inactive'
  isDefault Boolean
  createdAt DateTime
  updatedAt DateTime
  steps WorkflowStep[]
  executions WorkflowExecution[]

model WorkflowStep
  id String
  workflowId String
  order Int
  actionType String             // 'notify-agents' | 'update-quality' | ...
  config Json?
  isEnabled Boolean
  createdAt DateTime
  updatedAt DateTime

model WorkflowExecution
  id String
  workflowId String
  leadId String
  status 'pending' | 'running' | 'completed' | 'failed'
  result Json?
  error String?
  triggeredAt DateTime
  completedAt DateTime?
  steps WorkflowStepExecution[]

model WorkflowStepExecution
  id String
  executionId String
  stepId String
  status 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  result Json?
  error String?
  startedAt DateTime?
  completedAt DateTime?
```

## Phase 3 Features

### 1. Advanced Triggers
**Goal**: Support event-based, time-based, and threshold-based workflow triggers

#### New Trigger Types
- `scheduled` — Cron-based execution (daily, weekly, specific times)
- `webhook` — Trigger via external webhook (supports Zapier, Make, etc.)
- `lead_score_change` — When lead quality score changes (up/down/threshold)
- `lead_engagement` — When lead has activity (call, email open, form submission)
- `time_since_event` — X days since last contact / status change / creation
- `campaign_performance` — When campaign metrics hit thresholds (spend, leads, ROI)
- `batch_execution` — Bulk execution on lead list (filtered by status, score, platform)

#### Implementation
**Schema Changes:**
```prisma
model WorkflowTrigger
  id String
  workflowId String
  type String // 'scheduled' | 'webhook' | 'lead_score_change' | ...
  config Json // trigger-specific config
  webhookUrl String? // for webhook triggers
  webhookSecret String? // for security
  isActive Boolean
  createdAt DateTime

model WorkflowSchedule
  id String
  workflowId String
  cronExpression String  // '0 9 * * MON' = 9am Monday
  timezone String        // 'America/New_York'
  lastRun DateTime?
  nextRun DateTime
  createdAt DateTime
```

**API Endpoints:**
```
POST   /api/v1/workflows/:id/triggers          — Add trigger
PATCH  /api/v1/workflows/:id/triggers/:triggerId — Update trigger
DELETE /api/v1/workflows/:id/triggers/:triggerId — Delete trigger
POST   /api/v1/workflows/webhook/:webhookId    — Receive webhook
POST   /api/v1/workflows/:id/schedule-run      — Test scheduled run
```

---

### 2. Conditional Logic & Branching
**Goal**: Support complex decision trees and multi-condition logic

#### New Condition Types
- Multi-condition rules with AND/OR logic
- Comparison operators: `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `starts_with`
- Lead field conditions: qualityScore, status, source, platform, city, custom fields
- Time conditions: lead age (days since creation), last contact (days since last activity)
- Campaign conditions: campaign platform, status, ROI performance
- Aggregation: count of leads in status, total spend in date range

#### Branching Implementation
Each workflow step can have optional `nextStepOnSuccess` / `nextStepOnFailure` for conditional routing:

```json
{
  "steps": [
    {
      "id": "step-1",
      "order": 1,
      "actionType": "evaluate-lead",
      "config": {
        "rules": [
          { "field": "qualityScore", "operator": ">=", "value": 80 }
        ]
      },
      "nextStepOnSuccess": "step-2",   // Route if pass
      "nextStepOnFailure": "step-3"    // Route if fail
    },
    {
      "id": "step-2",
      "order": 2,
      "actionType": "assign-agent",
      "config": { "agentId": "..." }
    },
    {
      "id": "step-3",
      "order": 3,
      "actionType": "notify-agents",
      "config": { "message": "Lead needs qualification" }
    }
  ]
}
```

**Schema Changes:**
```prisma
model WorkflowStep
  ...
  nextStepOnSuccess String?    // ID of next step if action succeeds
  nextStepOnFailure String?    // ID of next step if action fails
  conditions Json?             // Complex condition rules for step execution
```

---

### 3. Rich Action Types
**Goal**: Support email, SMS, webhooks, API calls, and lead updates

#### New Action Executors
- `send-email` — Send email to lead using email template
- `send-sms` — Send SMS via Twilio/MessageBird
- `send-webhook` — Call external webhook with lead data
- `update-lead` — Update lead fields (custom fields, tags, notes)
- `assign-campaign` — Add lead to campaign
- `create-task` — Create follow-up task for agent
- `add-note` — Add note to lead
- `create-event` — Log event for analytics
- `condition-check` — Evaluate conditions (returns pass/fail)

#### Implementation
**Executor Base Class:**
```typescript
export interface IActionExecutor {
  execute(config: Record<string, any>, context: ActionExecutionContext): Promise<StepExecutionResult>;
  validate(config: Record<string, any>): { valid: boolean; errors?: string[] };
  getSchema(): {
    title: string;
    description: string;
    configSchema: any;
  };
}
```

**Example: Send Email Action**
```typescript
export class SendEmailExecutor implements IActionExecutor {
  async execute(config: SendEmailConfig, context: ActionExecutionContext) {
    const { templateId, recipientEmail, variables } = config;

    // Fetch template
    // Render with variables
    // Send via email service
    // Track in audit log

    return { success: true, data: { messageId, timestamp } };
  }
}
```

---

### 4. Workflow Templates
**Goal**: Pre-built workflow templates for common scenarios

#### Template Library
- Lead Scoring & Routing — Auto-qualify high-scoring leads, assign to agents
- New Lead Welcome — Send email, create task, assign agent
- Inactive Lead Re-engagement — Score leads, send campaign, notify agents if low engagement
- Campaign Performance Monitor — Track campaign metrics, notify on ROI drop
- Lead Deduplication — Detect duplicates, merge, reassign

#### Implementation
**Schema:**
```prisma
model WorkflowTemplate
  id String
  name String
  description String
  category String // 'lead-management' | 'campaign-monitoring' | 'engagement'
  workflowDefinition Json // Full workflow structure
  isFeatured Boolean
  usageCount Int
  createdAt DateTime
  updatedAt DateTime
```

**API:**
```
GET    /api/v1/workflows/templates          — List templates
GET    /api/v1/workflows/templates/:id      — Get template details
POST   /api/v1/workflows/from-template      — Create workflow from template
       { templateId, name, customizations }
```

---

### 5. Workflow Execution History & Analytics
**Goal**: Comprehensive visibility into workflow executions

#### Execution Dashboard
- Execution list with filtering (status, workflow, date range, lead)
- Execution details view with step-by-step trace
- Error analysis and debugging
- Performance metrics (avg execution time, success rate)
- Replay / retry failed executions

#### Schema Enhancement
```prisma
model WorkflowExecution
  ...
  triggerType String         // 'manual' | 'scheduled' | 'webhook' | ...
  triggeredBy String?        // userId for manual triggers
  retryCount Int @default(0)
  parentExecutionId String?  // For replayed executions
  metadata Json?             // Additional context

model WorkflowStepExecution
  ...
  order Int                  // Step order for UI sorting
  output Json?               // Serialized action result
```

#### APIs
```
GET    /api/v1/workflows/:id/executions           — List executions (paginated)
GET    /api/v1/workflows/executions/:executionId  — Get execution details
POST   /api/v1/workflows/executions/:executionId/replay — Retry execution
GET    /api/v1/workflows/:id/analytics            — Execution stats
       { period: '7d' | '30d' | '90d' }
```

---

### 6. Visual Workflow Builder (Frontend)
**Goal**: Drag-and-drop UI for designing workflows without code

#### Components
- **Canvas** — Drag-and-drop node editor
- **Node Types**
  - Trigger node (start)
  - Action node (do something)
  - Condition node (if/then)
  - End node
- **Node Configuration Panel** — Edit action/condition config
- **Connection Lines** — Show flow between nodes
- **Sidebar** — Action palette, templates, properties

#### Pages
- `/portal/workflows` — List view + create button
- `/portal/workflows/:id/builder` — Visual builder
- `/portal/workflows/:id/executions` — Execution history
- `/portal/workflows/:id/debug/:executionId` — Step-by-step trace

---

## Sprint Breakdown

### Sprint 15: Advanced Triggers & Scheduling
- [ ] Schema: WorkflowTrigger, WorkflowSchedule models
- [ ] Scheduled trigger executor (cron + timezone)
- [ ] Webhook trigger endpoint + validation
- [ ] Trigger management endpoints (add/update/delete)
- [ ] Trigger test/preview endpoint
- [ ] Frontend: Trigger configuration UI
- [ ] Frontend: Webhook URL generation
- [ ] Backend queue (BullMQ/Node cron for scheduled triggers)

### Sprint 16: Conditional Logic & Branching
- [ ] Schema: Step nextStepOnSuccess, nextStepOnFailure, conditions
- [ ] Update WorkflowEngine to support branching logic
- [ ] Complex condition evaluator (AND/OR, operators)
- [ ] ConditionCheckExecutor action
- [ ] Frontend: Condition builder UI
- [ ] Frontend: Node connections/branching in canvas
- [ ] E2E tests: Branching scenarios

### Sprint 17: Rich Action Types
- [ ] SendEmailExecutor + template support
- [ ] SendSmsExecutor + Twilio integration
- [ ] SendWebhookExecutor + retry logic
- [ ] UpdateLeadExecutor
- [ ] AssignCampaignExecutor
- [ ] CreateTaskExecutor
- [ ] AddNoteExecutor
- [ ] Frontend: Action configuration panels for each executor
- [ ] E2E tests: Action execution scenarios

### Sprint 18: Workflow Templates
- [ ] Database seed: 5 template workflows
- [ ] Template listing/detail APIs
- [ ] Clone workflow from template endpoint
- [ ] Frontend: Template browser + preview
- [ ] Frontend: Template customization modal
- [ ] E2E tests: Template creation flow

### Sprint 19: Visual Workflow Builder
- [ ] React Flow integration for canvas
- [ ] Trigger/Action/Condition node components
- [ ] Drag-and-drop node creation
- [ ] Node configuration panel
- [ ] Connection/branching UI
- [ ] Workflow validation before save
- [ ] Frontend: Builder page layout
- [ ] E2E tests: Builder interactions

### Sprint 20: Execution History & Analytics
- [ ] Execution list page with filters
- [ ] Execution detail/trace view
- [ ] Replay execution endpoint
- [ ] Analytics aggregation queries
- [ ] Frontend: Analytics dashboard
- [ ] Frontend: Execution step trace view
- [ ] Error debugging/retry UI
- [ ] CSV export for executions

## Testing Strategy

### Unit Tests
- Condition evaluators (all operators and combinations)
- Trigger validators (config validation)
- Action executors (each action type)
- Workflow engine branching logic

### Integration Tests
- Multi-step workflows with branching
- Scheduled trigger execution (mock time)
- Webhook trigger + authentication
- Cross-tenant isolation

### E2E Tests
- Create workflow with triggers
- Execute workflow (manual + scheduled)
- View execution history
- Use template to create workflow
- Visual builder: create/edit/save workflow

## Success Metrics
- Workflow execution success rate > 99%
- Average workflow execution time < 5s
- Support 100+ concurrent workflow executions
- Visual builder usability (task completion > 80%)
- Template adoption (> 30% of users use templates)

## Security Considerations
- Webhook signature verification (HMAC-SHA256)
- API rate limiting on trigger endpoints
- Tenant isolation on all operations
- Audit log for workflow changes
- Mask sensitive config (API keys, passwords)

## Dependencies
- BullMQ or Node-cron for scheduled triggers
- React Flow for visual builder
- Email service integration (existing)
- SMS service (Twilio/MessageBird)
- External webhook retry library

## Open Decisions
1. Branching logic: Node-based (React Flow) vs declarative JSON?
   - **Decision**: Node-based for UX, serialize to JSON for storage
2. Condition complexity: Simple AND/OR vs full expression language?
   - **Decision**: Start with AND/OR, extend to expressions in Phase 4
3. Execution concurrency: Sequential vs parallel step execution?
   - **Decision**: Sequential (simpler), with async action support
4. Workflow versioning: Support multiple versions or always latest?
   - **Decision**: Always latest for Phase 3, add versioning in Phase 4
