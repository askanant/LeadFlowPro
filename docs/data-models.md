# LeadFlowPro — Data Models & Database Schema

**Database:** PostgreSQL 15  
**ORM:** Prisma 7.4.2  
**Multi-tenancy:** Enabled (tenant_id on all data tables)

---

## 📊 Complete Data Model Reference

### Core Tenant & Company

#### Company
```
Represents a SaaS tenant/customer
- id: UUID (PK)
- tenantId: String (UNIQUE) - Used for multi-tenancy
- name: String (255)
- industry: String (100, nullable)
- businessType: String (100, nullable)
- description: Text
- targetGeo: JSON { country, states[], cities[] }
- leadCriteria: JSON - AI-readable lead quality rules
- pricingDetails: JSON
- offerDetails: Text
- status: String (active/inactive) default:active
- settings: JSON default:{}
- createdAt: DateTime
- updatedAt: DateTime

Relations:
  → users (1:many)
  → adPlatformCredentials (1:many)
  → campaigns (1:many)
  → leads (1:many)
  → phoneNumbers (1:many)
  → callLogs (1:many)
  → whatsappTemplates (1:many)
  → aiSuggestions (1:many)
  → subscription (1:1)
  → workflows (1:many)
  → workflowExecutions (1:many)
```

#### AdPlatformCredential
```
Stores encrypted API credentials for ad platforms
- id: UUID (PK)
- tenantId: String (FK)
- platform: String (meta, google, linkedin, microsoft, taboola)
- accountId: String (100, nullable)
- accessToken: String (encrypted)
- refreshToken: String (encrypted)
- appId: String (100, nullable)
- appSecret: String (encrypted)
- extraConfig: JSON
- tokenExpiresAt: DateTime (nullable)
- isValid: Boolean default:true
- createdAt: DateTime

Unique: [tenantId, platform]
Relations:
  → company (N:1)
```

---

### Campaigns & Analytics

#### Campaign
```
Ad campaigns with performance tracking
- id: UUID (PK)
- tenantId: String (FK)
- name: String (255)
- platform: String (meta, google, linkedin, etc.)
- platformCampaignId: String (100, nullable) - Platform's ID
- status: String (draft, active, paused, completed)
- dailyBudget: Decimal(12,2)
- totalBudget: Decimal(12,2)
- leadTargetDaily: Int
- leadTargets: JSON { monday: 10, tuesday: 8 } - Weekly breakdown
- targetingConfig: JSON - AI-generated targeting parameters
- startDate: Date
- endDate: Date
- createdAt: DateTime
- updatedAt: DateTime

Relations:
  → company (N:1)
  → leads (1:many)
  → campaignMetrics (1:many)
  → aiSuggestions (1:many)
```

#### CampaignMetric
```
Daily performance metrics per campaign
- id: UUID (PK)
- tenantId: String
- campaignId: String (FK)
- date: Date
- spend: Decimal(12,2)
- impressions: Int
- clicks: Int
- leadsCount: Int
- cpl: Decimal(12,2) - Cost Per Lead
- createdAt: DateTime

Unique: [campaignId, date]
Relations:
  → campaign (N:1)
```

---

### Leads & Lead Management

#### Lead
```
Individual lead records with quality scoring
- id: UUID (PK)
- tenantId: String (FK)
- campaignId: String (FK, nullable)
- platform: String (meta, google, linkedin, etc.)
- platformLeadId: String (200) - Platform's lead ID
- firstName: String (100)
- lastName: String (100)
- email: String (255)
- phone: String (30)
- city: String (100)
- state: String (100)
- customFields: JSON - Custom capture fields
- qualityScore: SmallInt (0-100) - AI-calculated
- churnRisk: Float (0.0-1.0)
- status: String (new, qualified, contacted, converted, lost)
- sourceUrl: Text
- ipAddress: String
- lastActivityAt: DateTime (nullable)
- receivedAt: DateTime
- createdAt: DateTime

Index: [tenantId], [phone]
Unique: [tenantId, platform, platformLeadId]
Relations:
  → company (N:1)
  → campaign (N:1)
  → deliveries (1:many)
  → callLogs (1:many)
  → notes (1:many)
  → tasks (1:many)
  → activities (1:many)
  → workflowExecutions (1:many)
```

#### LeadDelivery
```
Tracks lead delivery to various channels
- id: UUID (PK)
- tenantId: String
- leadId: String (FK)
- channel: String (whatsapp, webhook, email, sms)
- status: String (pending, delivered, failed)
- deliveredAt: DateTime (nullable)
- deliveryLog: JSON - Full API response
- retryCount: SmallInt default:0
- createdAt: DateTime

Relations:
  → lead (N:1)
```

