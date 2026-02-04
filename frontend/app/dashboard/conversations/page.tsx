'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useEffect } from 'react';
import TimeAgo from '@/components/TimeAgo';
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
  Check,
  Plus,
  Edit2,
  Trash2,
  UserPlus,
  BarChart3,
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
  tags: Array<{ id: number; name: string; color: string }>;
  assigned_to_user_id: number | null;
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
  tags: Array<{ id: number; name: string; color: string }>;
  assignment: {
    assigned_to_user_id: number;
    assigned_to_user_name: string;
    notes: string;
    assigned_at: string;
  } | null;
}

interface ConversationTag {
  id: number;
  name: string;
  color: string;
  description?: string;
}

interface ConversationAnalytics {
  summary: {
    total_conversations: number;
    unique_users: number;
    avg_messages_per_conversation: number;
    tagged_conversations: number;
    assigned_conversations: number;
  };
  channels: Array<{ channel: string; count: number }>;
  intents: Array<{ intent: string; count: number }>;
  popular_tags: Array<{ id: number; name: string; color: string; usage_count: number }>;
}

interface TeamMember {
  id: number;
  email: string;
  full_name: string | null;
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
  const [internalNotes, setInternalNotes] = useState<Record<number, string>>({});
  const [showNotes, setShowNotes] = useState(false);

  // Bulk selection
  const [selectedConversations, setSelectedConversations] = useState<Set<number>>(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);

  // Tags management
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [newTagDescription, setNewTagDescription] = useState('');
  const [tagToDelete, setTagToDelete] = useState<number | null>(null);

