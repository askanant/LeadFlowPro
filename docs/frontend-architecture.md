# LeadFlowPro — Frontend Architecture & Component Guide

**Framework:** React 19  
**Build Tool:** Vite 7.3.1  
**Language:** TypeScript  
**State Management:** Zustand 5.0  
**HTTP Client:** Axios + TanStack React Query 5  
**Router:** React Router DOM 7  
**Styling:** TailwindCSS 4 + Lucide React icons

---

## 📁 Frontend Structure

```
apps/web/
├── src/
│   ├── pages/            ← 35+ page components
│   ├── components/       ← Reusable UI components
│   ├── hooks/            ← Custom React hooks
│   ├── store/            ← Zustand state management
│   ├── api/              ← API client & queries
│   ├── utils/            ← Helper functions
│   ├── lib/              ← Utility libraries
│   ├── assets/           ← Images, icons, fonts
│   ├── App.tsx           ← Root app component
│   ├── main.tsx          ← Entry point
│   └── index.css         ← Global styles
├── public/               ← Static assets
├── vite.config.ts        ← Vite configuration
├── tsconfig.json         ← TypeScript config
└── tailwind.config.ts    ← TailwindCSS config
```

---

## 📄 Page Catalog

### Authentication & Onboarding
1. **Login.tsx** — User login form
   - Email/password input
   - Error messages
   - "Forgot password" link
   - Redirect to dashboard on success

2. **Register.tsx** — New account creation
   - Email, password, name fields
   - Email verification
   - Terms acceptance

3. **Setup.tsx** — Initial company setup
   - Company profile creation
   - Industry selection
   - Target geography configuration
   - Ad platform credential setup

### Dashboard & Analytics
4. **Dashboard.tsx** — Main dashboard
   - KPI cards (leads, spend, ROI)
   - Recent campaigns list
   - Workflow execution status
   - Activity timeline

5. **Analytics.tsx** — Detailed analytics view
   - Date range selector
   - Metric selection
   - Charts & visualizations
   - Export to CSV

6. **AdvancedReporting.tsx** — Custom report builder
   - Report type selection
   - Filter configuration
   - Metric combination
   - Report scheduling

### Lead Management
7. **Leads.tsx** — Lead list view
   - Paginated table
   - Filters (status, quality score, date)
   - Bulk actions
   - Column customization
   - Quick actions (call, email)

8. **LeadDetail.tsx** — Individual lead profile
   - Personal information
   - Contact history
   - Activity timeline
   - Quality score breakdown
   - Task assignment
   - Note taking

9. **LeadInsights.tsx** — Lead intelligence view
   - AI-powered insights
   - Recommendation cards
   - Similar leads
   - Next best action suggestions

10. **LeadAssignment.tsx** — Manage lead routing
    - Create assignment rules
    - Round-robin configuration
    - Skills-based routing setup

11. **BulkScoringDashboard.tsx** — Batch lead scoring
    - Upload lead list
    - Scoring parameters
    - Re-score existing leads
    - Results export

### Campaign Management
12. **Campaigns.tsx** — Campaign list
    - Multi-platform view
    - Status filters
    - Budget tracking
    - Quick campaign creation
    - Bulk operations

13. **CampaignDetail.tsx** — Campaign settings & metrics
    - Campaign configuration
    - Performance metrics
    - Daily metrics chart
    - Budget visualization
    - Lead target settings

14. **CampaignOptimizer.tsx** — AI-powered campaign optimization
    - Performance analysis
    - Optimization suggestions
    - Budget reallocation preview
    - Targeting recommendations

15. **SpendOptimizer.tsx** — Budget allocation tool
    - Multi-campaign view
    - Budget distribution UI
    - ROI simulation
    - Apply changes

### Workflow Automation
16. **Workflows.tsx** — Workflow list view
    - All workflows with status
    - Quick enable/disable
    - Template usage
    - Execution history link

17. **WorkflowBuilder.tsx** — Visual workflow designer
    - Drag-drop step interface
    - Trigger configuration
    - Step action selection
    - Condition builder
    - Step ordering
    - Preview/test workflow

18. **WorkflowDetail.tsx** — Workflow view & edit
    - Workflow overview
    - Execution metrics
    - Version history
    - Rollback capability

19. **WorkflowExecutionDetail.tsx** — Drill into specific workflow run
    - Step-by-step results
    - Error messages
    - Performance timing
    - Logs & outputs

20. **WorkflowExecutionDebug.tsx** — Development/debugging view
    - Full execution payload
    - JSON output viewer
    - Step timing analysis
    - Error inspection

21. **WorkflowScheduleCalendar.tsx** — View scheduled workflow executions
    - Calendar view of triggers
    - Execution history
    - Next scheduled runs

22. **WorkflowTemplates.tsx** — Browse & apply templates
    - Template categories
    - Quick apply
    - Template customization

23. **WorkflowAnalyticsDashboard.tsx** — Workflow performance analytics
    - Execution metrics
    - Success rate trending
    - Step performance breakdown

