import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { useMutationWithErrorHandling } from '../hooks/useMutationWithErrorHandling';

export interface TaskUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface TaskLead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email?: string | null | undefined;
  status?: string;
}

export interface Task {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeId: string | null;
  leadId: string | null;
  createdBy: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: TaskUser | null;
  creator?: TaskUser | null;
  lead?: TaskLead | null;
}

export interface TaskStats {
  open: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export interface ActivityItem {
  id: string;
  tenantId: string;
  leadId: string | null;
  userId: string | null;
  type: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: { id: string; firstName: string | null; lastName: string | null; email?: string } | null;
  lead?: { id: string; firstName: string | null; lastName: string | null } | null;
}

// ─── Task Hooks ────────────────────────────────────────────────────────────

export function useTasks(params?: {
  status?: string;
  priority?: string;
  assigneeId?: string;
  leadId?: string;
  page?: number;
  limit?: number;
}) {
  const qp = new URLSearchParams();
  if (params?.status) qp.set('status', params.status);
  if (params?.priority) qp.set('priority', params.priority);
  if (params?.assigneeId) qp.set('assigneeId', params.assigneeId);
  if (params?.leadId) qp.set('leadId', params.leadId);
  if (params?.page) qp.set('page', String(params.page));
  if (params?.limit) qp.set('limit', String(params.limit));

  return useQuery({
    queryKey: ['tasks', params],
    queryFn: async () => {
      const { data } = await api.get(`/tasks?${qp}`);
      return data as { data: Task[]; meta: { page: number; limit: number; total: number } };
    },
  });
}

export function useMyTasks() {
  return useQuery({
    queryKey: ['tasks', 'my'],
    queryFn: async () => {
      const { data } = await api.get('/tasks/my');
      return data.data as Task[];
    },
  });
}

export function useTaskStats() {
  return useQuery({
    queryKey: ['tasks', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/tasks/stats');
      return data as TaskStats;
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: (input: {
      title: string;
      description?: string;
      priority?: string;
      dueDate?: string;
      assigneeId?: string;
      leadId?: string;
    }) => api.post('/tasks', input),
    successMessage: 'Task created',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: ({
      id,
      ...updates
    }: {
      id: string;
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      dueDate?: string | null;
      assigneeId?: string | null;
    }) => api.patch(`/tasks/${id}`, updates),
    successMessage: 'Task updated',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    successMessage: 'Task deleted',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

// ─── Activity Hooks ────────────────────────────────────────────────────────

export function useLeadActivities(leadId: string, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['activities', 'lead', leadId, params],
    queryFn: async () => {
      const qp = new URLSearchParams();
      if (params?.page) qp.set('page', String(params.page));
      if (params?.limit) qp.set('limit', String(params.limit));
      const { data } = await api.get(`/activities/lead/${leadId}?${qp}`);
      return data as { data: ActivityItem[]; meta: { page: number; limit: number; total: number } };
    },
    enabled: !!leadId,
  });
}

export function useRecentActivities(limit = 20) {
  return useQuery({
    queryKey: ['activities', 'recent', limit],
    queryFn: async () => {
      const { data } = await api.get(`/activities/recent?limit=${limit}`);
      return data.data as ActivityItem[];
    },
  });
}
