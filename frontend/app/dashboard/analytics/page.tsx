'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Filter,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  Users,
  Target,
  Activity,
  BarChart3,
} from 'lucide-react';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState(30);
  const [selectedChannel, setSelectedChannel] = useState<string>('');

  // Existing queries
  const { data: intentData } = useQuery({
    queryKey: ['analytics', 'intents', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/intents?days=${timeRange}`);
      return response.data;
    },
  });

  const { data: timelineData } = useQuery({
    queryKey: ['analytics', 'timeline', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/timeline?days=${timeRange}`);
      return response.data;
    },
  });

  // New extended analytics queries
  const { data: performanceSummary } = useQuery({
    queryKey: ['analytics', 'performance-summary', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/performance-summary?days=${timeRange}`);
      return response.data;
    },
  });

  const { data: conversationFlow } = useQuery({
    queryKey: ['analytics', 'conversation-flow', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/conversation-flow?days=${timeRange}`);
      return response.data;
    },
  });

  const { data: intentPerformance } = useQuery({
    queryKey: ['analytics', 'intent-performance', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/intent-performance?days=${timeRange}`);
      return response.data;
    },
  });

  const { data: channelEfficiency } = useQuery({
    queryKey: ['analytics', 'channel-efficiency', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/channel-efficiency?days=${timeRange}`);
      return response.data;
    },
  });

  const { data: automationEffectiveness } = useQuery({
    queryKey: ['analytics', 'automation-effectiveness', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/automation-effectiveness?days=${timeRange}`);
      return response.data;
    },
  });

  const { data: leadOutcomes } = useQuery({
    queryKey: ['analytics', 'lead-outcomes', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/lead-outcomes?days=${timeRange}`);
      return response.data;
    },
  });

  const { data: timeBehavior } = useQuery({
    queryKey: ['analytics', 'time-behavior', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/time-behavior?days=${timeRange}`);
      return response.data;
    },
  });

  const { data: anomalies } = useQuery({
    queryKey: ['analytics', 'anomalies', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/anomalies?days=${timeRange}`);
      return response.data;
    },
  });

  const exportReport = () => {
    const reportData = {
      performance_summary: performanceSummary,
      conversation_flow: conversationFlow,
      intent_performance: intentPerformance,
      channel_efficiency: channelEfficiency,
      automation_effectiveness: automationEffectiveness,
      lead_outcomes: leadOutcomes,
      time_behavior: timeBehavior,
      anomalies: anomalies,
      exported_at: new Date().toISOString(),
      time_range_days: timeRange,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Analytics & Reports
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Performance trends, operational efficiency, and growth insights
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <button
            onClick={exportReport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Executive Performance Summary */}
      {performanceSummary && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Executive Performance Summary
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Conversation Growth</p>
                  {performanceSummary.conversation_growth.direction === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : performanceSummary.conversation_growth.direction === 'down' ? (
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                  ) : null}
                </div>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {performanceSummary.conversation_growth.current}
                </p>
                <p className={`text-sm mt-1 ${
                  performanceSummary.conversation_growth.trend > 0
                    ? 'text-green-600 dark:text-green-400'
                    : performanceSummary.conversation_growth.trend < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {performanceSummary.conversation_growth.trend > 0 ? '+' : ''}
                  {performanceSummary.conversation_growth.trend}% vs previous period
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Lead Acquisition</p>
                  {performanceSummary.lead_acquisition.direction === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : performanceSummary.lead_acquisition.direction === 'down' ? (
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                  ) : null}
                </div>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {performanceSummary.lead_acquisition.current}
                </p>
                <p className={`text-sm mt-1 ${
                  performanceSummary.lead_acquisition.trend > 0
                    ? 'text-green-600 dark:text-green-400'
                    : performanceSummary.lead_acquisition.trend < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {performanceSummary.lead_acquisition.trend > 0 ? '+' : ''}
                  {performanceSummary.lead_acquisition.trend}% vs previous period
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Automation Efficiency</p>
                  <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {performanceSummary.automation_efficiency.percentage}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {performanceSummary.automation_efficiency.ai_resolved} AI-resolved
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Anomaly & Trend Detection */}
      {anomalies && anomalies.anomalies && anomalies.anomalies.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Trends & Anomalies
            </h3>
            <div className="space-y-2">
              {anomalies.anomalies.map((anomaly: any, idx: number) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    anomaly.severity === 'warning'
                      ? 'bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800'
                      : 'bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <AlertCircle className={`h-5 w-5 mt-0.5 ${
                    anomaly.severity === 'warning'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`} />
                  <p className="text-sm text-gray-900 dark:text-white">{anomaly.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Conversation Volume & Flow Analysis */}
        {conversationFlow && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Conversation Volume & Flow
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={conversationFlow.daily_volume}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorVolume)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Average message depth: {conversationFlow.average_message_depth}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  Total: {conversationFlow.total_conversations} conversations
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Automation & AI Effectiveness */}
        {automationEffectiveness && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Automation & AI Effectiveness
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Success Rate</span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {automationEffectiveness.success_rate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${automationEffectiveness.success_rate}%` }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Successful AI</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {automationEffectiveness.successful_ai_responses}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Fallbacks</p>
                    <p className="text-xl font-semibold text-yellow-600 dark:text-yellow-400">
                      {automationEffectiveness.fallback_frequency}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Automation Rate</p>
                  <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                    {automationEffectiveness.automation_rate}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Intent Performance Analytics */}
      {intentPerformance && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Intent Performance Analytics
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Intent
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Frequency
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Leads Generated
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Conversion Rate
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {intentPerformance.intent_performance.map((intent: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {intent.intent}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {intent.frequency}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {intent.leads_generated}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {intent.conversion_rate}%
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {intent.causes_fallback ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                            Fallback
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Channel Efficiency Reports */}
      {channelEfficiency && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Channel Efficiency Reports
            </h3>
            <div className="space-y-4">
              {channelEfficiency.channels.map((channel: any, idx: number) => (
                <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {channel.channel}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {channel.total_conversations} conversations
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">AI Resolution</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {channel.ai_resolution_rate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Lead Quality</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {channel.lead_quality}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Leads Generated</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {channel.leads_generated}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Lead & Outcome Analytics */}
        {leadOutcomes && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Lead & Outcome Analytics
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={leadOutcomes.leads_over_time}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Top Lead Sources
                </p>
                {leadOutcomes.intent_outcomes.slice(0, 3).map((outcome: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 capitalize">
                      {outcome.intent}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {outcome.leads_generated} leads
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Time-Based Behavior Insights */}
        {timeBehavior && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Time-Based Behavior Insights
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Peak Engagement Hour</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {timeBehavior.peak_hour !== null ? `${timeBehavior.peak_hour}:00` : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Peak Engagement Day</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {timeBehavior.peak_day || 'N/A'}
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Hour Distribution</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={timeBehavior.hour_distribution.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="hour" stroke="#6b7280" fontSize={10} />
                      <YAxis stroke="#6b7280" fontSize={10} />
                      <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Existing Charts - Keep for continuity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Intent Frequency Chart */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Intent Frequency
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={intentData?.intents || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="intent" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
              />
              <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Timeline Chart */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Conversation Timeline
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData?.timeline || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={{ fill: '#0ea5e9', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
