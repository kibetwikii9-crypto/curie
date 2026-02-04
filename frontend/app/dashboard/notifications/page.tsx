'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  Search,
  MessageSquare,
  UserPlus,
  AlertCircle,
  Settings,
  TrendingUp,
  Calendar,
  Archive,
  Eye,
  EyeOff,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
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

interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  today: number;
  this_week: number;
  by_category: Record<string, number>;
  by_type: Record<string, number>;
}

export default function NotificationsPage() {
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'read'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotifs, setSelectedNotifs] = useState<number[]>([]);
  const [bulkMode, setBulkMode] = useState(false);

  const queryClient = useQueryClient();

  // Queries
  const { data: stats } = useQuery<NotificationStats>({
    queryKey: ['notification-stats'],
    queryFn: async () => {
      const response = await api.get('/api/notifications/stats/dashboard');
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications', filterStatus, filterCategory],
    queryFn: async () => {
      const params: any = {};
      if (filterStatus === 'unread') params.is_read = false;
      if (filterStatus === 'read') params.is_read = true;
      if (filterCategory) params.category = filterCategory;
      const response = await api.get('/api/notifications/', { params });
      return response.data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds for real-time feel
  });

  // Mutations
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await api.post(`/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await api.delete(`/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await api.post('/api/notifications/bulk/delete', ids);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
      setSelectedNotifs([]);
      setBulkMode(false);
    },
  });

  const deleteAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/notifications/delete-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_conversation':
      case 'message':
        return <MessageSquare className="h-5 w-5" />;
      case 'lead_captured':
      case 'new_lead':
        return <UserPlus className="h-5 w-5" />;
      case 'system_alert':
      case 'alert':
        return <AlertCircle className="h-5 w-5" />;
      case 'settings':
        return <Settings className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'new_conversation':
      case 'message':
        return 'from-blue-500 to-cyan-600';
      case 'lead_captured':
      case 'new_lead':
        return 'from-green-500 to-emerald-600';
      case 'system_alert':
      case 'alert':
        return 'from-red-500 to-orange-600';
      case 'settings':
        return 'from-purple-500 to-pink-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        notif.title.toLowerCase().includes(searchLower) ||
        notif.message.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const toggleNotification = (id: number) => {
    setSelectedNotifs((prev) =>
      prev.includes(id) ? prev.filter((nid) => nid !== id) : [...prev, id]
    );
  };

  const toggleAllNotifications = () => {
    if (selectedNotifs.length === filteredNotifications.length) {
      setSelectedNotifs([]);
    } else {
      setSelectedNotifs(filteredNotifications.map((n) => n.id));
    }
  };

  const categories = stats ? Object.keys(stats.by_category) : [];

  return (
    <div className="space-y-6">
      {/* Enhanced Hero Header */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg p-1 shadow-lg">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <BellRing className="h-8 w-8 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Notification Center
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Stay updated with your latest activities and alerts
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <Bell className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Unread</p>
                <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.unread}</p>
              </div>
              <BellRing className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Read</p>
                <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.read}</p>
              </div>
              <CheckCheck className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Today</p>
                <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.today}</p>
              </div>
              <Calendar className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cyan-100">This Week</p>
                <p className="text-2xl font-bold mt-1">{stats.this_week}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-cyan-200" />
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Bulk Mode Toggle */}
            <button
              onClick={() => {
                setBulkMode(!bulkMode);
                setSelectedNotifs([]);
              }}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                bulkMode
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Bulk Mode
            </button>

            {/* Actions */}
            {stats && stats.unread > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md text-sm font-medium transition-all"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read
              </button>
            )}

            {stats && stats.read > 0 && (
              <button
                onClick={() => {
                  if (confirm('Delete all read notifications?')) {
                    deleteAllReadMutation.mutate();
                  }
                }}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md text-sm font-medium transition-all"
              >
                <Archive className="h-4 w-4 mr-2" />
                Clear Read
              </button>
            )}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {bulkMode && selectedNotifs.length > 0 && (
          <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/10 rounded-lg border-2 border-primary-200 dark:border-primary-700">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                {selectedNotifs.length} notification{selectedNotifs.length !== 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedNotifs([])}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${selectedNotifs.length} notification(s)?`)) {
                      bulkDeleteMutation.mutate(selectedNotifs);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all"
                >
                  <Trash2 className="h-4 w-4 inline mr-2" />
                  Delete Selected
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Select All */}
      {bulkMode && filteredNotifications.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={selectedNotifs.length === filteredNotifications.length}
              onChange={toggleAllNotifications}
              className="h-5 w-5 text-indigo-600 rounded border-gray-300 dark:border-gray-600"
            />
            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Select All ({filteredNotifications.length})
            </span>
          </label>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow border transition-all ${
              notification.is_read
                ? 'border-gray-200 dark:border-gray-700'
                : 'border-indigo-200 dark:border-indigo-700 bg-gradient-to-r from-indigo-50/30 to-purple-50/30 dark:from-indigo-900/10 dark:to-purple-900/10'
            } ${bulkMode ? 'hover:shadow-lg' : ''}`}
          >
            <div className="p-5">
              <div className="flex items-start gap-4">
                {/* Bulk Select Checkbox */}
                {bulkMode && (
                  <input
                    type="checkbox"
                    checked={selectedNotifs.includes(notification.id)}
                    onChange={() => toggleNotification(notification.id)}
                    className="mt-1 h-5 w-5 text-indigo-600 rounded border-gray-300 dark:border-gray-600"
                  />
                )}

                {/* Icon */}
                <div
                  className={`flex-shrink-0 p-3 bg-gradient-to-br ${getNotificationColor(
                    notification.type
                  )} rounded-lg text-white shadow-lg`}
                >
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`text-base font-semibold ${
                            notification.is_read
                              ? 'text-gray-700 dark:text-gray-300'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <span className="flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-sm mt-1 ${
                          notification.is_read
                            ? 'text-gray-600 dark:text-gray-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          <TimeAgo timestamp={notification.created_at} />
                        </span>
                        {notification.category && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            <Tag className="h-3 w-3 mr-1" />
                            {notification.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {!bulkMode && (
                      <div className="flex items-center gap-2">
                        {!notification.is_read && (
                          <button
                            onClick={() => markReadMutation.mutate(notification.id)}
                            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            title="Mark as read"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Delete this notification?')) {
                              deleteNotificationMutation.mutate(notification.id);
                            }
                          }}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {filteredNotifications.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center mb-6">
              <Bell className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No notifications
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {searchTerm
                ? 'No notifications match your search'
                : filterStatus === 'unread'
                ? "You're all caught up! No unread notifications"
                : filterCategory
                ? `No notifications in ${filterCategory} category`
                : 'You have no notifications yet'}
            </p>
            {(searchTerm || filterStatus !== 'all' || filterCategory) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterCategory('');
                }}
                className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-md transition-all"
              >
                <X className="h-5 w-5 mr-2" />
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