  // Assignment
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignNotes, setAssignNotes] = useState('');

  // Analytics
  const [showAnalytics, setShowAnalytics] = useState(false);

  const queryClient = useQueryClient();

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
    refetchInterval: selectedConversationId !== null ? 30000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const { data: tagsData } = useQuery<{ tags: ConversationTag[] }>({
    queryKey: ['conversation-tags'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/conversations/tags');
      return response.data;
    },
  });

  const { data: teamMembers } = useQuery<TeamMember[]>({
    queryKey: ['team-members'],
    queryFn: async () => {
      const response = await api.get('/api/users');
      return response.data.users || [];
    },
  });

  const { data: analytics } = useQuery<ConversationAnalytics>({
    queryKey: ['conversation-analytics'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/conversations/analytics?days=7');
      return response.data;
    },
    enabled: showAnalytics,
  });

  // Mutations
  const createTagMutation = useMutation({
    mutationFn: async (data: { name: string; color: string; description?: string }) => {
      const response = await api.post('/api/dashboard/conversations/tags', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-tags'] });
      setShowCreateTagModal(false);
      setNewTagName('');
      setNewTagColor('#3B82F6');
      setNewTagDescription('');
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      await api.delete(`/api/dashboard/conversations/tags/${tagId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-tags'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setTagToDelete(null);
    },
  });

  const addTagToConversationMutation = useMutation({
    mutationFn: async ({ conversationId, tagId }: { conversationId: number; tagId: number }) => {
      await api.post(`/api/dashboard/conversations/${conversationId}/tags`, { tag_id: tagId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
    },
  });

  const removeTagFromConversationMutation = useMutation({
    mutationFn: async ({ conversationId, tagId }: { conversationId: number; tagId: number }) => {
      await api.delete(`/api/dashboard/conversations/${conversationId}/tags/${tagId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
    },
  });

  const bulkTagMutation = useMutation({
    mutationFn: async ({ conversationIds, tagId }: { conversationIds: number[]; tagId: number }) => {
      await api.post('/api/dashboard/conversations/bulk/tag', {
        conversation_ids: conversationIds,
        tag_id: tagId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedConversations(new Set());
      setBulkActionMode(false);
    },
  });

  const bulkExportMutation = useMutation({
    mutationFn: async (conversationIds: number[]) => {
      const response = await api.post('/api/dashboard/conversations/bulk/export', {
        conversation_ids: conversationIds,
      });
      return response.data;
    },
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversations-bulk-export-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSelectedConversations(new Set());
      setBulkActionMode(false);
    },
  });

  const assignConversationMutation = useMutation({
    mutationFn: async ({ conversationId, userId, notes }: { conversationId: number; userId: number; notes?: string }) => {
      await api.post(`/api/dashboard/conversations/${conversationId}/assign`, {
        assigned_to_user_id: userId,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
      setShowAssignModal(false);
      setAssignNotes('');
    },
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
      tags: conversationDetail.tags,
      assignment: conversationDetail.assignment,
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

  const toggleSelectConversation = (convId: number) => {
    const newSelected = new Set(selectedConversations);
    if (newSelected.has(convId)) {
      newSelected.delete(convId);
    } else {
      newSelected.add(convId);
    }
    setSelectedConversations(newSelected);
  };

  const selectAllVisible = () => {
    const allIds = new Set(filteredConversations.map((c: ConversationListItem) => c.id));
    setSelectedConversations(allIds);
  };

  const deselectAll = () => {
    setSelectedConversations(new Set());
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900">
      {/* Left Panel: Conversation List */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Conversations</h1>
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="inline-flex items-center gap-1 px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {data?.total || 0} total conversations
          </p>
        </div>

        {/* Analytics Panel (Collapsible) */}
        {showAnalytics && analytics && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics.summary.total_conversations}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Unique Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics.summary.unique_users}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Tagged</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics.summary.tagged_conversations}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Assigned</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics.summary.assigned_conversations}
                </p>
              </div>
            </div>
            {analytics.popular_tags.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Popular Tags</p>
                <div className="flex flex-wrap gap-2">
                  {analytics.popular_tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name} ({tag.usage_count})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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

          {/* Bulk Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setBulkActionMode(!bulkActionMode);
                setSelectedConversations(new Set());
              }}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md ${
                bulkActionMode
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {bulkActionMode ? 'Exit Bulk Mode' : 'Bulk Actions'}
            </button>
            <button
              onClick={() => setShowTagsModal(true)}
              className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Tag className="h-4 w-4" />
            </button>
          </div>

          {/* Bulk Action Toolbar */}
          {bulkActionMode && selectedConversations.size > 0 && (
            <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-md">
              <p className="text-sm font-medium text-primary-900 dark:text-primary-100 mb-2">
                {selectedConversations.size} selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => bulkExportMutation.mutate(Array.from(selectedConversations))}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium text-primary-700 dark:text-primary-300 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Download className="h-3 w-3" />
                  Export
                </button>
                <button
                  onClick={() => {
                    if (tagsData?.tags.length === 0) {
                      alert('Please create a tag first');
                      return;
                    }
                    const tagId = parseInt(prompt('Enter tag ID:') || '0');
                    if (tagId > 0) {
                      bulkTagMutation.mutate({
                        conversationIds: Array.from(selectedConversations),
                        tagId,
                      });
                    }
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium text-primary-700 dark:text-primary-300 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Tag className="h-3 w-3" />
                  Tag
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={selectAllVisible}
                  className="flex-1 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAll}
                  className="flex-1 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}
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
                  className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    selectedConversationId === conv.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-600'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Bulk Selection Checkbox */}
                    {bulkActionMode && (
                      <input
                        type="checkbox"
                        checked={selectedConversations.has(conv.id)}
                        onChange={() => toggleSelectConversation(conv.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                    )}

                    <div
                      className="flex-1 min-w-0"
                      onClick={() => !bulkActionMode && setSelectedConversationId(conv.id)}
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
                          {conv.assigned_to_user_id && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                              <UserPlus className="h-3 w-3" />
                              Assigned
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          <TimeAgo timestamp={conv.created_at} />
                        </span>
                      </div>

                      {/* Tags */}
                      {conv.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {conv.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                              style={{ backgroundColor: tag.color }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}

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
                  </div>
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
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
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
                    User ID: {conversationDetail.conversation.user_id} • <TimeAgo timestamp={conversationDetail.conversation.created_at} />
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

              {/* Tags Display & Quick Actions */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {conversationDetail.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                    <button
                      onClick={() => removeTagFromConversationMutation.mutate({
                        conversationId: conversationDetail.conversation.id,
                        tagId: tag.id,
                      })}
                      className="hover:bg-white/20 rounded p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {tagsData?.tags && tagsData.tags.length > 0 && (
                  <select
                    onChange={(e) => {
                      const tagId = parseInt(e.target.value);
                      if (tagId > 0) {
                        addTagToConversationMutation.mutate({
                          conversationId: conversationDetail.conversation.id,
                          tagId,
                        });
                      }
                      e.target.value = '';
                    }}
                    className="text-sm rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">+ Add Tag</option>
                    {tagsData.tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded"
                >
                  <UserPlus className="h-4 w-4" />
                  {conversationDetail.assignment ? 'Reassign' : 'Assign'}
                </button>
              </div>

              {/* Assignment Display */}
              {conversationDetail.assignment && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-md">
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                    Assigned to: {conversationDetail.assignment.assigned_to_user_name}
                  </p>
                  {conversationDetail.assignment.notes && (
                    <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                      {conversationDetail.assignment.notes}
                    </p>
                  )}
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    <TimeAgo timestamp={conversationDetail.assignment.assigned_at} />
                  </p>
                </div>
              )}

              {/* Health Indicators */}
              {conversationDetail.health_indicators.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
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
                        <TimeAgo timestamp={msg.timestamp} />
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
                      <TimeAgo timestamp={event.timestamp} />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tags Management Modal */}
      {showTagsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Tags</h2>
              <button
                onClick={() => setShowTagsModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {tagsData?.tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: tag.color }}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{tag.name}</p>
                      {tag.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{tag.description}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Delete tag "${tag.name}"?`)) {
                        deleteTagMutation.mutate(tag.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowCreateTagModal(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
              >
                <Plus className="h-4 w-4" />
                Create New Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Tag Modal */}
      {showCreateTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Tag</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tag Name *
                </label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Important, Follow-up"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-full h-10 rounded border border-gray-300 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newTagDescription}
                  onChange={(e) => setNewTagDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <button
                onClick={() => {
                  setShowCreateTagModal(false);
                  setNewTagName('');
                  setNewTagColor('#3B82F6');
                  setNewTagDescription('');
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newTagName.trim()) {
                    createTagMutation.mutate({
                      name: newTagName.trim(),
                      color: newTagColor,
                      description: newTagDescription.trim() || undefined,
                    });
                  }
                }}
                disabled={!newTagName.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && conversationDetail && teamMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Assign Conversation</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assign to *
                </label>
                <select
                  id="assign-user-select"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select team member...</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={3}
                  placeholder="Optional notes..."
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignNotes('');
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const selectElement = document.getElementById('assign-user-select') as HTMLSelectElement;
                  const userId = parseInt(selectElement.value);
                  if (userId > 0) {
                    assignConversationMutation.mutate({
                      conversationId: conversationDetail.conversation.id,
                      userId,
                      notes: assignNotes.trim() || undefined,
                    });
                  }
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
