import React, { Component, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/auth';
import { useTokenRefresh } from './hooks/useTokenRefresh';
import { HydrationLoader } from './components/LoadingSpinner';
import ToastContainer from './components/Toast';
import { Layout } from './components/Layout';
import { PortalLayout } from './components/PortalLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Setup } from './pages/Setup';

// Lazy-loaded admin pages
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Analytics = React.lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const Companies = React.lazy(() => import('./pages/Companies').then(m => ({ default: m.Companies })));
const Campaigns = React.lazy(() => import('./pages/Campaigns').then(m => ({ default: m.Campaigns })));
const CampaignDetail = React.lazy(() => import('./pages/CampaignDetail').then(m => ({ default: m.CampaignDetail })));
const Leads = React.lazy(() => import('./pages/Leads').then(m => ({ default: m.Leads })));
const LeadDetail = React.lazy(() => import('./pages/LeadDetail').then(m => ({ default: m.LeadDetail })));
const LeadInsights = React.lazy(() => import('./pages/LeadInsights').then(m => ({ default: m.LeadInsights })));
const BulkScoringDashboard = React.lazy(() => import('./pages/BulkScoringDashboard').then(m => ({ default: m.BulkScoringDashboard })));
const Telephony = React.lazy(() => import('./pages/Telephony').then(m => ({ default: m.Telephony })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Billing = React.lazy(() => import('./pages/Billing').then(m => ({ default: m.Billing })));
const Workflows = React.lazy(() => import('./pages/Workflows').then(m => ({ default: m.Workflows })));
const AdvancedReporting = React.lazy(() => import('./pages/AdvancedReporting').then(m => ({ default: m.AdvancedReporting })));
const NotificationSettings = React.lazy(() => import('./pages/NotificationSettings').then(m => ({ default: m.NotificationSettings })));
const WorkflowDetail = React.lazy(() => import('./pages/WorkflowDetail').then(m => ({ default: m.WorkflowDetail })));
const WorkflowExecutionDetail = React.lazy(() => import('./pages/WorkflowExecutionDetail').then(m => ({ default: m.WorkflowExecutionDetail })));
const WorkflowBuilder = React.lazy(() => import('./pages/WorkflowBuilder').then(m => ({ default: m.WorkflowBuilder })));
const WorkflowTemplates = React.lazy(() => import('./pages/WorkflowTemplates').then(m => ({ default: m.WorkflowTemplates })));
const WorkflowScheduleCalendar = React.lazy(() => import('./pages/WorkflowScheduleCalendar').then(m => ({ default: m.WorkflowScheduleCalendar })));
const WorkflowAnalyticsDashboard = React.lazy(() => import('./pages/WorkflowAnalyticsDashboard').then(m => ({ default: m.WorkflowAnalyticsDashboard })));
const WorkflowExecutionDebug = React.lazy(() => import('./pages/WorkflowExecutionDebug').then(m => ({ default: m.WorkflowExecutionDebug })));
const Tasks = React.lazy(() => import('./pages/Tasks').then(m => ({ default: m.Tasks })));
const ScheduledReports = React.lazy(() => import('./pages/ScheduledReports').then(m => ({ default: m.ScheduledReports })));
const ReportBuilder = React.lazy(() => import('./pages/ReportBuilder').then(m => ({ default: m.ReportBuilder })));
const AuditLogs = React.lazy(() => import('./pages/AuditLogs').then(m => ({ default: m.AuditLogs })));
const CampaignOptimizer = React.lazy(() => import('./pages/CampaignOptimizer').then(m => ({ default: m.CampaignOptimizer })));
const SpendOptimizer = React.lazy(() => import('./pages/SpendOptimizer').then(m => ({ default: m.SpendOptimizer })));
const LeadFlowBooster = React.lazy(() => import('./pages/LeadFlowBooster').then(m => ({ default: m.LeadFlowBooster })));

// Lazy-loaded portal pages
const PortalDashboard = React.lazy(() => import('./pages/portal/Dashboard').then(m => ({ default: m.PortalDashboard })));
const PortalLeads = React.lazy(() => import('./pages/portal/Leads').then(m => ({ default: m.PortalLeads })));
const PortalLeadDetail = React.lazy(() => import('./pages/portal/LeadDetail').then(m => ({ default: m.PortalLeadDetail })));
const PortalCalls = React.lazy(() => import('./pages/portal/Calls').then(m => ({ default: m.PortalCalls })));
const PortalAgents = React.lazy(() => import('./pages/portal/Agents').then(m => ({ default: m.PortalAgents })));
const PortalNumbers = React.lazy(() => import('./pages/portal/Numbers').then(m => ({ default: m.PortalNumbers })));
const PortalSettings = React.lazy(() => import('./pages/portal/Settings').then(m => ({ default: m.PortalSettings })));

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

// Dev-only: set localStorage key 'lf-dev-role' to 'super_admin' or 'company_admin' to bypass auth
const DEV_ROLE = import.meta.env.DEV
  ? (localStorage.getItem('lf-dev-role') as string | null)
  : null;

/** Only for super_admin — redirects company_admin/viewer to /portal */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const needsSetup = useAuthStore((s) => s.needsSetup);
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s._hydrated);

  if (!hydrated) return <HydrationLoader />;

  if (DEV_ROLE === 'super_admin') return <>{children}</>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (needsSetup) return <Navigate to="/setup" replace />;
  if (user?.role !== 'super_admin') return <Navigate to="/portal" replace />;
  return <>{children}</>;
}

/** Only for company_admin / viewer — redirects super_admin to / */
function PortalRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const needsSetup = useAuthStore((s) => s.needsSetup);
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s._hydrated);

  if (!hydrated) return <HydrationLoader />;

  if (DEV_ROLE === 'company_admin') return <>{children}</>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (needsSetup) return <Navigate to="/setup" replace />;
  if (user?.role === 'super_admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Only accessible when authenticated AND needsSetup is true */
function SetupRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const needsSetup = useAuthStore((s) => s.needsSetup);
  const hydrated = useAuthStore((s) => s._hydrated);

  if (!hydrated) return <HydrationLoader />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!needsSetup) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Wrapper component that enables automatic token refresh */
