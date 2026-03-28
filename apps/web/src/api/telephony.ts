import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { useMutationWithErrorHandling } from '../hooks/useMutationWithErrorHandling';

export interface PhoneNumber {
  id: string;
  number: string;
  provider: string | null;
  providerSid: string | null;
  forwardTo: string | null;
  isActive: boolean;
  _count?: { callLogs: number };
}

export interface AvailableNumber {
  number: string;
  providerSid: string;
  friendlyName?: string;
}

export interface CallLog {
  id: string;
  callSid: string;
  fromNumber: string | null;
  toNumber: string | null;
  direction: string;
  status: string;
  durationSeconds: number | null;
  recordingUrl: string | null;
  startedAt: string | null;
  lead?: { firstName: string | null; lastName: string | null; phone: string | null } | null;
  phoneNumber?: { number: string } | null;
}

export function useTelephonyProvider() {
  return useQuery({
    queryKey: ['telephony', 'provider'],
    queryFn: async () => {
      const { data } = await api.get<{ data: { name: string } }>('/telephony/provider');
      return data.data;
    },
    staleTime: Infinity, // provider doesn't change at runtime
  });
}

export function useAvailableNumbers(opts?: { areaCode?: string; enabled?: boolean }) {
  const qp = new URLSearchParams();
  if (opts?.areaCode) qp.set('areaCode', opts.areaCode);
  return useQuery({
    queryKey: ['telephony', 'available', opts?.areaCode],
    queryFn: async () => {
      const { data } = await api.get<{ data: AvailableNumber[] }>(
        `/telephony/numbers/available?${qp}`,
      );
      return data.data;
    },
    enabled: opts?.enabled ?? false,
  });
}

export function usePhoneNumbers() {
  return useQuery({
    queryKey: ['telephony', 'numbers'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PhoneNumber[] }>('/telephony/numbers');
      return data.data;
    },
  });
}

export function useCallLogs(params?: { from?: string; to?: string; page?: number }) {
  const qp = new URLSearchParams();
  if (params?.from) qp.set('from', params.from);
  if (params?.to) qp.set('to', params.to);
  if (params?.page) qp.set('page', String(params.page));
  return useQuery({
    queryKey: ['telephony', 'calls', params],
    queryFn: async () => {
      const { data } = await api.get(`/telephony/calls?${qp}`);
      return data as { data: CallLog[]; meta: { page: number; limit: number; total: number } };
    },
  });
}

export function useProvisionNumber() {
  const qc = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: (body: { number: string; providerSid?: string; forwardTo: string }) =>
      api.post('/telephony/numbers/provision', body),
    successMessage: 'Phone number provisioned successfully',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['telephony'] }),
  });
}