### Operational & Admin
24. **Tasks.tsx** — Task list & management
    - My tasks view
    - Assigned to others
    - Priority filtering
    - Due date tracking
    - Task creation

25. **NotificationSettings.tsx** — User notification preferences
    - Channel selection (email, Slack)
    - Notification type toggles
    - Slack webhook configuration

26. **AuditLogs.tsx** — User action history
    - Searchable audit log
    - Filter by user/action/resource
    - Timestamp & IP tracking

27. **Billing.tsx** — Subscription & billing management
    - Current plan display
    - Payment method
    - Invoice history
    - Plan upgrade/downgrade
    - Usage metrics

28. **Companies.tsx** — Company/tenant list (super admin)
    - All companies view
    - Company details
    - Plan assignment
    - Disable/enable company

29. **Settings.tsx** — Company settings
    - Profile configuration
    - Lead criteria rules
    - Default preferences
    - Integration setup

30. **Telephony.tsx** — Phone number management
    - Purchased numbers list
    - Purchase new number
    - Routing configuration
    - Call log export

### Specialized Tools
31. **LeadFlowBooster.tsx** — Advanced lead optimization
    - Lead scoring recalibration
    - Quality rule testing
    - Bulk enrichment

32. **ReportBuilder.tsx** — Custom report creation interface
    - Metric selection
    - Date range selection
    - Comparison options
    - Scheduling setup

33. **ScheduledReports.tsx** — Manage automated reports
    - Report list
    - Schedule display
    - Edit/delete
    - Delivery settings

34. **CampaignAnalytics.tsx** (part of CampaignDetail)
    - Campaign-specific metrics
    - Lead quality distribution
    - Cost trends
    - Conversion funnel

