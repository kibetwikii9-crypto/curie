'use client';

import { Bell, Mail, Smartphone, Clock, CheckCircle2, XCircle } from 'lucide-react';

const alertCategories = [
  {
    name: 'New Conversations',
    description: 'Get notified when new conversations start',
    channels: ['email', 'in-app'],
  },
  {
    name: 'High Priority Messages',
    description: 'Alerts for urgent customer inquiries',
    channels: ['email', 'in-app', 'sms'],
  },
  {
    name: 'Lead Captured',
    description: 'Notifications when new leads are generated',
    channels: ['email', 'in-app'],
  },
  {
    name: 'System Alerts',
    description: 'Important system updates and maintenance',
    channels: ['email'],
  },
];

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Notifications & Alerts
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Configure how and when you receive notifications
        </p>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
              Notification System Coming Soon
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Advanced notification preferences, alert management, and multi-channel delivery are in development.
            </p>
          </div>
        </div>
      </div>

      {/* Alert Categories */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Alert Categories
        </h3>
        <div className="space-y-4">
          {alertCategories.map((category, idx) => (
            <div
              key={idx}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {category.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {category.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500 dark:text-gray-400">Channels:</span>
                <div className="flex gap-2">
                  {category.channels.map((channel) => (
                    <span
                      key={channel}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 capitalize"
                    >
                      {channel === 'in-app' ? 'In-App' : channel}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    disabled
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-not-allowed opacity-50"
                  />
                  Enable notifications
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Channels */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Notification Channels
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Mail className="h-5 w-5 text-primary-500" />
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Email</h4>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Receive notifications via email
            </p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-not-allowed opacity-50"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">Available Soon</span>
            </div>
          </div>
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Bell className="h-5 w-5 text-primary-500" />
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">In-App</h4>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Notifications within the platform
            </p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-not-allowed opacity-50"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">Available Soon</span>
            </div>
          </div>
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Smartphone className="h-5 w-5 text-primary-500" />
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">SMS</h4>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Text message notifications
            </p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-not-allowed opacity-50"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">Planned</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sample Alert Cards */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Sample Alert Cards (Preview)
        </h3>
        <div className="space-y-3">
          {[
            { type: 'new_conversation', message: 'New conversation started on Instagram', time: '2 minutes ago', unread: true },
            { type: 'lead_captured', message: 'New lead captured: john@example.com', time: '15 minutes ago', unread: true },
            { type: 'system', message: 'System maintenance scheduled for tonight', time: '1 hour ago', unread: false },
          ].map((alert, idx) => (
            <div
              key={idx}
              className={`p-4 border rounded-lg ${
                alert.unread
                  ? 'border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/10'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Bell className={`h-4 w-4 ${alert.unread ? 'text-primary-500' : 'text-gray-400'}`} />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {alert.message}
                    </p>
                    {alert.unread && (
                      <span className="h-2 w-2 rounded-full bg-primary-500" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{alert.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          Full notification management and preferences will be available in a future update.
        </p>
      </div>
    </div>
  );
}

