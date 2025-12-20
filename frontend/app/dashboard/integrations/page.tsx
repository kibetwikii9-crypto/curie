'use client';

import { Plug, CheckCircle2, Clock, AlertCircle, ExternalLink } from 'lucide-react';

const channels = [
  {
    name: 'WhatsApp',
    status: 'coming_soon',
    description: 'Connect WhatsApp Business API for customer support',
    icon: '💬',
  },
  {
    name: 'Instagram',
    status: 'coming_soon',
    description: 'Manage Instagram Direct Messages and comments',
    icon: '📷',
  },
  {
    name: 'Facebook Messenger',
    status: 'coming_soon',
    description: 'Integrate Facebook Messenger conversations',
    icon: '👥',
  },
  {
    name: 'Telegram',
    status: 'connected',
    description: 'Telegram bot integration (currently active)',
    icon: '✈️',
  },
  {
    name: 'Website Chat',
    status: 'coming_soon',
    description: 'Embed chat widget on your website',
    icon: '🌐',
  },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Integrations & Channels
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Connect and manage your communication channels
        </p>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
              Multi-Channel Integration Coming Soon
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              We're working on expanding channel support. Additional integrations will be available in a future update.
            </p>
          </div>
        </div>
      </div>

      {/* Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {channels.map((channel) => (
          <div
            key={channel.name}
            className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{channel.icon}</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {channel.name}
                  </h3>
                  {channel.status === 'connected' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 mt-1">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Connected
                    </span>
                  )}
                  {channel.status === 'coming_soon' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      Coming Soon
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {channel.description}
            </p>
            <button
              disabled={channel.status === 'coming_soon'}
              className={`w-full inline-flex items-center justify-center px-4 py-2 border rounded-md text-sm font-medium ${
                channel.status === 'connected'
                  ? 'border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30'
                  : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 cursor-not-allowed'
              }`}
            >
              {channel.status === 'connected' ? (
                <>
                  <Plug className="h-4 w-4 mr-2" />
                  Configure
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Available Soon
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Integration Readiness */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Integration Readiness
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="text-sm text-gray-700 dark:text-gray-300">API Authentication</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Planned</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="text-sm text-gray-700 dark:text-gray-300">Webhook Management</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Planned</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="text-sm text-gray-700 dark:text-gray-300">Multi-Channel Routing</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Planned</span>
          </div>
        </div>
      </div>
    </div>
  );
}

