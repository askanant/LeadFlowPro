import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { useMutationWithErrorHandling } from '../hooks/useMutationWithErrorHandling';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompanyProfile {
  id: string;
  tenantId: string;
  name: string;
  industry: string | null;
  businessType: string | null;
  description: string | null;
  targetGeo: {
    country?: string;
    states?: string[];
    cities?: string[];
  } | null;
  settings: Record<string, unknown>;
  status: string;
  createdAt: string;
}

export interface CompanyUpdatePayload {
  name?: string;
  industry?: string | null;
  businessType?: string | null;
  description?: string | null;
  targetGeo?: { country?: string; states?: string[]; cities?: string[] } | null;
  settings?: Record<string, unknown>;
}

export interface IntegrationsStatus {
  whatsapp: {
    deliveryNumber: string | null;
    configured: boolean;
  };
  meta: {
    connected: boolean;
    accountId: string | null;
    appId: string | null;
    hasAccessToken: boolean;
    tokenExpiresAt: string | null;
  };
}

export interface IntegrationsUpdatePayload {
  whatsappDeliveryNumber?: string | null;
  meta?: {
    accessToken?: string;
    accountId?: string;
    appId?: string;
    appSecret?: string;
  };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function tenantQueryParam(tenantId?: string) {
  return tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
}

export function useCompanyProfile(tenantId?: string) {
  return useQuery<CompanyProfile>({
    queryKey: ['settings', 'company', tenantId ?? ''],
    queryFn: async () => {
      const { data } = await api.get(`/settings/company${tenantQueryParam(tenantId)}`);
      return data.data as CompanyProfile;
    },
  });
}

export function useUpdateCompanyProfile(tenantId?: string) {
  const qc = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async (payload: CompanyUpdatePayload) => {
      const { data } = await api.put(`/settings/company${tenantQueryParam(tenantId)}`, payload);
      return data.data as CompanyProfile;
    },
    successMessage: 'Company profile updated',
    onSuccess: (updated) => {
      qc.setQueryData(['settings', 'company', tenantId ?? ''], updated);
    },
  });
}

export function useIntegrations(tenantId?: string) {
  return useQuery<IntegrationsStatus>({
    queryKey: ['settings', 'integrations', tenantId ?? ''],
    queryFn: async () => {
      const { data } = await api.get(`/settings/integrations${tenantQueryParam(tenantId)}`);
      return data.data as IntegrationsStatus;
    },
  });
}

export function useUpdateIntegrations(tenantId?: string) {
  const qc = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async (payload: IntegrationsUpdatePayload) => {
      const { data } = await api.put(`/settings/integrations${tenantQueryParam(tenantId)}`, payload);
      return data.data as IntegrationsStatus;
    },
    successMessage: 'Integrations updated successfully',
    onSuccess: (updated) => {
      qc.setQueryData(['settings', 'integrations', tenantId ?? ''], updated);
    },
  });
}