function AppRoutes() {
  // Enable automatic token refresh when user is authenticated
  useTokenRefresh();

  // Ensure hydration flag does not block rendering in dev
  const hydrated = useAuthStore((s) => s._hydrated);
  React.useEffect(() => {
    if (!hydrated) {
      useAuthStore.getState().setHydrated();
    }
  }, [hydrated]);

  return (
    <Suspense fallback={<HydrationLoader />}>
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Post-register setup wizard */}
      <Route
        path="/setup"
        element={
          <SetupRoute>
            <Setup />
          </SetupRoute>
        }
      />

      {/* Super admin shell */}
      <Route
        path="/"
        element={
          <AdminRoute>
            <Layout />
          </AdminRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="reporting" element={<AdvancedReporting />} />
        <Route path="companies" element={<Companies />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="campaigns/:id" element={<CampaignDetail />} />
        <Route path="leads" element={<Leads />} />
        <Route path="leads/:id" element={<LeadDetail />} />
        <Route path="insights" element={<LeadInsights />} />
        <Route path="bulk-scoring" element={<BulkScoringDashboard />} />
        <Route path="telephony" element={<Telephony />} />
        <Route path="workflows" element={<Workflows />} />
        <Route path="workflows/:id" element={<WorkflowDetail />} />
        <Route path="workflows/:workflowId/executions/:executionId" element={<WorkflowExecutionDetail />} />
        <Route path="workflows/:id/builder" element={<WorkflowBuilder />} />
        <Route path="workflows/:id/schedule" element={<WorkflowScheduleCalendar />} />
        <Route path="workflows/:id/debug/:executionId" element={<WorkflowExecutionDebug />} />
        <Route path="workflow-templates" element={<WorkflowTemplates />} />
        <Route path="workflow-analytics" element={<WorkflowAnalyticsDashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="scheduled-reports" element={<ScheduledReports />} />
        <Route path="report-builder" element={<ReportBuilder />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="campaign-optimizer" element={<CampaignOptimizer />} />
        <Route path="spend-optimizer" element={<SpendOptimizer />} />
        <Route path="lead-flow" element={<LeadFlowBooster />} />
        <Route path="billing" element={<Billing />} />
        <Route path="settings" element={<Settings />} />
        <Route path="notifications" element={<NotificationSettings />} />
      </Route>


      {/* Company portal shell */}
      <Route
        path="/portal"
        element={
          <PortalRoute>
            <PortalLayout />
          </PortalRoute>
        }
      >
        <Route index element={<PortalDashboard />} />
        <Route path="leads" element={<PortalLeads />} />
        <Route path="leads/:id" element={<PortalLeadDetail />} />
        <Route path="calls" element={<PortalCalls />} />
        <Route path="agents" element={<PortalAgents />} />
        <Route path="numbers" element={<PortalNumbers />} />
        <Route path="settings" element={<PortalSettings />} />
      </Route>
    </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
          <ToastContainer />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
