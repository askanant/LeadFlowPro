import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { useMutationWithErrorHandling } from '../hooks/useMutationWithErrorHandling';

export interface Workflow {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  triggerConfig?: Record<string, any>;
  conditions?: Record<string, any>;
  status: 'active' | 'inactive';
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { executions: number };
  steps?: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  workflowId: string;
  order: number;
  actionType: string;
  config?: Record<string, any>;
  isEnabled: boolean;
  nextStepOnSuccess?: string;  // ID of next step if action succeeds
  nextStepOnFailure?: string;  // ID of next step if action fails
  conditions?: Record<string, any>; // Complex condition rules for step execution
  createdAt: string;
  updatedAt?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  leadId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: Record<string, any>;
  error?: string;
  metadata?: Record<string, any>;
  triggeredAt: string;
  completedAt?: string;
  workflow?: Workflow;
  lead?: any;
  steps?: WorkflowStepExecution[];
}

export interface WorkflowStepExecution {
  id: string;
  executionId: string;
  stepId: string;
  order: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: Record<string, any>;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  step?: { id: string; actionType?: string };
}

export function useWorkflows() {
  return useQuery<Workflow[]>({
    queryKey: ['workflows'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Workflow[] }>('/workflows');
      return data.data;
    },
  });
}

export function useWorkflowById(workflowId: string) {
  return useQuery<Workflow>({
    queryKey: ['workflows', workflowId],
    queryFn: async () => {
      const res = await api.get(`/workflows/${workflowId}`);
      return res.data;
    },
    enabled: !!workflowId,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async (data: {
      name: string;
      description?: string;
      triggerConfig?: Record<string, any>;
      conditions?: Record<string, any>;
      isDefault?: boolean;
    }) => {
      const res = await api.post('/workflows', data);
      return res.data;
    },
    successMessage: 'Workflow created successfully',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useUpdateWorkflow(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async (data: {
      name?: string;
      description?: string;
      status?: string;
      triggerConfig?: Record<string, any>;
      conditions?: Record<string, any>;
    }) => {
      const res = await api.patch(`/workflows/${workflowId}`, data);
      return res.data;
    },
    successMessage: 'Workflow updated successfully',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', workflowId] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async (workflowId: string) => {
      await api.delete(`/workflows/${workflowId}`);
    },
    successMessage: 'Workflow deleted successfully',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useCloneWorkflow() {
  const queryClient = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async (data: { workflowId: string; name?: string }) => {
      const res = await api.post(`/workflows/${data.workflowId}/clone`, {
        name: data.name,
      });
      return res.data?.data ?? res.data;
    },
    successMessage: 'Workflow cloned successfully',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

// ─── Workflow Versioning ────────────────────────────────────────────────────

export interface WorkflowVersionRecord {
  id: string;
  version: number;
  changeDescription?: string;
  createdBy?: string;
  createdAt: string;
  snapshot?: Record<string, any>;
}

export function useWorkflowVersions(workflowId: string) {
  return useQuery<WorkflowVersionRecord[]>({
    queryKey: ['workflows', workflowId, 'versions'],
    queryFn: async () => {
      const res = await api.get(`/workflows/${workflowId}/versions`);
      return res.data?.data ?? res.data;
    },
    enabled: !!workflowId,
  });
}

export function useRestoreWorkflowVersion(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async (versionId: string) => {
      const res = await api.post(
        `/workflows/${workflowId}/versions/${versionId}/restore`,
        {}
      );
      return res.data?.data ?? res.data;
    },
    successMessage: 'Workflow restored to previous version',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', workflowId] });
      queryClient.invalidateQueries({ queryKey: ['workflows', workflowId, 'versions'] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useAddWorkflowStep(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async (data: {
      order: number;
      actionType: string;
      config?: Record<string, any>;
      isEnabled?: boolean;
    }) => {
      const res = await api.post(`/workflows/${workflowId}/steps`, data);
      return res.data;
    },
    successMessage: 'Step added successfully',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', workflowId] });
    },
  });
}

export function useUpdateWorkflowStep(stepId: string) {
  const queryClient = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async (data: {
      order?: number;
      actionType?: string;
      config?: Record<string, any>;
      isEnabled?: boolean;
    }) => {
      const res = await api.patch(`/workflows/steps/${stepId}`, data);
      return res.data;
    },
    successMessage: 'Step updated successfully',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useDeleteWorkflowStep(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async (stepId: string) => {
      await api.delete(`/workflows/steps/${stepId}`);
    },
    successMessage: 'Step deleted successfully',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', workflowId] });
    },
  });
}

export interface WorkflowAnalytics {
  total: number;
  byStatus: Record<string, number>;
  successRate: number;
  failedCount: number;
  avgDurationSeconds: number | null;
  periodDays: number;
}

export function useWorkflowExecutions(workflowId: string) {
  return useQuery<WorkflowExecution[]>({
    queryKey: ['workflows', workflowId, 'executions'],
    queryFn: async () => {
      const res = await api.get(`/workflows/${workflowId}/executions`);
      return res.data?.data ?? res.data;
    },
    enabled: !!workflowId,
  });
}

export function useWorkflowAnalytics(workflowId: string, periodDays: number = 7) {
  return useQuery<WorkflowAnalytics>({
    queryKey: ['workflows', workflowId, 'analytics', periodDays],
    queryFn: async () => {
      const res = await api.get(`/workflows/${workflowId}/analytics?period=${periodDays}`);
      return res.data?.data ?? res.data;
    },
    enabled: !!workflowId,
  });
}

export interface DashboardAnalytics {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  byStatus: Record<string, number>;
  successRate: number;
  failedCount: number;
  avgDurationSeconds: number | null;
  periodDays: number;
  perWorkflow: Record<string, { name: string; total: number; completed: number; failed: number; avgDuration: number | null }>;
  dailyTrend: { date: string; completed: number; failed: number; total: number }[];
  recentFailures: { id: string; workflowId: string; workflowName: string; triggeredAt: string; error?: string }[];
}

export function useWorkflowDashboardAnalytics(periodDays: number = 7) {
  return useQuery<DashboardAnalytics>({
    queryKey: ['workflows', 'dashboard-analytics', periodDays],
    queryFn: async () => {
      const res = await api.get(`/workflows/analytics/dashboard?period=${periodDays}`);
      return res.data?.data ?? res.data;
    },
  });
}

export function useWorkflowExecution(executionId: string) {
  return useQuery<WorkflowExecution>({
    queryKey: ['workflow-executions', executionId],
    queryFn: async () => {
      const res = await api.get(`/workflows/executions/${executionId}`);
      return res.data?.data ?? res.data;
    },
    enabled: !!executionId,
  });
}

export function useRetryWorkflowExecution(workflowId?: string) {
  const queryClient = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async (executionId: string) => {
      const res = await api.post(`/workflows/executions/${executionId}/retry`);
      return res.data?.data ?? res.data;
    },
    successMessage: 'Workflow execution retry started',
    onSuccess: (_data, executionId) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-executions', executionId] });
      if (workflowId) {
        queryClient.invalidateQueries({ queryKey: ['workflows', workflowId, 'executions'] });
      }
    },
  });
}

