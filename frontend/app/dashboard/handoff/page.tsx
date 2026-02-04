'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  MessageSquare,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  TrendingUp,
  Activity,
  Timer,
  UserPlus,
  AlertTriangle,
  ArrowUp,
  ArrowRight,
  Plus,
  Search,
  Filter,
  Grid3x3,
  List,
  X,
  Edit,
  Trash2,
  Send,
  Sparkles,
  Shield,
  Target,
  Zap,
  Users,
  CheckCircle,
  XCircle,
  Pause,
  Play,
} from 'lucide-react';
import TimeAgo from '@/components/TimeAgo';

interface Handoff {
  id: number;
  conversation_id: number;
  assigned_to_user_id: number | null;
  status: string;
  priority: string;
  reason: string | null;
  assigned_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface HandoffStats {
  total_handoffs: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  recent_handoffs: number;
  avg_resolution_minutes: number;
  pending_count: number;
  assigned_count: number;
  in_progress_count: number;
  resolved_count: number;
}

interface SLAMetrics {
  total_handoffs: number;
  response_breach_rate: number;
  resolution_breach_rate: number;
  avg_response_time_minutes: number;
  avg_resolution_time_minutes: number;
}

interface Escalation {
  id: number;
  handoff_id: number;
  from_user_id: number | null;
  to_user_id: number | null;
  reason: string | null;
  escalated_at: string;
  resolved_at: string | null;
}

interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
}

