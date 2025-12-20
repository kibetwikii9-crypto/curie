'use client';

import { Users, TrendingUp, Filter, Download, Clock, CheckCircle2, XCircle } from 'lucide-react';

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Lead Management (CRM-lite)
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Track and manage customer leads from conversations
        </p>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
              CRM Features Coming Soon
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Advanced lead management, pipeline tracking, and CRM capabilities are in development.
            </p>
          </div>
        </div>
      </div>

      {/* Lead List Preview */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Lead List (Preview)
          </h3>
          <div className="flex gap-2">
            <button
              disabled
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </button>
            <button
              disabled
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { name: 'John Doe', email: 'john@example.com', status: 'new', source: 'Instagram', value: '$500' },
            { name: 'Jane Smith', email: 'jane@example.com', status: 'contacted', source: 'WhatsApp', value: '$1,200' },
            { name: 'Bob Johnson', email: 'bob@example.com', status: 'qualified', source: 'Telegram', value: '$800' },
          ].map((lead, idx) => (
            <div
              key={idx}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {lead.name}
                    </h4>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        lead.status === 'new'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          : lead.status === 'contacted'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      }`}
                    >
                      {lead.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>{lead.email}</span>
                    <span>•</span>
                    <span className="capitalize">{lead.source}</span>
                    <span>•</span>
                    <span>Est. Value: {lead.value}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          This is a preview of the lead list structure. Full CRM functionality will be available in a future update.
        </p>
      </div>

      {/* Lead Profile Layout */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Lead Profile Layout (Preview)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Contact Information
              </h4>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p>Name, Email, Phone</p>
                <p>Company, Job Title</p>
                <p>Location, Timezone</p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Interaction History
              </h4>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p>Conversation timeline</p>
                <p>Messages and responses</p>
                <p>Intent tracking</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Lead Status
              </h4>
              <div className="space-y-2">
                {['New', 'Contacted', 'Qualified', 'Converted'].map((status) => (
                  <div key={status} className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <span className="text-gray-600 dark:text-gray-400">{status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Lead Score
              </h4>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">75</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Based on engagement</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Lifecycle Preview */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Lead Status Lifecycle (Preview)
        </h3>
        <div className="flex items-center justify-between">
          {['New', 'Contacted', 'Qualified', 'Proposal', 'Converted'].map((status, idx) => (
            <div key={status} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center mb-2">
                  <CheckCircle2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <span className="text-xs font-medium text-gray-900 dark:text-white">{status}</span>
              </div>
              {idx < 4 && (
                <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 mx-2" />
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          Full lifecycle management and automation will be available in a future update.
        </p>
      </div>
    </div>
  );
}

