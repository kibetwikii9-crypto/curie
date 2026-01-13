'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Users, TrendingUp, Filter, Download, CheckCircle2, Search } from 'lucide-react';
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
}

export default function LeadsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['leads', statusFilter],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/leads', {
        params: { status: statusFilter || undefined, limit: 100 },
      });
      return response.data;
    },
    refetchInterval: 30000,
  });

  const leads: Lead[] = leadsData?.leads || [];

  const filteredLeads = leads.filter(lead =>
    (lead.name && lead.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (lead.phone && lead.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const updateLeadStatusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: number; status: string }) => {
      // TODO: Add update endpoint to backend
      await api.put(`/api/dashboard/leads/${leadId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const getStatusColor = (status: string) => {
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

  const exportLeads = () => {
    const csv = [
      ['Name', 'Email', 'Phone', 'Channel', 'Status', 'Source Intent', 'Created At'],
      ...filteredLeads.map(lead => [
        lead.name || '',
        lead.email || '',
        lead.phone || '',
        lead.channel,
        lead.status,
        lead.source_intent || '',
        lead.created_at,
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Lead Management (CRM-lite)
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Track and manage customer leads from conversations
          </p>
        </div>
        <button
          onClick={exportLeads}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              statusFilter === ''
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('new')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              statusFilter === 'new'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            New
          </button>
          <button
            onClick={() => setStatusFilter('contacted')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              statusFilter === 'contacted'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Contacted
          </button>
          <button
            onClick={() => setStatusFilter('qualified')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              statusFilter === 'qualified'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Qualified
          </button>
        </div>
      </div>

      {/* Leads List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Leads ({filteredLeads.length})
          </h3>
          <div className="space-y-3">
            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {lead.name || 'Unknown'}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      {lead.email && <span>{lead.email}</span>}
                      {lead.phone && <span>• {lead.phone}</span>}
                      <span>• {lead.channel}</span>
                      {lead.source_intent && <span>• Intent: {lead.source_intent}</span>}
                      <span>• <TimeAgo timestamp={lead.created_at} /></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={lead.status}
                      onChange={(e) => updateLeadStatusMutation.mutate({ leadId: lead.id, status: e.target.value })}
                      className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="converted">Converted</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
            {filteredLeads.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No leads found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-primary-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Total Leads</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{leads.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">New</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {leads.filter(l => l.status === 'new').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Contacted</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {leads.filter(l => l.status === 'contacted').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Qualified</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {leads.filter(l => l.status === 'qualified').length}
          </p>
        </div>
      </div>
    </div>
  );
}