export function useRetryWorkflowExecutionFromStep(workflowId?: string) {
  const queryClient = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async ({ executionId, stepId }: { executionId: string; stepId: string }) => {
      const res = await api.post(`/workflows/executions/${executionId}/retry-step`, { stepId });
      return res.data?.data ?? res.data;
    },
    successMessage: 'Workflow execution retry started',
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-executions', variables.executionId] });
      if (workflowId) {
        queryClient.invalidateQueries({ queryKey: ['workflows', workflowId, 'executions'] });
      }
    },
  });
}

export function useTriggerWorkflow() {
  const queryClient = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async (data: {
      workflowId: string;
      leadId: string;
    }) => {
      const res = await api.post(`/workflows/${data.workflowId}/execute`, {
        leadId: data.leadId,
      });
      return res.data;
    },
    successMessage: 'Workflow triggered successfully',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

// ─── Workflow Triggers ──────────────────────────────────────────────────────

export interface WorkflowTriggerAPI {
  id: string;
  workflowId: string;
  tenantId: string;
  type: string;
  config?: Record<string, any>;
  webhookUrl?: string;
  webhookSecret?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  schedule?: {
    id: string;
    cronExpression: string;
    timezone: string;
    lastRunAt?: string;
    nextRunAt?: string;
  };
}

export function useTriggers(workflowId: string) {
  return useQuery<WorkflowTriggerAPI[]>({
    queryKey: ['workflows', workflowId, 'triggers'],
    queryFn: async () => {
      const res = await api.get(`/workflows/${workflowId}/triggers`);
      return res.data;
    },
    enabled: !!workflowId,
  });
}

export function useTriggerById(workflowId: string, triggerId: string) {
  return useQuery<WorkflowTriggerAPI>({
    queryKey: ['workflows', workflowId, 'triggers', triggerId],
    queryFn: async () => {
      const res = await api.get(`/workflows/${workflowId}/triggers/${triggerId}`);
      return res.data;
    },
    enabled: !!workflowId && !!triggerId,
  });
}

export function useCreateTrigger(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async (data: {
      type: string;
      config?: Record<string, any>;
      webhookUrl?: string;
      webhookSecret?: string;
    }) => {
      const res = await api.post(`/workflows/${workflowId}/triggers`, data);
      return res.data;
    },
    successMessage: 'Trigger created successfully',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', workflowId, 'triggers'] });
    },
  });
}

