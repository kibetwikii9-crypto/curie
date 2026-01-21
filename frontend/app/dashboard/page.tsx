'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import TimeAgo from '@/components/TimeAgo';
import {
  MessageSquare,
  Users,
  TrendingUp,
  Zap,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Target,
  BarChart3,
  Lightbulb,
  Calendar,
  ArrowRight,
  Sparkles,
  CreditCard,
  Brain,
  Mic,
} from 'lucide-react';

interface SystemHealth {
  ai_engine_status: string;
  rule_coverage_health: number;
  fallback_trigger_rate: number;
  channel_connectivity: number;
}

interface ChannelPerformance {
  channel: string;
  message_volume: number;
  lead_capture_rate: number;
  ai_resolution_rate: number;
  peak_activity_hour: number | null;
}

interface IntentQuality {
  intent: string;
  count: number;
  leads_generated: number;
  is_fallback: boolean;
}

interface ConversationFlow {
  incoming: number;
  ai_responses: number;
  user_engagement: number;
  leads_captured: number;
  human_handoffs: number;
}

interface Alert {
  type: string;
  priority: string;
  title: string;
  message: string;
}

interface RecentActivity {
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

interface LeadSnapshot {
  leads_today: number;
  leads_this_week: number;
  best_channel: string | null;
  top_lead_intent: string | null;
}

interface TimeInsights {
  best_hour: number | null;
  best_day: string | null;
}

interface OverviewData {
  total_conversations: number;
  active_chats: number;
  leads_captured: number;
  most_common_intents: Array<{ intent: string; count: number }>;
  channel_distribution: Array<{ channel: string; count: number }>;
  period_days: number;
  system_health: SystemHealth;
  channel_performance: ChannelPerformance[];
  intent_quality: {
    top_performing: IntentQuality[];
    lead_generating: IntentQuality[];
    causing_fallbacks: IntentQuality[];
  };
  conversation_flow: ConversationFlow;
  alerts: Alert[];
  recent_activity: RecentActivity[];
  lead_snapshot: LeadSnapshot;
  time_insights: TimeInsights;
}

export default function DashboardPage() {
  const { data, isLoading, refetch } = useQuery<OverviewData>({
    queryKey: ['dashboard', 'overview'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/overview');
      return response.data;
    },
    // Auto-refresh every 30 seconds when page is visible
    refetchInterval: 30000, // 30 seconds
    // Only refetch when tab/window is visible (saves resources)
    refetchIntervalInBackground: false,
    // Refetch when window regains focus
    refetchOnWindowFocus: true,
    // Don't refetch on reconnect if data is fresh (less than 30 seconds old)
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Calculate response rate from conversation flow data
  const responseRate = data?.conversation_flow 
    ? Math.round((data.conversation_flow.ai_responses / data.conversation_flow.incoming) * 100) || 0
    : 0;

  const stats = [
    {
      name: 'Total Conversations',
      value: data?.total_conversations || 0,
      icon: MessageSquare,
    },
    {
      name: 'Active Chats',
      value: data?.active_chats || 0,
      icon: Zap,
    },
    {
      name: 'Leads Captured',
      value: data?.leads_captured || 0,
      icon: Users,
    },
    {
      name: 'Response Rate',
      value: `${responseRate}%`,
      icon: TrendingUp,
    },
  ];

  const getHealthStatusColor = (status: string) => {
    if (status === 'running') return 'text-green-600 dark:text-green-400';
    if (status === 'degraded') return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getHealthStatusBg = (status: string) => {
    if (status === 'running') return 'bg-green-50 dark:bg-green-900/20';
    if (status === 'degraded') return 'bg-yellow-50 dark:bg-yellow-900/20';
    return 'bg-red-50 dark:bg-red-900/20';
  };

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 80) return 'text-green-600 dark:text-green-400';
    if (coverage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getAlertIcon = (type: string) => {
    if (type === 'warning') return AlertCircle;
    if (type === 'error') return AlertCircle;
    return Lightbulb;
  };

  const getAlertColor = (type: string) => {
    if (type === 'warning') return 'text-yellow-600 dark:text-yellow-400';
    if (type === 'error') return 'text-red-600 dark:text-red-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const formatHour = (hour: number | null) => {
    if (hour === null) return 'N/A';
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:00 ${period}`;
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Overview
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Your chatbot performance at a glance
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-500">
              (Auto-refreshes every 30s)
            </span>
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Refresh data"
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 dark:border-gray-400 mr-2"></div>
              Refreshing...
            </div>
          ) : (
            <div className="flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </div>
          )}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stat.value}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* System Health Snapshot */}
      {data?.system_health && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              System Health
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2 rounded-lg ${getHealthStatusBg(data.system_health.ai_engine_status)}`}
                >
                  <Activity
                    className={`h-5 w-5 ${getHealthStatusColor(data.system_health.ai_engine_status)}`}
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">AI Engine</p>
                  <p
                    className={`text-sm font-medium capitalize ${getHealthStatusColor(data.system_health.ai_engine_status)}`}
                  >
                    {data.system_health.ai_engine_status}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2 rounded-lg ${
                    data.system_health.rule_coverage_health >= 80
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : data.system_health.rule_coverage_health >= 60
                      ? 'bg-yellow-50 dark:bg-yellow-900/20'
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <Target
                    className={`h-5 w-5 ${getCoverageColor(data.system_health.rule_coverage_health)}`}
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Rule Coverage</p>
                  <p
                    className={`text-sm font-medium ${getCoverageColor(data.system_health.rule_coverage_health)}`}
                  >
                    {data.system_health.rule_coverage_health}%
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2 rounded-lg ${
                    data.system_health.fallback_trigger_rate < 10
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : data.system_health.fallback_trigger_rate < 20
                      ? 'bg-yellow-50 dark:bg-yellow-900/20'
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <AlertCircle
                    className={`h-5 w-5 ${
                      data.system_health.fallback_trigger_rate < 10
                        ? 'text-green-600 dark:text-green-400'
                        : data.system_health.fallback_trigger_rate < 20
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Fallback Rate</p>
                  <p
                    className={`text-sm font-medium ${
                      data.system_health.fallback_trigger_rate < 10
                        ? 'text-green-600 dark:text-green-400'
                        : data.system_health.fallback_trigger_rate < 20
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {data.system_health.fallback_trigger_rate}%
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Channels Active</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {data.system_health.channel_connectivity}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout for Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Channel Performance Intelligence */}
        {data?.channel_performance && data.channel_performance.length > 0 && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Channel Performance
              </h3>
              <div className="space-y-4">
                {data.channel_performance.map((channel) => (
                  <div
                    key={channel.channel}
                    className="border-b border-gray-200 dark:border-gray-700 last:border-0 pb-4 last:pb-0"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {channel.channel}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {channel.message_volume} messages
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Lead Rate</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {channel.lead_capture_rate}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">AI Resolution</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {channel.ai_resolution_rate}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Peak Hour</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatHour(channel.peak_activity_hour)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Intent Quality & Coverage Panel */}
        {data?.intent_quality && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Intent Quality & Coverage
              </h3>
              <div className="space-y-4">
                {data.intent_quality.top_performing.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Top Performing
                    </p>
                    <div className="space-y-2">
                      {data.intent_quality.top_performing.slice(0, 3).map((intent) => (
                        <div
                          key={intent.intent}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-gray-900 dark:text-white capitalize">
                            {intent.intent}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {intent.leads_generated} leads
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {data.intent_quality.causing_fallbacks.length > 0 && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 uppercase tracking-wide mb-2">
                      Needs Attention
                    </p>
                    <div className="space-y-2">
                      {data.intent_quality.causing_fallbacks.slice(0, 2).map((intent) => (
                        <div
                          key={intent.intent}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-gray-900 dark:text-white capitalize">
                            {intent.intent}
                          </span>
                          <span className="text-yellow-600 dark:text-yellow-400">
                            {intent.count} fallbacks
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Conversation Flow Funnel */}
      {data?.conversation_flow && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Conversation Flow
            </h3>
            <div className="flex items-center justify-between space-x-4 overflow-x-auto pb-2">
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {data.conversation_flow.incoming}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                  Incoming
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {data.conversation_flow.ai_responses}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                  AI Responses
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {data.conversation_flow.user_engagement}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                  Engaged
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {data.conversation_flow.leads_captured}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                  Leads
                </div>
              </div>
              {data.conversation_flow.human_handoffs > 0 && (
                <>
                  <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex flex-col items-center min-w-[100px]">
                    <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                      {data.conversation_flow.human_handoffs}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                      Handoffs
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout for Alerts and Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Smart Alerts & Recommendations */}
        {data?.alerts && data.alerts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Smart Alerts & Recommendations
              </h3>
              <div className="space-y-3">
                {data.alerts.map((alert, index) => {
                  const Icon = getAlertIcon(alert.type);
                  return (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                    >
                      <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${getAlertColor(alert.type)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {alert.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {alert.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity Timeline */}
        {data?.recent_activity && data.recent_activity.length > 0 && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Recent Activity
              </h3>
              <div className="space-y-3">
                {data.recent_activity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {activity.type === 'lead' ? (
                        <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : activity.type === 'intent_gap' ? (
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      ) : (
                        <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        <TimeAgo timestamp={activity.timestamp} />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lead Snapshot Summary */}
      {data?.lead_snapshot && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Lead Snapshot
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Today</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">
                  {data.lead_snapshot.leads_today}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">This Week</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">
                  {data.lead_snapshot.leads_this_week}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Best Channel</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1 capitalize">
                  {data.lead_snapshot.best_channel || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Top Intent</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1 capitalize">
                  {data.lead_snapshot.top_lead_intent || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time-Based Performance Insights */}
      {data?.time_insights && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Performance Insights
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Best Performing Hour</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {formatHour(data.time_insights.best_hour)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Best Performing Day</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {data.time_insights.best_day || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Most Common Intents */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Most Common Intents
          </h3>
          <div className="mt-5">
            <div className="space-y-4">
              {data?.most_common_intents.map((item, index) => (
                <div key={item.intent} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-8">
                      #{index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {item.intent}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Channel Distribution */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Channel Distribution
          </h3>
          <div className="mt-5">
            <div className="space-y-4">
              {data?.channel_distribution.map((item) => (
                <div key={item.channel} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {item.channel}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
