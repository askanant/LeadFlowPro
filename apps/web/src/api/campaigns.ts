import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { useMutationWithErrorHandling } from '../hooks/useMutationWithErrorHandling';

export interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  dailyBudget: number | null;
  totalBudget: number | null;
  leadTargetDaily: number | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  _count?: { leads: number };
}

export interface CreateCampaignInput {
  tenantId: string;
  name: string;
  platforms: string[];
  dailyBudget?: number;
  totalBudget?: number;
  leadTargetDaily?: number;
  startDate?: string;
  endDate?: string;
  targetingConfig?: Record<string, any>;
  leadCriteria?: Record<string, any>;
  audienceInsights?: string;
}

export function useCampaigns(filters?: { platform?: string; status?: string }) {
  const params = new URLSearchParams();
  if (filters?.platform) params.set('platform', filters.platform);
  if (filters?.status) params.set('status', filters.status);
  return useQuery({
    queryKey: ['campaigns', filters],
    queryFn: async () => {
      const { data } = await api.get<{ data: Campaign[] }>(`/campaigns?${params}`);
      return data.data;
    },
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ['campaigns', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Campaign }>(`/campaigns/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCampaignMetrics(id: string) {
  return useQuery({
    queryKey: ['campaigns', id, 'metrics'],
    queryFn: async () => {
      const { data } = await api.get(`/campaigns/${id}/metrics`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: (body: CreateCampaignInput | Partial<Campaign>) => api.post('/campaigns', body),
    successMessage: 'Campaign created successfully',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}

export function useLaunchCampaign() {
  const qc = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: (id: string) => api.post(`/campaigns/${id}/launch`),
    successMessage: 'Campaign launched successfully',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}

export function usePauseCampaign() {
  const qc = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: (id: string) => api.post(`/campaigns/${id}/pause`),
    successMessage: 'Campaign paused',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}

export function useActivateCampaign() {
  const qc = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: (id: string) => api.post(`/campaigns/${id}/activate`),
    successMessage: 'Campaign resumed',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}
