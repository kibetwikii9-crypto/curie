'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import TimeAgo from '@/components/TimeAgo';
import {
  Plus,
  Save,
  Trash2,
  Edit,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Tag,
  Eye,
  ArrowRight,
  Activity,
  Target,
  BarChart3,
  Lightbulb,
  Play,
  X,
} from 'lucide-react';

interface IntentRule {
  id: string;
  intent: string;
  keywords: string[];
  response: string;
  priority: number;
}

interface RuleCoverage {
  total_active_rules: number;
  intents_with_coverage: string[];
  intents_without_coverage: string[];
  fallback_frequency: number;
  fallback_rate: number;
  successful_rules: Array<{ intent: string; leads_generated: number }>;
  coverage_percentage: number;
}

interface RuleEffectiveness {
  intent: string;
  keywords: string[];
  trigger_frequency: number;
  successful_response_rate: number;
  leads_generated: number;
  knowledge_linked: boolean;
  last_triggered: string | null;
}

interface ConfidenceSignal {
  type: string;
  message: string;
}

interface AutomationFlow {
  user_message: number;
  intent_detection: number;
  rule_match: number;
  knowledge_response: boolean;
  outcomes: {
    success: number;
    fallback: number;
    handoff: number;
  };
}

interface RuleRecommendation {
  type: string;
  priority: string;
  message: string;
}

