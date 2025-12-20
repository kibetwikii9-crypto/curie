'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Bot,
  Tag,
  Download,
  FileText,
  Eye,
  EyeOff,
  Zap,
  Users,
  TrendingUp,
  X,
} from 'lucide-react';

interface ConversationListItem {
  id: number;
  user_id: string;
  channel: string;
  user_message: string;
  bot_reply: string;
  intent: string;
  created_at: string;
  status: string;
  message_count: number;
  fallback_count: number;
  labels: string[];
  health_indicators: string[];
  has_lead: boolean;
  lead_id: number | null;
}

interface ConversationDetail {
  conversation: {
    id: number;
    user_id: string;
    channel: string;
    user_message: string;
    bot_reply: string;
    intent: string;
    created_at: string;
  };
  status: string;
  intelligence: {
    primary_intent: string;
    confidence: string;
    fallback_count: number;
    message_count: number;
  };
  ai_reasoning: {
    detected_intent: string;
    confidence: string;
    intent_history: Array<{ intent: string; timestamp: string }>;
    rules_matched: string[];
    knowledge_base_used: boolean;
    fallback_reason: string | null;
    context_used: {
      last_intent: string | null;
      message_count: number;
    };
  };
  timeline: Array<{
    type: string;
    timestamp: string;
    intent?: string;
    user_message?: string;
    bot_reply?: string;
    is_fallback?: boolean;
    lead_id?: number;
    source_intent?: string;
  }>;
  health_indicators: Array<{
    type: string;
    severity: string;
    message: string;
  }>;
  lead: {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    source_intent: string | null;
    created_at: string;
  } | null;
  messages: Array<{
    id: number;
    text: string;
    is_from_user: boolean;
    intent: string | null;
    timestamp: string;
  }>;
}

