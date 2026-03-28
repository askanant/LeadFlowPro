import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { useMutationWithErrorHandling } from '../hooks/useMutationWithErrorHandling';

export interface Lead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  platform: string;
  status: string;
  qualityScore: number | null;
  receivedAt: string;
  campaign?: { name: string } | null;
}

export interface LeadDetail extends Lead {
  city: string | null;
  state: string | null;
  customFields: Record<string, unknown> | null;
  auditLogs: Array<{ action: string; actor: string; note: string | null; createdAt: string }>;
  deliveries: Array<{ channel: string; status: string; deliveredAt: string | null }>;
}

export function useLeads(params?: {
  page?: number;
  limit?: number;
  status?: string;
  platform?: string;
  quality?: string;
  q?: string;
}) {
  const qp = new URLSearchParams();
  if (params?.page) qp.set('page', String(params.page));
  if (params?.limit) qp.set('limit', String(params.limit));
  if (params?.status) qp.set('status', params.status);
  if (params?.platform) qp.set('platform', params.platform);
  if (params?.quality) qp.set('quality', params.quality);
  if (params?.q) qp.set('q', params.q);

  return useQuery({
    queryKey: ['leads', params],
    queryFn: async () => {
      const { data } = await api.get(`/leads?${qp}`);
      return data as { data: Lead[]; meta: { page: number; limit: number; total: number } };
    },
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: LeadDetail }>(`/leads/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/leads/${id}/status`, { status }),
    successMessage: 'Lead status updated',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}