### Portal Pages
35. **portal/** — Client-facing portal
    - WhatsApp business integration
    - API documentation
    - Webhook testing tool

---

## 🧩 Component Architecture

### Component Library (`components/`)

**Layout Components**
- `Layout.tsx` — Main app layout (sidebar navigation, top bar)
- `PortalLayout.tsx` — Client portal layout

**UI Components (Reusable)**
- `Button.tsx` — Button variants (primary, secondary, danger)
- `Badge.tsx` — Status/category badges
- `Skeleton.tsx` — Loading placeholder
- `LoadingSpinner.tsx` — Animated loader
- `Toast.tsx` — Notifications toast
- `EmptyState.tsx` — Empty list/state messaging

**Feature Components**
- `AddCompanyModal.tsx` — Company creation dialog
- `CreateCampaignModal.tsx` — Quick campaign creation
- `WorkflowStepForm.tsx` — Workflow step editor
- `LeadIntelligenceCard.tsx` — AI insights card
- `LeadRecommendationsWidget.tsx` — Recommendations widget
- `JsonViewer.tsx` — JSON data display

**Data Visualization**
- Uses `Recharts` for charts
- Uses `@xyflow/react` for workflow diagram
- Custom styling with TailwindCSS

---

## 🎯 State Management (Zustand)

Location: `src/store/`

**Store Modules:**
```typescript
// authStore - Authentication state
{
  user: User
  isAuthenticated: boolean
  login(email, password)
  logout()
  setUser(user)
}

// uiStore - UI state
{
  sidebarOpen: boolean
  notifications: Notification[]
  toggleSidebar()
  addNotif(notification)
  removeNotif(id)
}

// queryStore - API query cache
{
  queryCache: Map
  setQueryData(key, data)
  invalidateQueries(key)
}

// filterStore - Active filters
{
  filters: Record<string, any>
  setFilter(key, value)
  clearFilters()
}

// workflowStore - Workflow builder state
{
  workflowDraft: Workflow
  selectedStep: WorkflowStep | null
  addStep(step)
  updateStep(id, data)
  deleteStep(id)
}
```

---

## 🌐 API Communication

### Architecture
- **HTTP Client:** Axios instance with interceptors
- **Query Client:** TanStack React Query for caching & sync
- **Configuration:** Base URL from environment

### Location: `src/api/`

**Query Hooks (TanStack React Query)**
```typescript
// Auto-refetch, caching, deduping, error states
useLeads()          // GET /leads
useLeadDetail(id)   // GET /leads/:id
useCampaigns()      // GET /campaigns
useWorkflows()      // GET /workflows
useAnalytics(range) // GET /analytics/dashboard
```

**Mutation Hooks**
```typescript
// Create, update, delete operations
useCreateLead()     // POST /leads
useUpdateLead()     // PUT /leads/:id
useDeleteLead()     // DELETE /leads/:id
useExecuteWorkflow() // POST /workflows/:id/test
```

**API Client Instance**
```typescript
// Configured with:
// - Base URL: process.env.REACT_APP_API_URL
// - JWT token injection
// - Error interceptor
// - Request timeout (30s)
```

**Error Handling**
- Catches HTTP errors
- Displays toast notification
- Redirects to login on 401
- Logs to console in development

---

## 🛣️ Routing Structure

Location: `src/App.tsx` (React Router v7)

```
/
├── /login                    ← Login page
├── /register                 ← Register page
├── /auth/setup               ← Initial setup
├── /dashboard                ← Main dashboard (protected)
├── /leads
│   ├── /                     ← Leads list
│   ├── /:id                  ← Lead detail
│   ├── /insights             ← Lead insights
│   ├── /assignment           ← Assignment rules
│   └── /bulk-scoring         ← Bulk scoring
├── /campaigns
│   ├── /                     ← Campaigns list
│   ├── /:id                  ← Campaign detail
│   ├── /optimizer            ← Campaign optimizer
│   └── /spend-optimizer      ← Budget tool
├── /workflows
│   ├── /                     ← Workflows list
│   ├── /builder              ← Workflow builder
│   ├── /:id                  ← Workflow detail
│   ├── /:id/executions/:executionId ← Execution detail
│   ├── /schedule-calendar    ← Schedule view
│   └── /templates            ← Templates
├── /analytics
│   ├── /                     ← Analytics dashboard
│   ├── /advanced             ← Advanced reporting
│   ├── /reports              ← Saved reports
│   └── /scheduled-reports    ← Scheduled reports
├── /tasks                    ← Task list
├── /notifications            ← Notification settings
├── /telephony                ← Phone management
├── /audit                    ← Audit logs
├── /billing                  ← Billing & subscription
├── /settings                 ← Company settings
├── /companies                ← Company list (admin)
└── /portal                   ← Client portal
```

---

## 🎨 Styling System

### TailwindCSS 4
- Utility-first CSS framework
- Pre-built component classes
- Dark mode support
- Responsive breakpoints

### Theme Configuration
```typescript
// tailwind.config.ts
colors: {
  primary: '#3b82f6'     // Blue
  secondary: '#8b5cf6'   // Purple
  success: '#10b981'     // Green
  warning: '#f59e0b'     // Amber
  danger: '#ef4444'      // Red
}
```

### Custom Styles
- Global styles in `index.css`
- Component-specific styles via Tailwind classes
- Lucide React for icons (400+ icons)

---

## 🪝 Custom Hooks

Location: `src/hooks/`

**Authentication Hooks**
```typescript
useAuth()           // Current user & auth methods
useRequireAuth()    // Redirect if not authenticated
```

**Data Hooks**
```typescript
useLeads(filters)   // Lead list query
useLead(id)         // Single lead query
useWorkflows()      // Get workflows
```

**UI Hooks**
```typescript
useNotification()   // Toast notifications
useModal(id)        // Modal state management
useLocalStorage()   // Persist state to localStorage
```

**Form Hooks**
```typescript
useForm(initialValues) // Form state & validation
useDebounce(value)     // Debounced values
```

---

## 🔐 Security & Authentication

### JWT Token Management
- Token stored in memory (secure, no XSS)
- Refresh token on 401
- Automatic logout after 7 days
- CORS credentials included in requests

### Route Protection
```typescript
// Protected route wrapper
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

### Authorization Checks
- Role-based component rendering
- Admin-only pages
- Viewer-limited actions

---

## 📱 Responsive Design

### Breakpoints (Tailwind standard)
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Mobile-First Approach
- Base styles for mobile
- `md:`, `lg:`, `xl:` prefixes for larger screens
- Navigation drawer on mobile
- Touch-friendly button sizes

---

## ⚡ Performance Optimization

### Code Splitting
- Lazy-loaded routes with React.lazy()
- Suspense boundaries for loading states
- Dynamic imports for modal components

### Query Caching (React Query)
- Automatic deduplication of requests
- Smart cache invalidation
- Background refetching
- Stale-while-revalidate pattern

### Bundle Optimization
- ESM modules only (`"type": "module"` in package.json)
- Tree-shaking unused code
- Minified production builds

---

## 🧪 Testing

**Test Framework:** Playwright (E2E)  
**Test Location:** `e2e/`

Key tests:
- Login flow
- Create campaign
- Assign lead
- Execute workflow
- Generate report

Run tests:
```bash
npx playwright test e2e/smoke-sprint13.spec.ts --headed
```

---

## 🔄 State Flow Example: Creating a Workflow

1. User clicks "New Workflow" button
2. Modal (AddWorkflowModal) opens with form
3. User enters name, selects trigger type
4. workflowStore stores draft
5. Workflow builder page opens
6. User adds steps via drag-drop
7. Each step updates workflowStore
8. User clicks "Save"
9. JavaScript mutation hook sends POST /workflows/
10. On success: React Query invalidates `workflows` key
11. UI automatically updates to reflect new workflow

---

## 📚 Directory Quick Reference

| Directory | Purpose |
|-----------|---------|
| `pages/` | Full-page components (route-level) |
| `components/` | Reusable UI components |
| `hooks/` | Custom React hooks |
| `store/` | Zustand state stores |
| `api/` | Axios client & React Query hooks |
| `utils/` | Helper functions & utilities |
| `lib/` | Third-party library wrappers |
| `assets/` | Images, icons, fonts |

---

**Last Updated:** March 29, 2026  
**Pages:** 35+  
**Components:** 15+ core components  
**Custom Hooks:** 20+  
**React Query Hooks:** 40+
