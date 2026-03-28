import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { useMutationWithErrorHandling } from '../hooks/useMutationWithErrorHandling';

export interface Company {
  id: string;
  name: string;
  tenantId: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  settings?: { maxAgents?: number };
  _count?: { campaigns: number; leads: number };
  industry?: string;
  businessType?: string;
  description?: string;
  adPlatformCredentials?: Array<{
    platform: 'meta' | 'google' | 'linkedin' | 'microsoft' | 'taboola';
    isValid: boolean;
  }>;
}

export interface AdPlatformCredential {
  platform: 'meta' | 'google' | 'linkedin' | 'microsoft' | 'taboola';
  accountId?: string;
  accessToken?: string;
  refreshToken?: string;
  appId?: string;
  appSecret?: string;
  extraConfig?: Record<string, any>;
}

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Company[] }>('/companies');
      return data.data;
    },
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ['companies', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Company }>(`/companies/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: (body: {
      name: string;
      industry?: string;
      businessType?: string;
      description?: string;
      targetGeo?: Record<string, any>;
      leadCriteria?: Record<string, any>;
      pricingDetails?: Record<string, any>;
      offerDetails?: string;
    }) => api.post('/companies', body),
    successMessage: 'Company created successfully',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}

export function useStoreCredentials(tenantId: string) {
  const qc = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: (body: AdPlatformCredential) =>
      api.post(`/companies/${tenantId}/credentials`, body),
    successMessage: 'Credentials saved successfully',
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies', tenantId] });
      qc.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}
