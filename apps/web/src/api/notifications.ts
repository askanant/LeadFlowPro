import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await api.get('/notifications/unread-count');
      return res.data.count as number;
    },
    refetchInterval: 60_000, // fallback polling every 60s
  });
}
