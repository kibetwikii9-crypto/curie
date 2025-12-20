'use client';

import { MessageSquare, User, Clock, AlertCircle, CheckCircle2, Clock as ClockIcon } from 'lucide-react';

export default function HandoffPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Human Handoff & Agent Workspace
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage AI-to-human transitions and agent workflows
        </p>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ClockIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
              Agent Workspace Coming Soon
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Advanced handoff management, agent assignment, and SLA tracking features are in development.
            </p>
          </div>
        </div>
      </div>

      {/* Agent Inbox Preview */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Agent Inbox (Preview)
        </h3>
        <div className="space-y-3">
          {[
            { id: 1, customer: 'Customer A', channel: 'WhatsApp', status: 'assigned', priority: 'high' },
            { id: 2, customer: 'Customer B', channel: 'Instagram', status: 'pending', priority: 'medium' },
            { id: 3, customer: 'Customer C', channel: 'Telegram', status: 'resolved', priority: 'low' },
          ].map((conversation) => (
            <div
              key={conversation.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-gray-400" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {conversation.customer}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {conversation.channel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      conversation.priority === 'high'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        : conversation.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    }`}
                  >
                    {conversation.priority} priority
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      conversation.status === 'assigned'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        : conversation.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    }`}
                  >
                    {conversation.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          This is a preview of the agent inbox structure. Full functionality will be available in a future update.
        </p>
      </div>

      {/* Conversation Assignment Concept */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Assignment Workflow (Preview)
        </h3>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">AI Conversation</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Automated handling</p>
            </div>
          </div>
          <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 mx-4" />
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <User className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Human Agent</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Manual handling</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Conversations will automatically transition from AI to human agents based on:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <li>• User request for human assistance</li>
            <li>• Complex queries requiring expert knowledge</li>
            <li>• Escalation triggers and SLA thresholds</li>
          </ul>
        </div>
      </div>

      {/* SLA & Escalation Indicators */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          SLA & Escalation Indicators (Preview)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Response Time</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Target: &lt; 5 minutes</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Escalation Rate</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tracked per agent</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Resolution Rate</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Measured per conversation</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          Full SLA tracking and escalation management will be available in a future update.
        </p>
      </div>
    </div>
  );
}

