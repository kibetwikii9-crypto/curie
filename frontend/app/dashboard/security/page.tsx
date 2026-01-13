'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Shield, Lock, FileText, CheckCircle2, Key, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import TimeAgo from '@/components/TimeAgo';

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState<'2fa' | 'sessions' | 'api-keys' | 'audit'>('2fa');
  const queryClient = useQueryClient();

  const { data: twoFaStatus } = useQuery({
    queryKey: ['security', '2fa', 'status'],
    queryFn: async () => {
      const response = await api.get('/api/security/2fa/status');
      return response.data;
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['security', 'sessions'],
    queryFn: async () => {
      const response = await api.get('/api/security/sessions/');
      return response.data;
    },
  });

  const { data: apiKeys = [] } = useQuery({
    queryKey: ['security', 'api-keys'],
    queryFn: async () => {
      const response = await api.get('/api/security/api-keys/');
      return response.data;
    },
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['security', 'audit-logs'],
    queryFn: async () => {
      const response = await api.get('/api/security/audit-logs/');
      return response.data;
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await api.delete(`/api/security/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security', 'sessions'] });
    },
  });

  const revokeApiKeyMutation = useMutation({
    mutationFn: async (keyId: number) => {
      await api.delete(`/api/security/api-keys/${keyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security', 'api-keys'] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Security & Compliance Center
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage security settings and compliance requirements
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: '2fa', label: '2FA', icon: Shield },
          { id: 'sessions', label: 'Sessions', icon: Lock },
          { id: 'api-keys', label: 'API Keys', icon: Key },
          { id: 'audit', label: 'Audit Logs', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 2FA Tab */}
      {activeTab === '2fa' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Two-Factor Authentication
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">2FA Status</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {twoFaStatus?.is_enabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              {twoFaStatus?.is_enabled ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
                  Enable 2FA
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Active Sessions ({sessions.length})
          </h3>
          <div className="space-y-3">
            {sessions.map((session: any) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {session.ip_address || 'Unknown IP'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Last active: <TimeAgo timestamp={session.last_activity} />
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Revoke this session?')) {
                      revokeSessionMutation.mutate(session.id);
                    }
                  }}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === 'api-keys' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              API Keys ({apiKeys.length})
            </h3>
            <button className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </button>
          </div>
          <div className="space-y-3">
            {apiKeys.map((key: any) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{key.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Created: <TimeAgo timestamp={key.created_at} />
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Revoke this API key?')) {
                      revokeApiKeyMutation.mutate(key.id);
                    }
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Audit Logs
          </h3>
          <div className="space-y-2">
            {auditLogs.slice(0, 20).map((log: any) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{log.action}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <TimeAgo timestamp={log.created_at} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