#### LeadNote
```
User-created notes on leads
- id: UUID (PK)
- leadId: String (FK)
- content: Text
- createdBy: String (User email/name)
- createdAt: DateTime

Relations:
  → lead (N:1)
```

---

### Telephony

#### PhoneNumber
```
Purchased phone numbers for outbound/inbound campaigns
- id: UUID (PK)
- tenantId: String (FK)
- number: String (20, UNIQUE)
- provider: String (twilio, plivo, exotel)
- providerSid: String (100) - Provider's internal ID
- routingType: String (forward, ivr, round_robin)
- forwardTo: String (20) - Number to forward to
- isActive: Boolean default:true
- purchasedAt: DateTime

Relations:
  → company (N:1)
  → callLogs (1:many)
```

#### CallLog
```
Records of all telephone interactions
- id: UUID (PK)
- tenantId: String (FK)
- phoneNumberId: String (FK, nullable)
- leadId: String (FK, nullable)
- callSid: String (100, UNIQUE) - Provider call ID
- fromNumber: String (20)
- toNumber: String (20)
- direction: String (inbound, outbound)
- status: String (completed, no-answer, busy, failed)
- durationSeconds: Int
- recordingUrl: String (S3 presigned URL)
- recordingS3Key: String
- startedAt: DateTime
- endedAt: DateTime
- createdAt: DateTime

Index: [tenantId], [leadId]
Relations:
  → company (N:1)
  → phoneNumber (N:1)
  → lead (N:1)
  → leadCallMatches (1:many)
```

#### LeadCallMatch
```
Matches incoming calls to leads (confidence score)
- id: UUID (PK)
- leadId: String (FK)
- callLogId: String (FK)
- confidence: Decimal(3,2) - 0.00 to 1.00
- createdAt: DateTime

Unique: [leadId, callLogId]
Relations:
  → lead (N:1)
  → callLog (N:1)
```

---

### Users & Authorization

#### User
```
Team members with role-based access
- id: UUID (PK)
- tenantId: String (FK)
- email: String (255, UNIQUE)
- passwordHash: String
- firstName: String (100)
- lastName: String (100)
- role: String (super_admin, company_admin, viewer) default:viewer
- isActive: Boolean default:true
- twoFactorEnabled: Boolean default:false
- totpSecret: String (encrypted TOTP secret)
- lastLoginAt: DateTime
- createdAt: DateTime
- updatedAt: DateTime

Relations:
  → company (N:1)
  → auditLogs (1:many)
  → notificationPreferences (1:many)
  → notifications (1:many)
  → taskAssignees (1:many)
  → taskCreators (1:many)
  → activities (1:many)
  → scheduledReports (1:many)
  → savedReports (1:many)
```

#### AuditLog
```
Complete audit trail of all user actions
- id: UUID (PK)
- tenantId: String
- userId: String (FK, nullable)
- action: String (create, update, delete, etc.)
- resource: String (lead, campaign, workflow, etc.)
- resourceId: String (nullable)
- metadata: JSON - Additional context
- ipAddress: String
- createdAt: DateTime

Index: [tenantId]
Relations:
  → user (N:1)
```

---

### Workflows & Automation

#### Workflow
```
Automation workflow definitions
- id: UUID (PK)
- tenantId: String (FK)
- name: String (255)
- description: Text
- status: String (active, paused, archived)
- isDefault: Boolean default:false
- triggerConfig: JSON
- conditions: JSON
- version: Int default:1
- createdAt: DateTime
- updatedAt: DateTime

Unique: [tenantId, name]
Relations:
  → company (N:1)
  → steps (1:many)
  → executions (1:many)
  → triggers (1:many)
  → versions (1:many)
```

#### WorkflowStep
```
Individual actions within a workflow
- id: UUID (PK)
- workflowId: String (FK)
- order: Int - Step order in workflow
- actionType: String (send_sms, send_email, call, webhook, etc.)
- config: JSON - Action-specific configuration
- isEnabled: Boolean default:true
- nextStepOnSuccess: String (nullable) - ID of next step
- nextStepOnFailure: String (nullable)
- conditions: JSON - Step execution conditions
- createdAt: DateTime

Index: [workflowId, order]
Relations:
  → workflow (N:1)
  → executions (1:many)
```