export default function ConversationsPage() {
  const [page, setPage] = useState(1);
  const [channelFilter, setChannelFilter] = useState<string>('');
  const [intentFilter, setIntentFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [hasFallbackFilter, setHasFallbackFilter] = useState<boolean | null>(null);
  const [hasLeadFilter, setHasLeadFilter] = useState<boolean | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [showAiReasoning, setShowAiReasoning] = useState(false);
  const [showLeadPreview, setShowLeadPreview] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', page, channelFilter, intentFilter, statusFilter, hasFallbackFilter, hasLeadFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (channelFilter) params.append('channel', channelFilter);
      if (intentFilter) params.append('intent', intentFilter);
      if (hasFallbackFilter !== null) params.append('has_fallback', hasFallbackFilter.toString());
      if (hasLeadFilter !== null) params.append('has_lead', hasLeadFilter.toString());
      const response = await api.get(`/api/dashboard/conversations?${params}`);
      return response.data;
    },
  });

  const { data: conversationDetail, isLoading: isLoadingDetail } = useQuery<ConversationDetail>({
    queryKey: ['conversation', selectedConversationId],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/conversations/${selectedConversationId}`);
      return response.data;
    },
    enabled: selectedConversationId !== null,
  });

  // Filter conversations by search query
  const filteredConversations = data?.conversations?.filter((conv: ConversationListItem) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.user_message.toLowerCase().includes(query) ||
      conv.bot_reply.toLowerCase().includes(query) ||
      conv.intent.toLowerCase().includes(query) ||
      conv.channel.toLowerCase().includes(query)
    );
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ai-handled':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'needs-attention':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'lead-captured':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ai-handled':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'needs-attention':
        return <AlertCircle className="h-4 w-4" />;
      case 'lead-captured':
        return <Users className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getLabelColor = (label: string) => {
    if (label.includes('Lead')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    if (label.includes('Pricing')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    if (label.includes('Unresolved')) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    if (label.includes('Repeat')) return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400';
    if (label.includes('High Intent')) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Load notes from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedNotes = localStorage.getItem('conversation_notes');
      if (savedNotes) {
        try {
          setInternalNotes(JSON.parse(savedNotes));
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, []);

  const saveNote = (conversationId: number, note: string) => {
    const updatedNotes = { ...internalNotes, [conversationId]: note };
    setInternalNotes(updatedNotes);
    if (typeof window !== 'undefined') {
      localStorage.setItem('conversation_notes', JSON.stringify(updatedNotes));
    }
  };

  const exportConversation = () => {
    if (!conversationDetail) return;
    
    const exportData = {
      conversation: conversationDetail.conversation,
      intelligence: conversationDetail.intelligence,
      ai_reasoning: conversationDetail.ai_reasoning,
      timeline: conversationDetail.timeline,
      lead: conversationDetail.lead,
      messages: conversationDetail.messages,
      internal_notes: internalNotes[conversationDetail.conversation.id] || null,
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${conversationDetail.conversation.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900">
      {/* Left Panel: Conversation List */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Conversations</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {data?.total || 0} total conversations
          </p>
        </div>

        {/* Search & Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="text-sm rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">All Channels</option>
              <option value="telegram">Telegram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
            </select>
            <select
              value={intentFilter}
              onChange={(e) => setIntentFilter(e.target.value)}
              className="text-sm rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">All Intents</option>
              <option value="greeting">Greeting</option>
              <option value="help">Help</option>
              <option value="pricing">Pricing</option>
              <option value="human">Human</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setHasFallbackFilter(hasFallbackFilter === true ? null : true)}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md ${
                hasFallbackFilter === true
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Has Fallback
            </button>
            <button
              onClick={() => setHasLeadFilter(hasLeadFilter === true ? null : true)}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md ${
                hasLeadFilter === true
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Has Lead
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No conversations found
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredConversations.map((conv: ConversationListItem) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    selectedConversationId === conv.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-600'
                      : ''
                  }`}
                >
                  {/* Status & Intelligence Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(conv.status)}`}>
                        {getStatusIcon(conv.status)}
                        <span className="capitalize">{conv.status.replace('-', ' ')}</span>
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 capitalize">
                        {conv.channel}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 capitalize">
                        {conv.intent}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimeAgo(conv.created_at)}
                    </span>
                  </div>

                  {/* Smart Labels */}
                  {conv.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {conv.labels.map((label, idx) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getLabelColor(label)}`}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Health Indicators */}
                  {conv.health_indicators.length > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      {conv.health_indicators.includes('repeated_fallbacks') && (
                        <span className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {conv.fallback_count} fallbacks
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message Preview */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {conv.user_message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {data.total_pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
              disabled={page === data.total_pages}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Middle Panel: Conversation Detail */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
        {selectedConversationId === null ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to view details</p>
            </div>
          </div>
        ) : isLoadingDetail ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : conversationDetail ? (
          <>
            {/* Conversation Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium ${getStatusColor(conversationDetail.status)}`}>
                      {getStatusIcon(conversationDetail.status)}
                      <span className="capitalize">{conversationDetail.status.replace('-', ' ')}</span>
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 capitalize">
                      {conversationDetail.conversation.channel}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 capitalize">
                      {conversationDetail.intelligence.primary_intent}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                      conversationDetail.intelligence.confidence === 'high'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                    }`}>
                      {conversationDetail.intelligence.confidence} confidence
                    </span>
                    {conversationDetail.intelligence.fallback_count > 0 && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                        <AlertCircle className="h-4 w-4" />
                        {conversationDetail.intelligence.fallback_count} fallbacks
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    User ID: {conversationDetail.conversation.user_id} • {formatTimeAgo(conversationDetail.conversation.created_at)}
                  </p>
                </div>
                <button
                  onClick={exportConversation}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </div>

              {/* Health Indicators */}
              {conversationDetail.health_indicators.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {conversationDetail.health_indicators.map((indicator, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${
                        indicator.severity === 'warning'
                          ? 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                      }`}
                    >
                      <AlertCircle className="h-4 w-4" />
                      {indicator.message}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Reasoning Toggle */}
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <button
                onClick={() => setShowAiReasoning(!showAiReasoning)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                {showAiReasoning ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                AI Reasoning & Decision Trace
              </button>
            </div>

            {/* AI Reasoning Panel */}
            {showAiReasoning && (
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Detected Intent</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {conversationDetail.ai_reasoning.detected_intent}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Rules Matched</p>
                    <div className="flex flex-wrap gap-2">
                      {conversationDetail.ai_reasoning.rules_matched.length > 0 ? (
                        conversationDetail.ai_reasoning.rules_matched.map((rule, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 capitalize"
                          >
                            {rule}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">No rules matched</span>
                      )}
                    </div>
                  </div>
                  {conversationDetail.ai_reasoning.fallback_reason && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Fallback Reason</p>
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        {conversationDetail.ai_reasoning.fallback_reason}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Context Used</p>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Last Intent: {conversationDetail.ai_reasoning.context_used.last_intent || 'None'} • 
                      Message Count: {conversationDetail.ai_reasoning.context_used.message_count}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {conversationDetail.messages.length > 0 ? (
                conversationDetail.messages.map((msg, idx) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.is_from_user ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        msg.is_from_user
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {msg.is_from_user ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                        <span className="text-xs font-medium opacity-75">
                          {msg.is_from_user ? 'User' : 'AI'}
                        </span>
                        {msg.intent && (
                          <span className="text-xs opacity-75">• {msg.intent}</span>
                        )}
                      </div>
                      <p className="text-sm">{msg.text}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {formatTimeAgo(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-4">
                  {/* Fallback to conversation data if messages not available */}
                  <div className="flex justify-start">
                    <div className="max-w-[70%] rounded-lg px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4" />
                        <span className="text-xs font-medium opacity-75">User</span>
                      </div>
                      <p className="text-sm">{conversationDetail.conversation.user_message}</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[70%] rounded-lg px-4 py-2 bg-primary-600 text-white">
                      <div className="flex items-center gap-2 mb-1">
                        <Bot className="h-4 w-4" />
                        <span className="text-xs font-medium opacity-75">AI</span>
                      </div>
                      <p className="text-sm">{conversationDetail.conversation.bot_reply}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Right Panel: Context & Lead Preview */}
      {selectedConversationId && conversationDetail && (
        <div className="w-80 border-l border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800">
          {/* Lead Preview */}
          {conversationDetail.lead && showLeadPreview && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Lead Preview</h3>
                <button
                  onClick={() => setShowLeadPreview(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                {conversationDetail.lead.name && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">{conversationDetail.lead.name}</p>
                  </div>
                )}
                {conversationDetail.lead.email && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                    <p className="font-medium text-gray-900 dark:text-white">{conversationDetail.lead.email}</p>
                  </div>
                )}
                {conversationDetail.lead.phone && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="font-medium text-gray-900 dark:text-white">{conversationDetail.lead.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 capitalize">
                    {conversationDetail.lead.status}
                  </span>
                </div>
                {conversationDetail.lead.source_intent && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Source Intent</p>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {conversationDetail.lead.source_intent}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Internal Notes */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Internal Notes</h3>
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showNotes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {showNotes && (
              <div className="space-y-2">
                <textarea
                  value={internalNotes[selectedConversationId] || ''}
                  onChange={(e) => saveNote(selectedConversationId, e.target.value)}
                  placeholder="Add private notes for this conversation..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  rows={4}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Notes are private and only visible to you
                </p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Timeline</h3>
            <div className="space-y-3">
              {conversationDetail.timeline.map((event, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {event.type === 'lead_capture' ? (
                      <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    ) : event.is_fallback ? (
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    ) : (
                      <MessageSquare className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white">
                      {event.type === 'lead_capture' ? 'Lead Captured' : 'Conversation'}
                    </p>
                    {event.intent && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        Intent: {event.intent}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatTimeAgo(event.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
