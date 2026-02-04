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
  PieChart,
  Pie,
  Cell,
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
  Eye,
  MessageSquare,
  UserCheck,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ChevronDown,
  X,
} from 'lucide-react';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState(30);
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedIntent, setSelectedIntent] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);

  // Queries with filters
  const { data: intentData, isLoading: intentLoading } = useQuery({
    queryKey: ['analytics', 'intents', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/intents?days=${timeRange}`);
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    queryKey: ['analytics', 'channels', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/channels?days=${timeRange}`);
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: timelineData } = useQuery({
    queryKey: ['analytics', 'timeline', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/timeline?days=${timeRange}`);
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: performanceSummary } = useQuery({
    queryKey: ['analytics', 'performance-summary', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/performance-summary?days=${timeRange}`);
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: conversationFlow } = useQuery({
    queryKey: ['analytics', 'conversation-flow', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/conversation-flow?days=${timeRange}`);
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: intentPerformance } = useQuery({
    queryKey: ['analytics', 'intent-performance', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/intent-performance?days=${timeRange}`);
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: channelEfficiency } = useQuery({
    queryKey: ['analytics', 'channel-efficiency', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/channel-efficiency?days=${timeRange}`);
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: automationEffectiveness } = useQuery({
    queryKey: ['analytics', 'automation-effectiveness', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/automation-effectiveness?days=${timeRange}`);
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: leadOutcomes } = useQuery({
    queryKey: ['analytics', 'lead-outcomes', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/lead-outcomes?days=${timeRange}`);
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: timeBehavior } = useQuery({
    queryKey: ['analytics', 'time-behavior', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/time-behavior?days=${timeRange}`);
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: anomalies } = useQuery({
    queryKey: ['analytics', 'anomalies', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/analytics/anomalies?days=${timeRange}`);
      return response.data;
    },
    refetchInterval: 30000,
  });

  const exportReport = (format: 'json' | 'csv') => {
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

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      // Basic CSV export for performance summary
      let csv = 'Metric,Current,Previous,Trend\n';
      if (performanceSummary) {
        csv += `Conversations,${performanceSummary.conversation_growth.current},${performanceSummary.conversation_growth.previous},${performanceSummary.conversation_growth.trend}%\n`;
        csv += `Leads,${performanceSummary.lead_acquisition.current},${performanceSummary.lead_acquisition.previous},${performanceSummary.lead_acquisition.trend}%\n`;
        csv += `Automation,${performanceSummary.automation_efficiency.percentage}%,N/A,N/A\n`;
      }
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-summary-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Filter data based on selections
  const getFilteredIntentData = () => {
    if (!intentData?.intents) return [];
    if (selectedIntent === 'all') return intentData.intents;
    return intentData.intents.filter((i: any) => i.intent === selectedIntent);
  };

  const getFilteredChannelData = () => {
    if (!channelsData?.channels) return [];
    if (selectedChannel === 'all') return channelsData.channels;
    return channelsData.channels.filter((c: any) => c.channel === selectedChannel);
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 7: return 'Last 7 days';
      case 30: return 'Last 30 days';
      case 90: return 'Last 90 days';
      case 365: return 'Last year';
      default: return `Last ${timeRange} days`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Gradient */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/10 dark:to-blue-900/10 rounded-lg p-6 border border-primary-200 dark:border-primary-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Analytics & Reports
              </h1>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Performance trends, operational efficiency, and growth insights • {getTimeRangeLabel()}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-4 py-2 border shadow-sm text-sm font-medium rounded-md ${
                showFilters
                  ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              } hover:bg-gray-50 dark:hover:bg-gray-600`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
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
            <div className="relative">
              <button
                onClick={() => document.getElementById('export-menu')?.classList.toggle('hidden')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
                <ChevronDown className="h-4 w-4 ml-1" />
              </button>
              <div
                id="export-menu"
                className="hidden absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10"
              >
                <button
                  onClick={() => {
                    exportReport('json');
                    document.getElementById('export-menu')?.classList.add('hidden');
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-md"
                >
                  Export as JSON
                </button>
                <button
                  onClick={() => {
                    exportReport('csv');
                    document.getElementById('export-menu')?.classList.add('hidden');
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-md"
                >
                  Export as CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-primary-200 dark:border-primary-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Channel
                </label>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                >
                  <option value="all">All Channels</option>
                  {channelsData?.channels?.map((channel: any) => (
                    <option key={channel.channel} value={channel.channel} className="capitalize">
                      {channel.channel}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Intent
                </label>
                <select
                  value={selectedIntent}
                  onChange={(e) => setSelectedIntent(e.target.value)}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                >
                  <option value="all">All Intents</option>
                  {intentData?.intents?.map((intent: any) => (
                    <option key={intent.intent} value={intent.intent} className="capitalize">
                      {intent.intent}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedChannel('all');
                    setSelectedIntent('all');
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Executive Performance Summary with Icons */}
      {performanceSummary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <MessageSquare className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              {performanceSummary.conversation_growth.direction === 'up' ? (
                <ArrowUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              ) : performanceSummary.conversation_growth.direction === 'down' ? (
                <ArrowDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              ) : null}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Conversation Growth</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{performanceSummary.conversation_growth.current}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {performanceSummary.conversation_growth.trend > 0 ? '+' : ''}
              {performanceSummary.conversation_growth.trend}% vs previous
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <UserCheck className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              {performanceSummary.lead_acquisition.direction === 'up' ? (
                <ArrowUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              ) : performanceSummary.lead_acquisition.direction === 'down' ? (
                <ArrowDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              ) : null}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Lead Acquisition</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{performanceSummary.lead_acquisition.current}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {performanceSummary.lead_acquisition.trend > 0 ? '+' : ''}
              {performanceSummary.lead_acquisition.trend}% vs previous
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Zap className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <Sparkles className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Automation Efficiency</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{performanceSummary.automation_efficiency.percentage}%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {performanceSummary.automation_efficiency.ai_resolved} AI-resolved
            </p>
          </div>
        </div>
      )}

      {/* Anomaly & Trend Detection */}
      {anomalies && anomalies.anomalies && anomalies.anomalies.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Trends & Anomalies Detected
              </h3>
            </div>
            <div className="space-y-2">
              {anomalies.anomalies.map((anomaly: any, idx: number) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-4 rounded-lg ${
                    anomaly.severity === 'warning'
                      ? 'bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800'
                      : 'bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <AlertCircle
                    className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                      anomaly.severity === 'warning'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
                  />
                  <p className="text-sm text-gray-900 dark:text-white flex-1">{anomaly.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout - Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Conversation Volume with Enhanced Design */}
        {conversationFlow && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Conversation Volume & Flow
                </h3>
              </div>
              {conversationFlow.daily_volume && conversationFlow.daily_volume.length > 0 ? (
                <>
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
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Avg Message Depth</p>
                      <p className="text-xl font-semibold text-gray-900 dark:text-white">
                        {conversationFlow.average_message_depth}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                      <p className="text-xl font-semibold text-gray-900 dark:text-white">
                        {conversationFlow.total_conversations}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                  No conversation data available
                </div>
              )}
            </div>
          </div>
        )}

        {/* Automation Effectiveness with Progress Bars */}
        {automationEffectiveness && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Automation & AI Effectiveness
                </h3>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/10 dark:to-green-800/10 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Success Rate
                    </span>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {automationEffectiveness.success_rate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all"
                      style={{ width: `${automationEffectiveness.success_rate}%` }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Successful AI</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {automationEffectiveness.successful_ai_responses}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Fallbacks</p>
                    <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
                      {automationEffectiveness.fallback_frequency}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Overall Automation Rate</p>
                  <p className="text-3xl font-bold text-primary-600 dark:text-primary-400 mt-1">
                    {automationEffectiveness.automation_rate}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Intent Performance with Better Table Design */}
      {intentPerformance && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Intent Performance Analytics
              </h3>
            </div>
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
                      Leads
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Conversion
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {intentPerformance.intent_performance
                    .filter((intent: any) =>
                      selectedIntent === 'all' ? true : intent.intent === selectedIntent
                    )
                    .map((intent: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                            {intent.intent}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {intent.frequency}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                            {intent.leads_generated}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-primary-600 h-2 rounded-full"
                                style={{ width: `${intent.conversion_rate}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {intent.conversion_rate}%
                            </span>
                          </div>
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

      {/* Channel Efficiency with Enhanced Cards */}
      {channelEfficiency && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Channel Efficiency Reports
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {channelEfficiency.channels
                .filter((channel: any) =>
                  selectedChannel === 'all' ? true : channel.channel === selectedChannel
                )
                .map((channel: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                        {channel.channel}
                      </h4>
                      <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 rounded-full">
                        {channel.total_conversations}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            AI Resolution
                          </span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {channel.ai_resolution_rate}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${channel.ai_resolution_rate}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Lead Quality
                        </span>
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                          {channel.lead_quality}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Leads Generated
                        </span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {channel.leads_generated}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Two Column - Lead Outcomes & Time Behavior */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Lead Outcomes */}
        {leadOutcomes && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Lead & Outcome Analytics
                </h3>
              </div>
              {leadOutcomes.leads_over_time && leadOutcomes.leads_over_time.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
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
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
                      >
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {outcome.intent}
                        </span>
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                          {outcome.leads_generated} leads
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                  No lead data available
                </div>
              )}
            </div>
          </div>
        )}

        {/* Time Behavior */}
        {timeBehavior && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Time-Based Behavior Insights
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/10 dark:to-indigo-800/10 rounded-lg">
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">Peak Hour</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {timeBehavior.peak_hour !== null ? `${timeBehavior.peak_hour}:00` : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/10 dark:to-purple-800/10 rounded-lg">
                  <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">Peak Day</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {timeBehavior.peak_day || 'N/A'}
                  </p>
                </div>
              </div>
              {timeBehavior.hour_distribution && timeBehavior.hour_distribution.length > 0 && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Hour Distribution
                  </p>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={timeBehavior.hour_distribution.slice(0, 12)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="hour" stroke="#6b7280" fontSize={10} />
                      <YAxis stroke="#6b7280" fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Original Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Intent Distribution Pie Chart */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Intent Distribution
          </h3>
          {intentLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : getFilteredIntentData().length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getFilteredIntentData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.intent}: ${entry.count}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {getFilteredIntentData().map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              No intent data available
            </div>
          )}
        </div>

        {/* Conversation Timeline */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Conversation Timeline
          </h3>
          {timelineData?.timeline && timelineData.timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData.timeline}>
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
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              No timeline data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