#### WorkflowExecution
```
Instance of a workflow running on a lead
- id: UUID (PK)
- tenantId: String (FK)
- workflowId: String (FK)
- leadId: String (FK)
- status: String (pending, running, completed, failed)
- error: Text (error message if failed)
- metadata: JSON { triggeredBy, triggerId, testRun }
- triggeredAt: DateTime
- completedAt: DateTime (nullable)

Index: [tenantId, workflowId], [leadId], [status]
Relations:
  → company (N:1)
  → workflow (N:1)
  → lead (N:1)
  → stepExecutions (1:many)
```

#### WorkflowStepExecution
```
Execution of individual workflow steps
- id: UUID (PK)
- executionId: String (FK)
- stepId: String (FK)
- status: String (pending, success, failed, skipped)
- result: JSON - Step result/response
- error: Text
- startedAt: DateTime
- completedAt: DateTime

Index: [executionId]
Relations:
  → execution (N:1)
  → step (N:1)
```

#### WorkflowTrigger
```
Triggers that start workflow execution
- id: UUID (PK)
- tenantId: String (FK)
- workflowId: String (FK)
- type: String (scheduled, webhook, lead_score_change, time_since_event, campaign_performance, batch_execution)
- config: JSON - Trigger-specific config
- webhookUrl: Text (nullable)
- webhookSecret: String (encrypted)
- isActive: Boolean default:true
- createdAt: DateTime
- updatedAt: DateTime

Index: [workflowId], [type]
Relations:
  → workflow (N:1)
  → schedule (1:1 optional)
```

#### WorkflowSchedule
```
Cron schedule for triggered workflows
- id: UUID (PK)
- tenantId: String
- triggerId: String (FK, UNIQUE)
- cronExpression: String (100) - Cron format
- timezone: String (50) default:UTC
- lastRunAt: DateTime
- nextRunAt: DateTime
- createdAt: DateTime
- updatedAt: DateTime

Index: [nextRunAt]
Relations:
  → trigger (1:1)
```

#### WorkflowTemplate
```
Reusable workflow templates
- id: UUID (PK)
- name: String (255, UNIQUE)
- description: Text
- category: String (lead-management, campaign-monitoring, engagement)
- workflowDefinition: JSON - Full workflow structure
- isFeatured: Boolean default:false
- usageCount: Int default:0
- createdAt: DateTime
- updatedAt: DateTime

Index: [category]
```

---

### Notifications

#### NotificationPreference
```
User notification settings per event type
- id: UUID (PK)
- tenantId: String
- userId: String (FK)
- notificationType: String (workflow_execution, lead_assignment, lead_status_change)
- channel: String (email, slack)
- enabled: Boolean default:true
- slackChannel: String (255) - e.g., #sales
- slackWebhook: Text (encrypted)
- createdAt: DateTime
- updatedAt: DateTime

Unique: [tenantId, userId, notificationType, channel]
Index: [tenantId, userId]
Relations:
  → user (N:1)
```

#### Notification
```
Sent notifications
- id: UUID (PK)
- tenantId: String
- userId: String (FK, nullable)
- type: String (workflow_execution, lead_assignment, etc.)
- channel: String (email, slack, in_app)
- subject: String (255)
- message: Text
- recipients: JSON - Array of emails/slack IDs
- status: String (pending, sent, failed) default:pending
- sentAt: DateTime
- error: Text
- metadata: JSON { workflowId, leadId, executionId }
- createdAt: DateTime

Index: [tenantId], [status, sentAt]
Relations:
  → user (N:1)
```

---

### Tasks & Activities

#### Task
```
User-assigned tasks (creation, follow-up, etc.)
- id: UUID (PK)
- tenantId: String (FK)
- title: String (255)
- description: Text
- status: String (open, in_progress, completed, cancelled)
- priority: String (low, medium, high, urgent) default:medium
- dueDate: DateTime (nullable)
- assigneeId: String (FK, nullable)
- leadId: String (FK, nullable)
- workflowExecutionId: String (FK, nullable)
- createdBy: String (FK)
- completedAt: DateTime (nullable)
- createdAt: DateTime
- updatedAt: DateTime

Index: [tenantId], [assigneeId], [leadId], [status], [dueDate]
Relations:
  → assignee: User (N:1)
  → creator: User (N:1)
  → lead (N:1)
```

#### Activity
```
Audit trail of all lead/user interactions
- id: UUID (PK)
- tenantId: String
- leadId: String (FK, nullable)
- userId: String (FK, nullable)
- type: String (note, call, email, status_change, score_change, task_created, workflow_run)
- summary: Text
- metadata: JSON
- createdAt: DateTime

Index: [tenantId], [leadId], [createdAt]
Relations:
  → lead (N:1)
  → user (N:1)
```

