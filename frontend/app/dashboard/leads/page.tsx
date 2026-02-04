'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Users,
  TrendingUp,
  Filter,
  Download,
  CheckCircle2,
  Search,
  Grid3x3,
  List,
  Plus,
  X,
  Edit,
  Trash2,
  Mail,
  Phone,
  Calendar,
  Target,
  Star,
  Flame,
  Snowflake,
  Zap,
  Eye,
  Activity,
  BarChart3,
  Circle,
  Sparkles,
  Award,
  ArrowUp,
  ArrowRight,
  Clock,
} from 'lucide-react';
import TimeAgo from '@/components/TimeAgo';

interface Lead {
  id: number;
  user_id: string;
  channel: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  source_intent: string | null;
  created_at: string;
  updated_at?: string;
}

interface LeadStats {
  total_leads: number;
  by_status: Record<string, number>;
  by_channel: Record<string, number>;
  recent_leads: number;
  conversion_rate: number;
  new_count: number;
  contacted_count: number;
  qualified_count: number;
  converted_count: number;
}

interface LeadScore {
  lead_id: number;
  score: number;
  quality: string;
  factors: Array<{ factor: string; points: number }>;
  max_score: number;
  percentage: number;
}

export default function LeadsPage() {
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [channelFilter, setChannelFilter] = useState<string>('');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadScore, setLeadScore] = useState<LeadScore | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    channel: 'manual',
    status: 'new',
    source_intent: '',
  });

  const queryClient = useQueryClient();

  // Queries
  const { data: stats } = useQuery<LeadStats>({
    queryKey: ['lead-stats'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/leads/stats/dashboard');
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['leads', statusFilter, channelFilter],
    queryFn: async () => {
      const params: any = { limit: 1000 };
      if (statusFilter) params.status = statusFilter;
      const response = await api.get('/api/dashboard/leads', { params });
      return response.data;
    },
    refetchInterval: 30000,
  });

  const leads: Lead[] = leadsData?.leads || [];

  // Mutations
  const createLeadMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/dashboard/leads', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      setShowCreateModal(false);
      resetForm();
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await api.put(`/api/dashboard/leads/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      setShowEditModal(false);
      resetForm();
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (leadId: number) => {
      await api.delete(`/api/dashboard/leads/${leadId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
    },
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ lead_ids, status }: { lead_ids: number[]; status: string }) => {
      const response = await api.post('/api/dashboard/leads/bulk/update-status', { lead_ids, status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      setSelectedLeads([]);
      setBulkMode(false);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (lead_ids: number[]) => {
      const response = await api.post('/api/dashboard/leads/bulk/delete', { lead_ids });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      setSelectedLeads([]);
      setBulkMode(false);
    },
  });

  const fetchLeadScore = async (leadId: number) => {
    const response = await api.get(`/api/dashboard/leads/${leadId}/score`);
    setLeadScore(response.data);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      channel: 'manual',
      status: 'new',
      source_intent: '',
    });
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setFormData({
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      channel: lead.channel,
      status: lead.status,
      source_intent: lead.source_intent || '',
    });
    setShowEditModal(true);
  };

  const handleViewDetails = async (lead: Lead) => {
    setSelectedLead(lead);
    await fetchLeadScore(lead.id);
    setShowDetailsModal(true);
  };

  const handleToggleLead = (leadId: number) => {
    if (selectedLeads.includes(leadId)) {
      setSelectedLeads(selectedLeads.filter((id) => id !== leadId));
    } else {
      setSelectedLeads([...selectedLeads, leadId]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'from-blue-500 to-cyan-600';
      case 'contacted':
        return 'from-yellow-500 to-orange-500';
      case 'qualified':
        return 'from-green-500 to-teal-600';
      case 'converted':
        return 'from-purple-500 to-pink-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'qualified':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'converted':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <Sparkles className="h-4 w-4" />;
      case 'contacted':
        return <Activity className="h-4 w-4" />;
      case 'qualified':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'converted':
        return <Award className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'hot':
        return <Flame className="h-5 w-5 text-red-500" />;
      case 'warm':
        return <Zap className="h-5 w-5 text-orange-500" />;
      case 'cold':
        return <Snowflake className="h-5 w-5 text-blue-500" />;
      default:
        return <Snowflake className="h-5 w-5 text-gray-400" />;
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'hot':
        return 'from-red-500 to-pink-600';
      case 'warm':
        return 'from-orange-500 to-yellow-500';
      case 'cold':
        return 'from-blue-500 to-cyan-600';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const filteredLeads = leads.filter((lead) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        (lead.name && lead.name.toLowerCase().includes(searchLower)) ||
        (lead.email && lead.email.toLowerCase().includes(searchLower)) ||
        (lead.phone && lead.phone.toLowerCase().includes(searchLower))
      );
    }
    if (channelFilter && lead.channel !== channelFilter) {
      return false;
    }
    return true;
  });

  const leadsByStatus = {
    new: filteredLeads.filter((l) => l.status === 'new'),
    contacted: filteredLeads.filter((l) => l.status === 'contacted'),
    qualified: filteredLeads.filter((l) => l.status === 'qualified'),
    converted: filteredLeads.filter((l) => l.status === 'converted'),
  };

  const exportLeads = () => {
    const csv = [
      ['Name', 'Email', 'Phone', 'Channel', 'Status', 'Source Intent', 'Created At'],
      ...filteredLeads.map((lead) => [
        lead.name || '',
        lead.email || '',
        lead.phone || '',
        lead.channel,
        lead.status,
        lead.source_intent || '',
        lead.created_at,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Hero Header */}
      <div className="bg-gradient-to-r from-green-500 via-teal-500 to-cyan-500 rounded-lg p-1 shadow-lg">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Target className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Lead Management & CRM
                  </h1>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Track, qualify, and convert leads with AI-powered scoring
                  </p>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={exportLeads}
                className="inline-flex items-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
              >
                <Download className="h-5 w-5 mr-2" />
                Export CSV
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-6 py-3 border border-transparent shadow-md text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-all"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Lead
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">New Leads</p>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{stats.new_count}</p>
              </div>
              <Sparkles className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Contacted</p>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{stats.contacted_count}</p>
              </div>
              <Activity className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Qualified</p>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{stats.qualified_count}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Converted</p>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{stats.converted_count}</p>
              </div>
              <Award className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Conversion Rate</p>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{stats.conversion_rate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Recent (7d)</p>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{stats.recent_leads}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-400 dark:text-gray-500" />
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
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
          >
            <option value="">All Channels</option>
            {stats && Object.keys(stats.by_channel).map((channel) => (
              <option key={channel} value={channel}>
                {channel}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('pipeline')}
              className={`flex-1 p-2 rounded ${
                viewMode === 'pipeline'
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid3x3 className="h-5 w-5 mx-auto" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 p-2 rounded ${
                viewMode === 'list'
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
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
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {bulkMode ? '✓ Bulk Mode' : 'Bulk Mode'}
            </button>
          </div>
        </div>

        {bulkMode && selectedLeads.length > 0 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">{selectedLeads.length} selected</span>
            <div className="flex gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    bulkUpdateStatusMutation.mutate({ lead_ids: selectedLeads, status: e.target.value });
                  }
                }}
                className="text-sm px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              >
                <option value="">Change Status...</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
              </select>
              <button
                onClick={() => {
                  if (confirm(`Delete ${selectedLeads.length} leads?`)) {
                    bulkDeleteMutation.mutate(selectedLeads);
                  }
                }}
                className="text-sm px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              >
                Delete
              </button>
              <button onClick={() => setSelectedLeads([])} className="text-sm text-gray-600 hover:text-gray-700">
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pipeline View */}
      {viewMode === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(leadsByStatus).map(([status, items]) => (
            <div key={status} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white capitalize flex items-center gap-2">
                  {getStatusIcon(status)}
                  {status}
                  <span className="ml-1 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                    {items.length}
                  </span>
                </h3>
              </div>

              <div className="space-y-3">
                {items.map((lead) => (
                  <div
                    key={lead.id}
                    className="group relative p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-600 hover:shadow-xl transition-all transform hover:-translate-y-1"
                  >
                    {bulkMode && (
                      <div className="absolute top-3 left-3">
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={() => handleToggleLead(lead.id)}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </div>
                    )}

                    <div className={bulkMode ? 'ml-6' : ''}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {lead.name || 'Unknown'}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <TimeAgo timestamp={lead.created_at} />
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1 mb-3">
                        {lead.email && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <Phone className="h-3 w-3" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                          <Activity className="h-3 w-3" />
                          <span>{lead.channel}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleViewDetails(lead)}
                          className="flex-1 px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-all"
                        >
                          <Eye className="h-3 w-3 inline mr-1" />
                          Details
                        </button>
                        <button
                          onClick={() => handleEditLead(lead)}
                          className="px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400 bg-white dark:bg-gray-700 border border-green-300 dark:border-green-600 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this lead?')) {
                              deleteLeadMutation.mutate(lead.id);
                            }
                          }}
                          className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-xs">No leads</p>
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
              All Leads ({filteredLeads.length})
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              </div>
            ) : filteredLeads.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {bulkMode && (
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={() => handleToggleLead(lead.id)}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      )}
                      <div className={`p-3 bg-gradient-to-br ${getStatusColor(lead.status)} rounded-lg`}>
                        <Target className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {lead.name || 'Unknown'}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
                          {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                          <span>• {lead.channel}</span>
                          <span>• <TimeAgo timestamp={lead.created_at} /></span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                          lead.status
                        )}`}
                      >
                        {getStatusIcon(lead.status)}
                        {lead.status}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(lead)}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditLead(lead)}
                          className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this lead?')) {
                              deleteLeadMutation.mutate(lead.id);
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
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-green-100 to-teal-100 dark:from-green-900/20 dark:to-teal-900/20 rounded-full flex items-center justify-center mb-4">
                  <Target className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No leads found</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Add your first lead to get started</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-6 py-3 border border-transparent shadow-md text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-all"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Lead
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Add New Lead</h3>
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
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1234567890"
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Channel</label>
                <select
                  value={formData.channel}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="manual">Manual</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telegram">Telegram</option>
                  <option value="web">Web</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source Intent</label>
                <input
                  type="text"
                  value={formData.source_intent}
                  onChange={(e) => setFormData({ ...formData, source_intent: e.target.value })}
                  placeholder="Product inquiry, pricing, etc."
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    createLeadMutation.mutate({
                      ...formData,
                      user_id: formData.email || `user-${Date.now()}`,
                    });
                  }}
                  disabled={createLeadMutation.isPending}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-md disabled:opacity-50 transition-all"
                >
                  {createLeadMutation.isPending ? 'Adding...' : 'Add Lead'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {showEditModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Edit Lead</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedLead(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="converted">Converted</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedLead(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateLeadMutation.mutate({
                      id: selectedLead.id,
                      data: formData,
                    });
                  }}
                  disabled={updateLeadMutation.isPending}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-all shadow-md disabled:opacity-50"
                >
                  {updateLeadMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lead Details Modal with Scoring */}
      {showDetailsModal && selectedLead && leadScore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Lead Details & Scoring</h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedLead(null);
                  setLeadScore(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Lead Info */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">{selectedLead.name || 'Unknown'}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <TimeAgo timestamp={selectedLead.created_at} />
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                    selectedLead.status
                  )}`}
                >
                  {getStatusIcon(selectedLead.status)}
                  {selectedLead.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedLead.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{selectedLead.email}</span>
                  </div>
                )}
                {selectedLead.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{selectedLead.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{selectedLead.channel}</span>
                </div>
                {selectedLead.source_intent && (
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{selectedLead.source_intent}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Lead Scoring */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                Lead Quality Score
              </h4>

              <div className={`p-6 bg-gradient-to-br ${getQualityColor(leadScore.quality)} rounded-lg mb-4`}>
                <div className="flex items-center justify-between text-white mb-2">
                  <div className="flex items-center gap-2">
                    {getQualityIcon(leadScore.quality)}
                    <span className="text-xl font-bold capitalize">{leadScore.quality} Lead</span>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{leadScore.score}</p>
                    <p className="text-sm opacity-90">/ {leadScore.max_score} points</p>
                  </div>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3 mt-3">
                  <div
                    className="bg-white rounded-full h-3 transition-all"
                    style={{ width: `${leadScore.percentage}%` }}
                  />
                </div>
                <p className="text-white text-sm mt-2 opacity-90">{leadScore.percentage}% score</p>
              </div>

              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Scoring Factors:</h5>
                {leadScore.factors.map((factor, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">{factor.factor}</span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">+{factor.points} pts</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setShowDetailsModal(false);
                setSelectedLead(null);
                setLeadScore(null);
              }}
              className="w-full px-4 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-md transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