export default function AIRulesPage() {
  const [rules, setRules] = useState<IntentRule[]>([
    {
      id: '1',
      intent: 'greeting',
      keywords: ['hi', 'hello', 'hey'],
      response: 'Hello! How can I help you today?',
      priority: 1,
    },
    {
      id: '2',
      intent: 'pricing',
      keywords: ['price', 'cost', 'pricing'],
      response: 'Our pricing plans are flexible. Would you like to know more?',
      priority: 2,
    },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTestMode, setShowTestMode] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  const { data: coverageData } = useQuery<RuleCoverage>({
    queryKey: ['ai-rules-coverage'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ai-rules/coverage');
      return response.data;
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const { data: effectivenessData } = useQuery<{ rules: RuleEffectiveness[] }>({
    queryKey: ['ai-rules-effectiveness'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ai-rules/effectiveness');
      return response.data;
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const { data: confidenceData } = useQuery<{ signals: ConfidenceSignal[]; fallback_rate: number; total_conversations: number }>({
    queryKey: ['ai-rules-confidence'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ai-rules/confidence');
      return response.data;
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const { data: flowData } = useQuery<{ flow: AutomationFlow }>({
    queryKey: ['ai-rules-flow'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ai-rules/flow');
      return response.data;
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const { data: recommendationsData } = useQuery<{ recommendations: RuleRecommendation[] }>({
    queryKey: ['ai-rules-recommendations'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ai-rules/recommendations');
      return response.data;
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const testMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await api.post('/api/dashboard/ai-rules/test', { message });
      return response.data;
    },
    onSuccess: (data) => {
      setTestResult(data);
    },
  });

  const handleSave = (rule: IntentRule) => {
    if (editingId) {
      setRules(rules.map((r) => (r.id === editingId ? rule : r)));
      setEditingId(null);
    } else {
      setRules([...rules, { ...rule, id: Date.now().toString() }]);
      setShowAddForm(false);
    }
  };

  const handleDelete = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  const handleTest = () => {
    if (testMessage.trim()) {
      testMutation.mutate(testMessage);
    }
  };

  const getConfidenceColor = (type: string) => {
    switch (type) {
      case 'high_confidence':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'moderate_confidence':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low_confidence':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'overlapping_rules':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI Rules & Automation
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Configure intent detection and response rules with intelligent insights
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTestMode(!showTestMode)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <Play className="h-4 w-4 mr-2" />
            Test Mode
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Rule Coverage & Health Overview */}
      {coverageData && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Rule Coverage & Health
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active Rules</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                  {coverageData.total_active_rules}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Coverage</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                  {coverageData.coverage_percentage}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Fallback Rate</p>
                <p className={`text-2xl font-semibold mt-1 ${
                  coverageData.fallback_rate < 10
                    ? 'text-green-600 dark:text-green-400'
                    : coverageData.fallback_rate < 20
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {coverageData.fallback_rate}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Successful Rules</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                  {coverageData.successful_rules.length}
                </p>
              </div>
            </div>
            {coverageData.intents_without_coverage.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-1">
                  Intents without coverage:
                </p>
                <div className="flex flex-wrap gap-2">
                  {coverageData.intents_without_coverage.map((intent, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 capitalize"
                    >
                      {intent}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Automation Confidence Signals */}
      {confidenceData && confidenceData.signals.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Automation Confidence
            </h3>
            <div className="space-y-2">
              {confidenceData.signals.map((signal, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg ${getConfidenceColor(signal.type)}`}
                >
                  {signal.type === 'high_confidence' ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  <p className="text-sm font-medium">{signal.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Automation Flow Visualization */}
      {flowData && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Automation Flow
            </h3>
            <div className="flex items-center justify-between space-x-4 overflow-x-auto pb-2">
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {flowData.flow.user_message}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                  User Message
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {flowData.flow.intent_detection}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                  Intent Detection
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {flowData.flow.rule_match}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                  Rule Match
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {flowData.flow.outcomes.success}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                  Success
                </div>
              </div>
              {flowData.flow.outcomes.fallback > 0 && (
                <>
                  <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex flex-col items-center min-w-[100px]">
                    <div className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
                      {flowData.flow.outcomes.fallback}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                      Fallback
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rule Impact & Effectiveness Indicators */}
      {effectivenessData && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Rule Impact & Effectiveness
            </h3>
            <div className="space-y-4">
              {effectivenessData.rules.map((rule, idx) => (
                <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary-500" />
                      <span className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                        {rule.intent}
                      </span>
                      {rule.knowledge_linked && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          Knowledge Linked
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {rule.trigger_frequency} triggers
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Success Rate</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${rule.successful_response_rate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {rule.successful_response_rate}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Leads Generated</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {rule.leads_generated}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {rule.keywords.slice(0, 5).map((keyword, kidx) => (
                      <span
                        key={kidx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="h-3 w-3" />
                    Last triggered: {rule.last_triggered ? <TimeAgo timestamp={rule.last_triggered} /> : 'Never'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Conditional Rule Context Viewer */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
            Rule Context & Conditions
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Context Conditions
              </p>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Channel: All channels supported</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Language: English (primary)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Time: 24/7 availability</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>User State: New and returning users</span>
                </div>
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Priority Order
              </p>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Rules are evaluated in priority order: Human → Help → Pricing → Greeting → Unknown
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Fallback Path
              </p>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                If no rule matches, system uses default fallback response with polite acknowledgment.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multilingual Rule Awareness Panel */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
            Multilingual Support
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">English</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  Supported
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                All intents have English language support with full rule coverage.
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Other Languages</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                  Available
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Multilingual support is available. Rules can be configured for multiple languages.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Automation Safeguards */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
            Automation Safeguards
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Rate Limiting</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Rules are rate-limited to prevent spam and ensure quality responses.
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Response Restrictions</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Sensitive responses are restricted and require human review.
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Channel Limits</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Channel-specific automation limits are configured per integration.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Rule Recommendations */}
      {recommendationsData && recommendationsData.recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Smart Recommendations
            </h3>
            <div className="space-y-3">
              {recommendationsData.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800"
                >
                  <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {rec.message}
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                      rec.priority === 'high'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        : rec.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {rec.priority} priority
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Safe Testing & Preview Mode */}
      {showTestMode && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Test Mode
              </h3>
              <button
                onClick={() => {
                  setShowTestMode(false);
                  setTestMessage('');
                  setTestResult(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Test Message
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleTest()}
                    placeholder="Enter a test message..."
                    className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                  <button
                    onClick={handleTest}
                    disabled={!testMessage.trim() || testMutation.isPending}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Test
                  </button>
                </div>
              </div>
              {testResult && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Detected Intent:
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                        {testResult.detected_intent}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Confidence:
                      </span>
                      <span className={`text-sm font-semibold ${
                        testResult.confidence === 'high'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {testResult.confidence}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Rule Matched:
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {testResult.rule_matched ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Expected Path:
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                        {testResult.expected_path}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Existing Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="h-5 w-5 text-primary-500" />
                  <span className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                    {rule.intent}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Priority: {rule.priority}
                  </span>
                </div>
                <div className="mb-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Keywords:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rule.keywords.map((keyword, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Response:
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {rule.response}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => setEditingId(rule.id)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rules.length === 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No rules configured. Add your first rule to get started.
          </p>
        </div>
      )}
    </div>
  );
}
