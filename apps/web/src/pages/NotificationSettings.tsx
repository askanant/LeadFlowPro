import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

interface NotificationPreference {
  id: string;
  tenantId: string;
  userId: string;
  notificationType: 'workflow_execution' | 'lead_assignment' | 'lead_status_change';
  channel: 'email' | 'slack' | 'in_app';
  enabled: boolean;
  slackWebhookUrl?: string;
  slackChannel?: string;
  createdAt: string;
  updatedAt: string;
}

interface NotificationRecord {
  id: string;
  tenantId: string;
  userId?: string;
  notificationType: string;
  channel: string;
  status: 'pending' | 'sent' | 'failed';
  recipient: string;
  message: string;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: string;
}

const NOTIFICATION_TYPES = [
  'workflow_execution',
  'lead_assignment',
  'lead_status_change',
] as const;

const CHANNELS = ['email', 'slack', 'in_app'] as const;

export function NotificationSettings() {
  const queryClient = useQueryClient();

  const { data: preferences = [], isLoading: prefsLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const res = await api.get('/notifications/preferences');
      return res.data as NotificationPreference[];
    },
  });

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['notification-history'],
    queryFn: async () => {
      const res = await api.get('/notifications/history?limit=10');
      return res.data as NotificationRecord[];
    },
  });

  const updatePreferenceMutation = useMutation({
    mutationFn: async (payload: {
      notificationType: string;
      channel: string;
      enabled: boolean;
      slackWebhookUrl?: string;
      slackChannel?: string;
    }) => {
      const res = await api.post('/notifications/preferences', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  const handleTogglePreference = async (
    notificationType: string,
    channel: string,
    enabled: boolean
  ) => {
    await updatePreferenceMutation.mutateAsync({
      notificationType,
      channel,
      enabled: !enabled,
    });
  };

  const getPreference = (type: string, channel: string) => {
    return preferences.find((p) => p.notificationType === type && p.channel === channel);
  };

  const isEnabled = (type: string, channel: string) => {
    const pref = getPreference(type, channel);
    return pref?.enabled ?? false;
  };

  if (prefsLoading || historyLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
        <p className="mt-2 text-gray-600">Manage how you receive notifications about lead assignments and workflows</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Notification Preferences</h2>

          <div className="space-y-6">
            {NOTIFICATION_TYPES.map((type) => (
              <div key={type} className="border-b pb-6 last:border-b-0">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 capitalize">
                  {type.replace(/_/g, ' ')}
                </h3>

                <div className="grid grid-cols-3 gap-4">
                  {CHANNELS.map((channel) => {
                    const enabled = isEnabled(type, channel);
                    return (
                      <button
                        key={`${type}-${channel}`}
                        onClick={() => handleTogglePreference(type, channel, enabled)}
                        disabled={updatePreferenceMutation.isPending}
                        className={`p-4 rounded-lg border-2 transition-all text-center ${
                          enabled
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                        }`}
                      >
                        <div className="font-semibold capitalize text-sm">{channel}</div>
                        <div className="text-xs mt-2">
                          {enabled ? 'Enabled' : 'Disabled'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Notifications</h2>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No notifications yet</p>
            ) : (
              history.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 rounded border text-xs ${
                    notif.status === 'sent'
                      ? 'bg-green-50 border-green-300'
                      : notif.status === 'failed'
                      ? 'bg-red-50 border-red-300'
                      : 'bg-yellow-50 border-yellow-300'
                  }`}
                >
                  <div className="font-semibold capitalize">{notif.notificationType}</div>
                  <div className="text-gray-600 mt-1 line-clamp-2">{notif.message}</div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="capitalize">{notif.channel}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        notif.status === 'sent'
                          ? 'bg-green-200 text-green-800'
                          : notif.status === 'failed'
                          ? 'bg-red-200 text-red-800'
                          : 'bg-yellow-200 text-yellow-800'
                      }`}
                    >
                      {notif.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