export function useUpdateTrigger(workflowId: string, triggerId: string) {
  const queryClient = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async (data: {
      type?: string;
      config?: Record<string, any>;
      webhookUrl?: string;
      webhookSecret?: string;
      isActive?: boolean;
    }) => {
      const res = await api.patch(`/workflows/${workflowId}/triggers/${triggerId}`, data);
      return res.data;
    },
    successMessage: 'Trigger updated successfully',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', workflowId, 'triggers'] });
      queryClient.invalidateQueries({
        queryKey: ['workflows', workflowId, 'triggers', triggerId],
      });
    },
  });
}

export function useDeleteTrigger(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async (triggerId: string) => {
      await api.delete(`/workflows/${workflowId}/triggers/${triggerId}`);
    },
    successMessage: 'Trigger deleted successfully',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', workflowId, 'triggers'] });
    },
  });
}

export function useActivateTrigger(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async (triggerId: string) => {
      const res = await api.post(
        `/workflows/${workflowId}/triggers/${triggerId}/activate`,
        {}
      );
      return res.data;
    },
    successMessage: 'Trigger activated successfully',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', workflowId, 'triggers'] });
    },
  });
}

export function useDeactivateTrigger(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async (triggerId: string) => {
      const res = await api.post(
        `/workflows/${workflowId}/triggers/${triggerId}/deactivate`,
        {}
      );
      return res.data;
    },
    successMessage: 'Trigger deactivated successfully',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', workflowId, 'triggers'] });
    },
  });
}

export function useTestTrigger(workflowId: string) {
  return useMutationWithErrorHandling({
    mutationFn: async (triggerId: string) => {
      const res = await api.post(
        `/workflows/${workflowId}/triggers/${triggerId}/test`,
        {}
      );
      return res.data;
    },
    successMessage: 'Trigger test executed',
  });
}

export interface TriggerScheduleStatus {
  triggerId: string;
  type: string;
  isActive: boolean;
  schedule: {
    cronExpression: string;
    timezone: string;
    lastRunAt?: string;
    nextRunAt?: string;
  } | null;
}

export function useTriggerScheduleStatus(workflowId: string, triggerId: string) {
  return useQuery<TriggerScheduleStatus>({
    queryKey: ['workflows', workflowId, 'triggers', triggerId, 'schedule'],
    queryFn: async () => {
      const res = await api.get(`/workflows/${workflowId}/triggers/${triggerId}/schedule`);
      return res.data.data;
    },
    enabled: !!workflowId && !!triggerId,
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
  });
}

// ─── Workflow Templates ──────────────────────────────────────────────────────

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  workflowDefinition: Record<string, any>;
  isFeatured: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export function useWorkflowTemplates(category?: string) {
  return useQuery<WorkflowTemplate[]>({
    queryKey: ['workflow-templates', category],
    queryFn: async () => {
      const params = category ? `?category=${category}` : '';
      const res = await api.get(`/workflows/templates${params}`);
      return res.data?.data ?? res.data;
    },
  });
}

export function useWorkflowTemplate(templateId: string) {
  return useQuery<WorkflowTemplate>({
    queryKey: ['workflow-templates', templateId],
    queryFn: async () => {
      const res = await api.get(`/workflows/templates/${templateId}`);
      return res.data?.data ?? res.data;
    },
    enabled: !!templateId,
  });
}

export function useCreateFromTemplate() {
  const queryClient = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async (data: {
      templateId: string;
      name?: string;
      description?: string;
    }) => {
      const res = await api.post('/workflows/from-template', data);
      return res.data?.data ?? res.data;
    },
    successMessage: 'Workflow created from template',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
    },
  });
}

export function useSeedTemplates() {
  const queryClient = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async () => {
      const res = await api.post('/workflows/templates/seed', {});
      return res.data?.data ?? res.data;
    },
    successMessage: 'Templates seeded successfully',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
    },
  });
}
