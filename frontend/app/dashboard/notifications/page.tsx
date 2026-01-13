'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Bell, Mail, Smartphone, CheckCircle2, X } from 'lucide-react';
import TimeAgo from '@/components/TimeAgo';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  category: string | null;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

interface Preference {
  category: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  sms_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

const alertCategories = [
  { name: 'new_conversation', label: 'New Conversations', description: 'Get notified when new conversations start' },
  { name: 'high_priority', label: 'High Priority Messages', description: 'Alerts for urgent customer inquiries' },
  { name: 'lead_captured', label: 'Lead Captured', description: 'Notifications when new leads are generated' },
  { name: 'system_alert', label: 'System Alerts', description: 'Important system updates and maintenance' },
];

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications', filter],
    queryFn: async () => {
      const response = await api.get('/api/notifications/', {
        params: { is_read: filter === 'unread' ? false : undefined, limit: 100 },
      });
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: preferences = [] } = useQuery<Preference[]>({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const response = await api.get('/api/notifications/preferences/');
      return response.data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const updatePreferenceMutation = useMutation({
    mutationFn: async ({ category, data }: { category: string; data: any }) => {
      await api.put(`/api/notifications/preferences/${category}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  const getPreference = (category: string): Preference | undefined => {
    return preferences.find(p => p.category === category);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Notifications & Alerts
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Configure how and when you receive notifications
          </p>
        </div>
        {notifications.filter(n => !n.is_read).length > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Mark All Read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium rounded-lg ${
            filter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 text-sm font-medium rounded-lg ${
            filter === 'unread'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Unread ({notifications.filter(n => !n.is_read).length})
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Notifications
          </h3>
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  notification.is_read
                    ? 'border-gray-200 dark:border-gray-700'
                    : 'border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/10'
                }`}
                onClick={() => !notification.is_read && markReadMutation.mutate(notification.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Bell className={`h-4 w-4 ${notification.is_read ? 'text-gray-400' : 'text-primary-500'}`} />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <TimeAgo timestamp={notification.created_at} />
                    </p>
                  </div>
                  {!notification.is_read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markReadMutation.mutate(notification.id);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No notifications</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Notification Preferences
        </h3>
        <div className="space-y-4">
          {alertCategories.map((category) => {
            const pref = getPreference(category.name);
            return (
              <div
                key={category.name}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      {category.label}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {category.description}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={pref?.email_enabled ?? true}
                      onChange={(e) => updatePreferenceMutation.mutate({
                        category: category.name,
                        data: { email_enabled: e.target.checked },
                      })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <Mail className="h-4 w-4" />
                    Email
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={pref?.in_app_enabled ?? true}
                      onChange={(e) => updatePreferenceMutation.mutate({
                        category: category.name,
                        data: { in_app_enabled: e.target.checked },
                      })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <Bell className="h-4 w-4" />
                    In-App
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={pref?.sms_enabled ?? false}
                      onChange={(e) => updatePreferenceMutation.mutate({
                        category: category.name,
                        data: { sms_enabled: e.target.checked },
                      })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <Smartphone className="h-4 w-4" />
                    SMS
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