export default function HandoffPage() {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedHandoffs, setSelectedHandoffs] = useState<number[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [selectedHandoff, setSelectedHandoff] = useState<Handoff | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [escalationReason, setEscalationReason] = useState('');

  const queryClient = useQueryClient();

  // Queries
  const { data: stats } = useQuery<HandoffStats>({
    queryKey: ['handoff-stats'],
    queryFn: async () => {
      const response = await api.get('/api/handoff/stats/dashboard');
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: handoffs = [], isLoading } = useQuery<Handoff[]>({
    queryKey: ['handoffs', statusFilter, priorityFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const response = await api.get('/api/handoff/', { params });
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: slaMetrics } = useQuery<SLAMetrics>({
    queryKey: ['sla-metrics'],
    queryFn: async () => {
      const response = await api.get('/api/handoff/sla/');
      return response.data;
    },
    refetchInterval: 60000,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/api/users/');
      return response.data;
    },
  });

  // Mutations
  const updateHandoffMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await api.put(`/api/handoff/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
      queryClient.invalidateQueries({ queryKey: ['handoff-stats'] });
    },
  });

  const assignHandoffMutation = useMutation({
    mutationFn: async ({ handoffId, userId }: { handoffId: number; userId: number }) => {
      const response = await api.post(`/api/handoff/${handoffId}/assign/${userId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
      queryClient.invalidateQueries({ queryKey: ['handoff-stats'] });
      setShowAssignModal(false);
      setSelectedHandoff(null);
      setSelectedUserId(null);
    },
  });

  const unassignHandoffMutation = useMutation({
    mutationFn: async (handoffId: number) => {
      const response = await api.post(`/api/handoff/${handoffId}/unassign`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
      queryClient.invalidateQueries({ queryKey: ['handoff-stats'] });
    },
  });

  const bulkAssignMutation = useMutation({
    mutationFn: async ({ handoff_ids, user_id }: { handoff_ids: number[]; user_id: number }) => {
      const response = await api.post('/api/handoff/bulk/assign', handoff_ids, {
        params: { user_id },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
      queryClient.invalidateQueries({ queryKey: ['handoff-stats'] });
      setSelectedHandoffs([]);
      setBulkMode(false);
      setShowAssignModal(false);
    },
  });

  const createEscalationMutation = useMutation({
    mutationFn: async (data: { handoff_id: number; to_user_id: number; reason?: string }) => {
      const response = await api.post('/api/handoff/escalations/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
      queryClient.invalidateQueries({ queryKey: ['handoff-stats'] });
      setShowEscalateModal(false);
      setSelectedHandoff(null);
      setSelectedUserId(null);
      setEscalationReason('');
    },
  });

  const deleteHandoffMutation = useMutation({
    mutationFn: async (handoffId: number) => {
      await api.delete(`/api/handoff/${handoffId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
      queryClient.invalidateQueries({ queryKey: ['handoff-stats'] });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'from-red-500 to-pink-600';
      case 'high':
        return 'from-orange-500 to-red-500';
      case 'medium':
        return 'from-yellow-500 to-orange-500';
      default:
        return 'from-green-500 to-teal-600';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'assigned':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Activity className="h-4 w-4" />;
      case 'assigned':
        return <UserCheck className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleToggleHandoff = (handoffId: number) => {
    if (selectedHandoffs.includes(handoffId)) {
      setSelectedHandoffs(selectedHandoffs.filter((id) => id !== handoffId));
    } else {
      setSelectedHandoffs([...selectedHandoffs, handoffId]);
    }
  };

  const handleOpenAssignModal = (handoff: Handoff) => {
    setSelectedHandoff(handoff);
    setShowAssignModal(true);
  };

  const handleOpenEscalateModal = (handoff: Handoff) => {
    setSelectedHandoff(handoff);
    setShowEscalateModal(true);
  };

  const filteredHandoffs = handoffs.filter((handoff) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        handoff.conversation_id.toString().includes(searchLower) ||
        (handoff.reason && handoff.reason.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  const handoffsByStatus = {
    pending: filteredHandoffs.filter((h) => h.status === 'pending'),
    assigned: filteredHandoffs.filter((h) => h.status === 'assigned'),
    in_progress: filteredHandoffs.filter((h) => h.status === 'in_progress'),
    resolved: filteredHandoffs.filter((h) => h.status === 'resolved'),
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Hero Header */}
      <div className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-lg p-1 shadow-lg">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg shadow-lg">
                  <UserCheck className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-primary-600 bg-clip-text text-transparent">
                    Agent Workspace & Handoff Management
                  </h1>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Manage AI-to-human transitions with real-time SLA tracking
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{stats.pending_count}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Assigned</p>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{stats.assigned_count}</p>
              </div>
              <UserCheck className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{stats.in_progress_count}</p>
              </div>
              <Activity className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Resolved</p>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{stats.resolved_count}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Resolution</p>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{Math.round(stats.avg_resolution_minutes)}m</p>
              </div>
              <Timer className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
        </div>
      )}

      {/* SLA Metrics */}
      {slaMetrics && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-cyan-600" />
            SLA Performance Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/10 dark:to-teal-900/10 rounded-lg">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Response Compliance</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {(100 - slaMetrics.response_breach_rate).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Avg: {Math.round(slaMetrics.avg_response_time_minutes)}m
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Resolution Compliance</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {(100 - slaMetrics.resolution_breach_rate).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Avg: {Math.round(slaMetrics.avg_resolution_time_minutes)}m
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/10 dark:to-pink-900/10 rounded-lg">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Response Breaches</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {slaMetrics.response_breach_rate.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-900/10 rounded-lg">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Resolution Breaches</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {slaMetrics.resolution_breach_rate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 text-sm"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex-1 p-2 rounded ${
                viewMode === 'kanban'
                  ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid3x3 className="h-5 w-5 mx-auto" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 p-2 rounded ${
                viewMode === 'list'
                  ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <List className="h-5 w-5 mx-auto" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded ${
                bulkMode
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {bulkMode ? '✓ Bulk Mode' : 'Bulk Mode'}
            </button>
          </div>
        </div>

        {bulkMode && selectedHandoffs.length > 0 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">{selectedHandoffs.length} selected</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAssignModal(true);
                }}
                className="text-sm px-3 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700"
              >
                Assign Selected
              </button>
              <button onClick={() => setSelectedHandoffs([])} className="text-sm text-gray-600 hover:text-gray-700">
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(handoffsByStatus).map(([status, items]) => (
            <div key={status} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white capitalize flex items-center gap-2">
                  {getStatusIcon(status)}
                  {status.replace('_', ' ')}
                  <span className="ml-1 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                    {items.length}
                  </span>
                </h3>
              </div>

              <div className="space-y-3">
                {items.map((handoff) => (
                  <div
                    key={handoff.id}
                    className="group relative p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-cyan-400 dark:hover:border-cyan-600 hover:shadow-xl transition-all transform hover:-translate-y-1"
                  >
                    {bulkMode && (
                      <div className="absolute top-3 left-3">
                        <input
                          type="checkbox"
                          checked={selectedHandoffs.includes(handoff.id)}
                          onChange={() => handleToggleHandoff(handoff.id)}
                          className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                      </div>
                    )}

                    <div className={bulkMode ? 'ml-6' : ''}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            Conv #{handoff.conversation_id}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityBadgeColor(
                            handoff.priority
                          )}`}
                        >
                          {handoff.priority}
                        </span>
                      </div>

                      {handoff.reason && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{handoff.reason}</p>
                      )}

                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        <TimeAgo timestamp={handoff.created_at} />
                      </div>

                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {handoff.status === 'pending' && (
                          <button
                            onClick={() => handleOpenAssignModal(handoff)}
                            className="flex-1 px-2 py-1 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700"
                          >
                            <UserPlus className="h-3 w-3 inline mr-1" />
                            Assign
                          </button>
                        )}
                        {handoff.status === 'assigned' && (
                          <button
                            onClick={() =>
                              updateHandoffMutation.mutate({ id: handoff.id, data: { status: 'in_progress' } })
                            }
                            className="flex-1 px-2 py-1 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700"
                          >
                            <Play className="h-3 w-3 inline mr-1" />
                            Start
                          </button>
                        )}
                        {handoff.status === 'in_progress' && (
                          <button
                            onClick={() =>
                              updateHandoffMutation.mutate({ id: handoff.id, data: { status: 'resolved' } })
                            }
                            className="flex-1 px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                          >
                            <CheckCircle className="h-3 w-3 inline mr-1" />
                            Resolve
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEscalateModal(handoff)}
                          className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Escalate"
                        >
                          <AlertTriangle className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-xs">No handoffs</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-5">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              All Handoffs ({filteredHandoffs.length})
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
              </div>
            ) : filteredHandoffs.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredHandoffs.map((handoff) => (
                  <div
                    key={handoff.id}
                    className="flex items-center justify-between py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {bulkMode && (
                        <input
                          type="checkbox"
                          checked={selectedHandoffs.includes(handoff.id)}
                          onChange={() => handleToggleHandoff(handoff.id)}
                          className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                      )}
                      <div className="flex items-center gap-3">
                        <div className={`p-3 bg-gradient-to-br ${getPriorityColor(handoff.priority)} rounded-lg`}>
                          <MessageSquare className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Conversation #{handoff.conversation_id}
                          </h4>
                          {handoff.reason && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                              {handoff.reason}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            <TimeAgo timestamp={handoff.created_at} />
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getPriorityBadgeColor(
                          handoff.priority
                        )}`}
                      >
                        {handoff.priority}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(handoff.status)}`}>
                        {getStatusIcon(handoff.status)}
                        {handoff.status.replace('_', ' ')}
                      </span>
                      <div className="flex gap-2">
                        {handoff.status === 'pending' && (
                          <button
                            onClick={() => handleOpenAssignModal(handoff)}
                            className="p-2 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded"
                            title="Assign"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                        )}
                        {handoff.status === 'assigned' && (
                          <button
                            onClick={() =>
                              updateHandoffMutation.mutate({ id: handoff.id, data: { status: 'in_progress' } })
                            }
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                            title="Start"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        )}
                        {handoff.status === 'in_progress' && (
                          <button
                            onClick={() =>
                              updateHandoffMutation.mutate({ id: handoff.id, data: { status: 'resolved' } })
                            }
                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                            title="Resolve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEscalateModal(handoff)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="Escalate"
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this handoff?')) {
                              deleteHandoffMutation.mutate(handoff.id);
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-full flex items-center justify-center mb-4">
                  <UserCheck className="h-12 w-12 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No handoffs found</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">All agent tasks are completed!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {selectedHandoffs.length > 0
                  ? `Assign ${selectedHandoffs.length} Handoff(s)`
                  : 'Assign Handoff'}
              </h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedHandoff(null);
                  setSelectedUserId(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assign to Agent
                </label>
                <select
                  value={selectedUserId || ''}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select an agent...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email} ({user.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedHandoff(null);
                    setSelectedUserId(null);
                  }}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedUserId) {
                      if (selectedHandoffs.length > 0) {
                        bulkAssignMutation.mutate({
                          handoff_ids: selectedHandoffs,
                          user_id: selectedUserId,
                        });
                      } else if (selectedHandoff) {
                        assignHandoffMutation.mutate({
                          handoffId: selectedHandoff.id,
                          userId: selectedUserId,
                        });
                      }
                    }
                  }}
                  disabled={!selectedUserId}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-lg disabled:opacity-50"
                >
                  {assignHandoffMutation.isPending || bulkAssignMutation.isPending ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {showEscalateModal && selectedHandoff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Escalate Handoff
              </h3>
              <button
                onClick={() => {
                  setShowEscalateModal(false);
                  setSelectedHandoff(null);
                  setSelectedUserId(null);
                  setEscalationReason('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Escalate to
                </label>
                <select
                  value={selectedUserId || ''}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select senior agent/manager...</option>
                  {users
                    .filter((u) => u.role === 'admin' || u.role === 'business_owner')
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email} ({user.role})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Escalation Reason
                </label>
                <textarea
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  rows={3}
                  placeholder="Why is this handoff being escalated?"
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowEscalateModal(false);
                    setSelectedHandoff(null);
                    setSelectedUserId(null);
                    setEscalationReason('');
                  }}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedUserId) {
                      createEscalationMutation.mutate({
                        handoff_id: selectedHandoff.id,
                        to_user_id: selectedUserId,
                        reason: escalationReason,
                      });
                    }
                  }}
                  disabled={!selectedUserId}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-md disabled:opacity-50 transition-all"
                >
                  {createEscalationMutation.isPending ? 'Escalating...' : 'Escalate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
