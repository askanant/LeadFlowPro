import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduledReport {
  id: string;
  tenantId: string;
  name: string;
  reportType: 'campaign_performance' | 'lead_scoring' | 'workflow_summary' | 'growth_optimization';
  schedule: string;
  recipients: string[];
  filters: Record<string, unknown> | null;
  isActive: boolean;
  lastSentAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; email: string; firstName: string | null; lastName: string | null };
}

export interface SavedReport {
  id: string;
  tenantId: string;
  name: string;
  config: ReportConfig;
  isPublic: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; email: string; firstName: string | null; lastName: string | null };
}

export interface ReportConfig {
  metrics: string[];
  dimensions: string[];
  chartType: string;
  filters?: Record<string, unknown>;
  dateRange?: { from: string; to: string };
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

export function downloadReport(type: string, format: 'pdf' | 'csv', filters?: Record<string, string>) {
  const params = new URLSearchParams(filters ?? {});
  const url = `/reports/${type}/${format}?${params.toString()}`;
  return api.get(url, { responseType: 'blob' }).then(res => {
    const blob = new Blob([res.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${type}-${new Date().toISOString().split('T')[0]}.${format}`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

// ─── Scheduled Reports ────────────────────────────────────────────────────────

export function useScheduledReports() {
  return useQuery({
    queryKey: ['scheduled-reports'],
    queryFn: () => api.get('/reports/scheduled').then(r => r.data.data as ScheduledReport[]),
  });
}

export function useCreateScheduledReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<ScheduledReport, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'lastSentAt' | 'createdBy' | 'creator'>) =>
      api.post('/reports/scheduled', data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scheduled-reports'] }),
  });
}

export function useUpdateScheduledReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<ScheduledReport>) =>
      api.patch(`/reports/scheduled/${id}`, data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scheduled-reports'] }),
  });
}

export function useDeleteScheduledReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/reports/scheduled/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scheduled-reports'] }),
  });
}

// ─── Saved Reports (Custom Report Builder) ────────────────────────────────────

export function useSavedReports() {
  return useQuery({
    queryKey: ['saved-reports'],
    queryFn: () => api.get('/reports/saved').then(r => r.data.data as SavedReport[]),
  });
}

export function useCreateSavedReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; config: ReportConfig; isPublic?: boolean }) =>
      api.post('/reports/saved', data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-reports'] }),
  });
}

export function useUpdateSavedReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; config?: ReportConfig; isPublic?: boolean }) =>
      api.patch(`/reports/saved/${id}`, data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-reports'] }),
  });
}

export function useDeleteSavedReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/reports/saved/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-reports'] }),
  });
}
