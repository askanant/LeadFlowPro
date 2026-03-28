import { api } from './client';
import { useQuery } from '@tanstack/react-query';

interface AuditLogUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: string;
  user: AuditLogUser | null;
}

interface AuditLogListResponse {
  data: AuditLogEntry[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function useAuditLogs(params: {
  page?: number;
  limit?: number;
  action?: string;
  resource?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.action) query.set('action', params.action);
      if (params.resource) query.set('resource', params.resource);
      if (params.userId) query.set('userId', params.userId);
      if (params.startDate) query.set('startDate', params.startDate);
      if (params.endDate) query.set('endDate', params.endDate);

      const { data } = await api.get(`/audit-logs?${query.toString()}`);
      return data as AuditLogListResponse;
    },
  });
}

export function useAuditLogActions() {
  return useQuery({
    queryKey: ['audit-logs', 'actions'],
    queryFn: async () => {
      const { data } = await api.get('/audit-logs/actions');
      return data.data as string[];
    },
    staleTime: 60_000,
  });
}

export function useAuditLogResources() {
  return useQuery({
    queryKey: ['audit-logs', 'resources'],
    queryFn: async () => {
      const { data } = await api.get('/audit-logs/resources');
      return data.data as string[];
    },
    staleTime: 60_000,
  });
}