---

### Analytics & Reporting

#### ScheduledReport
```
Scheduled report generation jobs
- id: UUID (PK)
- tenantId: String
- name: String (255)
- description: Text
- reportType: String (campaign_performance, lead_quality, workflow_metrics, etc.)
- schedule: String (cron expression)
- recipients: JSON - Array of email addresses
- isActive: Boolean default:true
- lastRunAt: DateTime
- nextRunAt: DateTime
- createdBy: String (FK)
- createdAt: DateTime
- updatedAt: DateTime

Index: [tenantId], [nextRunAt]
Relations:
  → creator: User (N:1)
```

#### SavedReport
```
User-saved custom reports
- id: UUID (PK)
- tenantId: String
- name: String (255)
- reportType: String
- config: JSON - Report parameters
- results: JSON (nullable) - Cached results
- createdBy: String (FK)
- createdAt: DateTime
- updatedAt: DateTime

Relations:
  → creator: User (N:1)
```

---

### Billing & Subscriptions

#### Subscription
```
SaaS subscription management
- id: UUID (PK)
- tenantId: String (FK, UNIQUE)
- plan: String (starter, professional, enterprise) default:starter
- stripeCustomerId: String (100)
- stripeSubscriptionId: String (100)
- status: String (active, past_due, canceled, paused)
- currentPeriodStart: DateTime
- currentPeriodEnd: DateTime
- cancelAtPeriodEnd: Boolean default:false
- createdAt: DateTime
- updatedAt: DateTime

Relations:
  → company (1:1)
  → planChanges (1:many)
```

#### PlanChangeLog
```
History of subscription plan changes
- id: UUID (PK)
- subscriptionId: String (FK)
- oldPlan: String (50)
- newPlan: String (50)
- reason: String (100)
- createdAt: DateTime

Relations:
  → subscription (N:1)
```

---

### WhatsApp & AI

#### WhatsappTemplate
```
Pre-approved WhatsApp message templates
- id: UUID (PK)
- tenantId: String (FK)
- name: String (100)
- content: Text
- status: String (pending, approved, rejected) default:pending
- templateId: String (100) - Meta's template ID
- createdAt: DateTime

Relations:
  → company (N:1)
```

#### AiSuggestion
```
AI-generated recommendations for campaigns/leads
- id: UUID (PK)
- tenantId: String (FK)
- campaignId: String (FK, nullable)
- type: String (targeting, budget, creative, lead_engagement)
- suggestion: JSON - Recommendation details
- confidence: SmallInt (0-100)
- applied: Boolean default:false
- createdAt: DateTime

Relations:
  → company (N:1)
  → campaign (N:1)
```

---

## 🔗 Key Relationships Summary

### One-to-Many (1:many)
- Company → Users, Leads, Campaigns, Workflows, etc.
- Campaign → Leads, Metrics
- Workflow → Steps, Executions, Triggers, Versions
- User → Tasks (assigned), Tasks (created), Audit logs, etc.
- Lead → CallLogs, Deliveries, Notes, Activities, Tasks

### One-to-One (1:1)
- Company ↔ Subscription
- Workflow ↔ WorkflowVersion
- WorkflowTrigger ↔ WorkflowSchedule

### Many-to-One (N:1)
- Lead → Campaign
- Task → Lead, User (assignee), User (creator)
- Activity → Lead, User

---

## 🔒 Tenant Isolation

All tables include `tenantId` column to enable SaaS multi-tenancy:
- All queries filter by `tenantId` at application level
- Database indexes include `tenantId` for performance
- Foreign keys enforce relationships within same tenant
- Audit logging tracks all cross-tenant operations

---

## 📈 Performance Considerations

### Indexed Fields
- `tenantId` — Used in virtually every query
- `leadId` — Lead-specific operations are frequent
- `campaignId` — Campaign filtering
- `workflowId`, `executionId` — Workflow tracking
- `status` — Filtering by status is common
- `createdAt` — Time-range queries
- Composite indexes for multi-field filters

### Unique Constraints
- `User.email` — Email login uniqueness
- `Company.tenantId` — Tenant uniqueness
- `Lead.uniqueTenantPlatformId` — Prevent duplicates
- `Campaign.campaignId`,`date` — Prevent metric duplicates
- `Workflow.name` per tenant — Friendly naming

---

**Last Updated:** March 29, 2026  
**Schema Version:** 1.0.0  
**Total Models:** 40+  
**Total Relationships:** 80+
