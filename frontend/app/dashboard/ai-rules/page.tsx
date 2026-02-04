'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  GripVertical,
  Power,
  PowerOff,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AIRule {
  id: number;
  intent: string;
  name: string | null;
  description: string | null;
  keywords: string[];
  response: string;
  priority: number;
  is_active: boolean;
  trigger_count: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
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
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTestMode, setShowTestMode] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [expandedRules, setExpandedRules] = useState<Set<number>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedRules, setSelectedRules] = useState<Set<number>>(new Set());
  
  // Form state
  const [formData, setFormData] = useState({
    intent: '',
    name: '',
    description: '',
    keywords: '',
    response: '',
    priority: 100,
    is_active: true,
  });

  const queryClient = useQueryClient();

  // Fetch rules
  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ['ai-rules'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ai-rules');
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: coverageData } = useQuery<RuleCoverage>({
    queryKey: ['ai-rules-coverage'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ai-rules/coverage');
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: effectivenessData } = useQuery<{ rules: RuleEffectiveness[] }>({
    queryKey: ['ai-rules-effectiveness'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ai-rules/effectiveness');
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: confidenceData } = useQuery<{
    signals: ConfidenceSignal[];
    fallback_rate: number;
    total_conversations: number;
  }>({
    queryKey: ['ai-rules-confidence'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ai-rules/confidence');
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: flowData } = useQuery<{ flow: AutomationFlow }>({
    queryKey: ['ai-rules-flow'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ai-rules/flow');
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: recommendationsData } = useQuery<{
    recommendations: RuleRecommendation[];
  }>({
    queryKey: ['ai-rules-recommendations'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ai-rules/recommendations');
      return response.data;
    },
    refetchInterval: 30000,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/dashboard/ai-rules', {
        intent: data.intent,
        name: data.name || null,
        description: data.description || null,
        keywords: data.keywords.split(',').map((k: string) => k.trim()).filter(Boolean),
        response: data.response,
        priority: parseInt(data.priority),
        is_active: data.is_active,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-rules'] });
      queryClient.invalidateQueries({ queryKey: ['ai-rules-coverage'] });
      setShowCreateModal(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await api.put(`/api/dashboard/ai-rules/${id}`, {
        intent: data.intent,
        name: data.name || null,
        description: data.description || null,
        keywords: data.keywords.split(',').map((k: string) => k.trim()).filter(Boolean),
        response: data.response,
        priority: parseInt(data.priority),
        is_active: data.is_active,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-rules'] });
      queryClient.invalidateQueries({ queryKey: ['ai-rules-coverage'] });
      setShowEditModal(false);
      setSelectedRuleId(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/dashboard/ai-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-rules'] });
      queryClient.invalidateQueries({ queryKey: ['ai-rules-coverage'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await api.post('/api/dashboard/ai-rules/bulk/delete', { rule_ids: ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-rules'] });
      queryClient.invalidateQueries({ queryKey: ['ai-rules-coverage'] });
      setSelectedRules(new Set());
      setBulkMode(false);
    },
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

  const resetForm = () => {
    setFormData({
      intent: '',
      name: '',
      description: '',
      keywords: '',
      response: '',
      priority: 100,
      is_active: true,
    });
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEdit = (rule: AIRule) => {
    setSelectedRuleId(rule.id);
    setFormData({
      intent: rule.intent,
      name: rule.name || '',
      description: rule.description || '',
      keywords: rule.keywords.join(', '),
      response: rule.response,
      priority: rule.priority,
      is_active: rule.is_active,
    });
    setShowEditModal(true);
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Delete rule "${name || 'Unnamed Rule'}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkDelete = () => {
    if (selectedRules.size === 0) return;
    if (confirm(`Delete ${selectedRules.size} selected rules?`)) {
      bulkDeleteMutation.mutate(Array.from(selectedRules));
    }
  };

  const handleTest = () => {
    if (testMessage.trim()) {
      testMutation.mutate(testMessage);
    }
  };

  const toggleRuleExpansion = (id: number) => {
    const newExpanded = new Set(expandedRules);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRules(newExpanded);
  };

  const toggleRuleSelection = (id: number) => {
    const newSelected = new Set(selectedRules);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRules(newSelected);
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

  const getPriorityColor = (priority: number) => {
    if (priority <= 10) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    if (priority <= 50) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
    if (priority <= 100) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority <= 10) return 'Critical';
    if (priority <= 50) return 'High';
    if (priority <= 100) return 'Medium';
    return 'Low';
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
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Rule Coverage & Health Overview */}
      {coverageData && (
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/10 dark:to-blue-900/10 shadow rounded-lg border border-primary-200 dark:border-primary-800">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Rule Coverage & Health
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400">Active Rules</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {coverageData.total_active_rules}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400">Coverage</p>
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400 mt-1">
                  {coverageData.coverage_percentage}%
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400">Fallback Rate</p>
                <p
                  className={`text-3xl font-bold mt-1 ${
                    coverageData.fallback_rate < 10
                      ? 'text-green-600 dark:text-green-400'
                      : coverageData.fallback_rate < 20
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {coverageData.fallback_rate}%
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400">Successful Rules</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {coverageData.successful_rules.length}
                </p>
              </div>
            </div>
            {coverageData.intents_without_coverage.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                    Intents without coverage:
                  </p>
                </div>
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

      {/* Smart Recommendations */}
      {recommendationsData && recommendationsData.recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Smart Recommendations
              </h3>
            </div>
            <div className="space-y-3">
              {recommendationsData.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800"
                >
                  <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {rec.message}
                    </p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                        rec.priority === 'high'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          : rec.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {rec.priority} priority
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Test Mode */}
      {showTestMode && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Test Mode
                </h3>
              </div>
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
                <div className="p-4 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/10 dark:to-blue-900/10 rounded-lg border border-primary-200 dark:border-primary-800">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Detected Intent:
                      </span>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize mt-1">
                        {testResult.detected_intent}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Confidence:
                      </span>
                      <p
                        className={`text-lg font-semibold mt-1 ${
                          testResult.confidence === 'high'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                        }`}
                      >
                        {testResult.confidence}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Rule Matched:
                      </span>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                        {testResult.rule_matched ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Expected Path:
                      </span>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize mt-1">
                        {testResult.expected_path}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Your Rules ({rulesData?.total || 0})
            </h3>
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                bulkMode
                  ? 'text-white bg-primary-600'
                  : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700'
              }`}
            >
              {bulkMode ? 'Exit Bulk' : 'Bulk Mode'}
            </button>
          </div>
          {bulkMode && selectedRules.size > 0 && (
            <div className="mt-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-md flex items-center justify-between">
              <span className="text-sm font-medium text-primary-900 dark:text-primary-100">
                {selectedRules.size} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedRules(new Set())}
                  className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {rulesLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : rulesData?.rules && rulesData.rules.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {rulesData.rules.map((rule: AIRule) => (
              <div
                key={rule.id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start">
                  {/* Bulk Selection Checkbox */}
                  {bulkMode && (
                    <input
                      type="checkbox"
                      checked={selectedRules.has(rule.id)}
                      onChange={() => toggleRuleSelection(rule.id)}
                      className="mt-1 mr-4 h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary-500 flex-shrink-0" />
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                          {rule.name || rule.intent}
                        </h4>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(
                          rule.priority
                        )}`}
                      >
                        {getPriorityLabel(rule.priority)}
                      </span>
                      {rule.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          <Power className="h-3 w-3 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          <PowerOff className="h-3 w-3 mr-1" />
                          Inactive
                        </span>
                      )}
                    </div>

                    {rule.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {rule.description}
                      </p>
                    )}

                    {/* Keywords */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {rule.keywords.slice(0, 6).map((keyword, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200"
                        >
                          {keyword}
                        </span>
                      ))}
                      {rule.keywords.length > 6 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          +{rule.keywords.length - 6} more
                        </span>
                      )}
                    </div>

                    {/* Expandable Response */}
                    <div>
                      <button
                        onClick={() => toggleRuleExpansion(rule.id)}
                        className="flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                      >
                        {expandedRules.has(rule.id) ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Hide Response
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            Show Response
                          </>
                        )}
                      </button>
                      {expandedRules.has(rule.id) && (
                        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                          <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                            {rule.response}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Statistics */}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Activity className="h-4 w-4" />
                        <span>{rule.trigger_count} triggers</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          Last:{' '}
                          {rule.last_triggered_at ? (
                            <TimeAgo timestamp={rule.last_triggered_at} />
                          ) : (
                            'Never'
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        <span>Priority: {rule.priority}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {!bulkMode && (
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleEdit(rule)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id, rule.name || rule.intent)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No rules configured. Add your first rule to get started.
            </p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Rule
            </button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Create AI Rule
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate(formData);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Intent * <span className="text-xs text-gray-500">(e.g., greeting, pricing, help)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.intent}
                    onChange={(e) => setFormData({ ...formData, intent: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    placeholder="greeting"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rule Name (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    placeholder="Friendly Greeting"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    placeholder="Responds to user greetings with a friendly message"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Keywords * <span className="text-xs text-gray-500">(comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    placeholder="hi, hello, hey, good morning"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Response *
                  </label>
                  <textarea
                    value={formData.response}
                    onChange={(e) => setFormData({ ...formData, response: e.target.value })}
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    placeholder="Hello! How can I help you today?"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priority (lower = higher priority)
                    </label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: parseInt(e.target.value) || 100 })
                      }
                      min="1"
                      max="1000"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Active
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Rule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedRuleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Edit AI Rule
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedRuleId(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateMutation.mutate({ id: selectedRuleId, data: formData });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Intent *
                  </label>
                  <input
                    type="text"
                    value={formData.intent}
                    onChange={(e) => setFormData({ ...formData, intent: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rule Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Keywords * <span className="text-xs text-gray-500">(comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Response *
                  </label>
                  <textarea
                    value={formData.response}
                    onChange={(e) => setFormData({ ...formData, response: e.target.value })}
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priority
                    </label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: parseInt(e.target.value) || 100 })
                      }
                      min="1"
                      max="1000"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Active
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedRuleId(null);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? 'Updating...' : 'Update Rule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
