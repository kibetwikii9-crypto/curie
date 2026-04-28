'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Shield,
  Lock,
  FileText,
  CheckCircle2,
  Key,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Activity,
  Globe,
  X,
  Copy,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Monitor,
  Smartphone,
  Laptop,
  Sparkles,
  Award,
  Target,
  Filter,
  Search,
} from 'lucide-react';
import TimeAgo from '@/components/TimeAgo';

interface Session {
  id: number;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_activity: string;
}

interface ApiKey {
  id: number;
  name: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  resource_type: string | null;
  resource_id: number | null;
  ip_address: string | null;
  created_at: string;
}

interface IPAllowlist {
  id: number;
  ip_address: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  created_by_user_id: number | null;
}

interface SecurityStats {
  two_fa_enabled: boolean;
  active_sessions: number;
  api_keys_count: number;
  ip_allowlist_count: number;
  recent_audit_logs: number;
  security_score: number;
  security_level: string;
  score_factors: Array<{ factor: string; points: number }>;
  max_score: number;
}

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState<'overview' | '2fa' | 'sessions' | 'api-keys' | 'ip-allowlist' | 'audit'>('overview');
  const [actionFilter, setActionFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showIPModal, setShowIPModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [newApiKey, setNewApiKey] = useState('');
  const [copied, setCopied] = useState(false);

  // Form states
  const [apiKeyName, setApiKeyName] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [ipDescription, setIpDescription] = useState('');

  const queryClient = useQueryClient();

  // Queries
  const { data: stats } = useQuery<SecurityStats>({
    queryKey: ['security-stats'],
    queryFn: async () => {
      const response = await api.get('/api/security/stats/dashboard');
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: twoFaStatus } = useQuery({
    queryKey: ['security', '2fa', 'status'],
    queryFn: async () => {
      const response = await api.get('/api/security/2fa/status');
      return response.data;
    },
  });

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ['security', 'sessions'],
    queryFn: async () => {
      const response = await api.get('/api/security/sessions/');
      return response.data;
    },
  });

  const { data: apiKeys = [] } = useQuery<ApiKey[]>({
    queryKey: ['security', 'api-keys'],
    queryFn: async () => {
      const response = await api.get('/api/security/api-keys/');
      return response.data;
    },
  });

  const { data: ipAllowlist = [] } = useQuery<IPAllowlist[]>({
    queryKey: ['security', 'ip-allowlist'],
    queryFn: async () => {
      const response = await api.get('/api/security/ip-allowlist/');
      return response.data;
    },
  });

  const { data: auditLogs = [] } = useQuery<AuditLog[]>({
    queryKey: ['security', 'audit-logs', actionFilter],
    queryFn: async () => {
      const params: any = {};
      if (actionFilter) params.action = actionFilter;
      const response = await api.get('/api/security/audit-logs/', { params });
      return response.data;
    },
  });

  // Mutations
  const setup2FAMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/security/2fa/setup');
      return response.data;
    },
    onSuccess: (data) => {
      const secret = data.secret;
      const qrUrl = `otpauth://totp/Curie:user?secret=${secret}&issuer=Curie`;
      setQrCodeUrl(qrUrl);
      setBackupCodes(data.backup_codes);
      setShow2FASetup(true);
    },
  });

  const enable2FAMutation = useMutation({
    mutationFn: async (code: string) => {
      await api.post(`/api/security/2fa/enable?code=${code}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
      setShow2FASetup(false);
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await api.delete(`/api/security/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security', 'sessions'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
    },
  });

  const createApiKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.post('/api/security/api-keys/', { name, permissions: [] });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['security', 'api-keys'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
      setNewApiKey(data.key);
      setApiKeyName('');
    },
  });

  const revokeApiKeyMutation = useMutation({
    mutationFn: async (keyId: number) => {
      await api.delete(`/api/security/api-keys/${keyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security', 'api-keys'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
    },
  });

  const createIPMutation = useMutation({
    mutationFn: async (data: { ip_address: string; description?: string }) => {
      const response = await api.post('/api/security/ip-allowlist/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security', 'ip-allowlist'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
      setShowIPModal(false);
      setIpAddress('');
      setIpDescription('');
    },
  });

  const deleteIPMutation = useMutation({
    mutationFn: async (ipId: number) => {
      await api.delete(`/api/security/ip-allowlist/${ipId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security', 'ip-allowlist'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.toLowerCase().includes('mobile')) {
      return <Smartphone className="h-5 w-5" />;
    } else if (userAgent.toLowerCase().includes('tablet')) {
      return <Monitor className="h-5 w-5" />;
    }
    return <Laptop className="h-5 w-5" />;
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'excellent':
        return 'from-green-500 to-emerald-600';
      case 'good':
        return 'from-blue-500 to-cyan-600';
      case 'fair':
        return 'from-yellow-500 to-orange-500';
      default:
        return 'from-red-500 to-pink-600';
    }
  };

  const getSecurityLevelIcon = (level: string) => {
    switch (level) {
      case 'excellent':
        return <Award className="h-8 w-8" />;
      case 'good':
        return <CheckCircle className="h-8 w-8" />;
      case 'fair':
        return <AlertTriangle className="h-8 w-8" />;
      default:
        return <XCircle className="h-8 w-8" />;
    }
  };

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        log.action.toLowerCase().includes(searchLower) ||
        (log.resource_type && log.resource_type.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Target },
    { id: '2fa', label: '2FA', icon: Shield },
    { id: 'sessions', label: 'Sessions', icon: Activity },
    { id: 'api-keys', label: 'API Keys', icon: Key },
    { id: 'ip-allowlist', label: 'IP Allowlist', icon: Globe },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Enhanced Hero Header */}
      <div className="bg-gradient-to-r from-red-500 via-orange-500 to-pink-500 rounded-lg p-1 shadow-lg">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Shield className="h-8 w-8 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Security & Compliance Center
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Protect your account with advanced security features and monitoring
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all transform hover:scale-105 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gradient-to-br from-red-500 to-pink-500 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <tab.icon className={`h-5 w-5 ${activeTab !== tab.id ? 'text-red-600' : ''}`} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Security Score */}
          <div className={`bg-gradient-to-br ${getSecurityLevelColor(stats.security_level)} rounded-lg p-1 shadow-lg`}>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`p-4 bg-gradient-to-br ${getSecurityLevelColor(stats.security_level)} rounded-lg text-white`}>
                    {getSecurityLevelIcon(stats.security_level)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                      {stats.security_level} Security
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Your account security rating</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-gray-900 dark:text-white">{stats.security_score}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">/ {stats.max_score} points</p>
                </div>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-6">
                <div
                  className={`bg-gradient-to-r ${getSecurityLevelColor(stats.security_level)} rounded-full h-4 transition-all`}
                  style={{ width: `${(stats.security_score / stats.max_score) * 100}%` }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stats.score_factors.map((factor, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">{factor.factor}</span>
                    <span className={`text-sm font-semibold ${factor.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                      {factor.points > 0 ? `+${factor.points}` : factor.points} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">2FA</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.two_fa_enabled ? 'ON' : 'OFF'}</p>
                </div>
                <Shield className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Sessions</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.active_sessions}</p>
                </div>
                <Activity className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">API Keys</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.api_keys_count}</p>
                </div>
                <Key className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">IP Allowlist</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.ip_allowlist_count}</p>
                </div>
                <Globe className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Recent Logs</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.recent_audit_logs}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Tab */}
      {activeTab === '2fa' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Shield className="h-6 w-6 text-red-600" />
            Two-Factor Authentication (2FA)
          </h3>
          <div className="space-y-4">
            <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">2FA Status</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {twoFaStatus?.is_enabled
                      ? 'Two-factor authentication is enabled and protecting your account'
                      : 'Enable 2FA for enhanced account security'}
                  </p>
                </div>
                {twoFaStatus?.is_enabled ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-8 w-8" />
                    <span className="font-semibold">Enabled</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setup2FAMutation.mutate()}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md font-medium transition-all"
                  >
                    Enable 2FA
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600" />
            Active Sessions ({sessions.length})
          </h3>
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400">{getDeviceIcon(session.user_agent)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{session.ip_address || 'Unknown IP'}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{session.user_agent}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Last active: <TimeAgo timestamp={session.last_activity} />
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Revoke this session?')) {
                      revokeSessionMutation.mutate(session.id);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Revoke
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No active sessions</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === 'api-keys' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Key className="h-6 w-6 text-purple-600" />
              API Keys ({apiKeys.length})
            </h3>
            <button
              onClick={() => setShowApiKeyModal(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-md transition-all text-sm font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </button>
          </div>
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <Key className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{key.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Created: <TimeAgo timestamp={key.created_at} />
                    </p>
                    {key.last_used_at && (
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Last used: <TimeAgo timestamp={key.last_used_at} />
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      key.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}
                  >
                    {key.is_active ? 'Active' : 'Revoked'}
                  </span>
                  {key.is_active && (
                    <button
                      onClick={() => {
                        if (confirm('Revoke this API key?')) {
                          revokeApiKeyMutation.mutate(key.id);
                        }
                      }}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {apiKeys.length === 0 && (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full flex items-center justify-center mb-4">
                  <Key className="h-12 w-12 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No API keys</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Create your first API key for programmatic access</p>
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-md transition-all"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create API Key
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* IP Allowlist Tab */}
      {activeTab === 'ip-allowlist' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Globe className="h-6 w-6 text-cyan-600" />
              IP Allowlist ({ipAllowlist.length})
            </h3>
            <button
              onClick={() => setShowIPModal(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-md text-sm font-medium transition-all"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add IP Address
            </button>
          </div>
          <div className="space-y-3">
            {ipAllowlist.map((ip) => (
              <div
                key={ip.id}
                className="flex items-center justify-between p-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-lg text-white">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{ip.ip_address}</p>
                    {ip.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{ip.description}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Added: <TimeAgo timestamp={ip.created_at} />
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Remove this IP address?')) {
                      deleteIPMutation.mutate(ip.id);
                    }
                  }}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
            {ipAllowlist.length === 0 && (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-cyan-100 to-teal-100 dark:from-cyan-900/20 dark:to-teal-900/20 rounded-full flex items-center justify-center mb-4">
                  <Globe className="h-12 w-12 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No IP restrictions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Add allowed IP addresses for enhanced security</p>
                <button
                  onClick={() => setShowIPModal(true)}
                  className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-md transition-all"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add IP Address
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="h-6 w-6 text-orange-600" />
              Audit Logs
            </h3>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">All Actions</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="settings_updated">Settings Updated</option>
                <option value="user_created">User Created</option>
                <option value="user_deleted">User Deleted</option>
              </select>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {filteredAuditLogs.slice(0, 50).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{log.action}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {log.resource_type && <span>Resource: {log.resource_type}</span>}
                      {log.ip_address && <span>• IP: {log.ip_address}</span>}
                      <span>• <TimeAgo timestamp={log.created_at} /></span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredAuditLogs.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No audit logs found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2FA Setup Modal */}
      {show2FASetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Setup Two-Factor Authentication</h3>
              <button
                onClick={() => {
                  setShow2FASetup(false);
                  setQrCodeUrl('');
                  setBackupCodes([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
              </div>
              {qrCodeUrl && (
                <div className="flex justify-center p-4 bg-white dark:bg-gray-700 rounded-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
                    alt="2FA QR Code"
                    className="w-48 h-48"
                  />
                </div>
              )}
              {backupCodes.length > 0 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">Backup Codes:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, index) => (
                      <code key={index} className="text-xs bg-white dark:bg-gray-700 p-2 rounded">
                        {code}
                      </code>
                    ))}
                  </div>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-2">
                    Save these codes in a safe place. They can be used if you lose access to your authenticator.
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  id="verification-code"
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <button
                onClick={() => {
                  const code = (document.getElementById('verification-code') as HTMLInputElement)?.value;
                  if (code) {
                    enable2FAMutation.mutate(code);
                  }
                }}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-lg font-medium"
              >
                Verify & Enable 2FA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Create API Key</h3>
              <button
                onClick={() => {
                  setShowApiKeyModal(false);
                  setNewApiKey('');
                  setApiKeyName('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            {newApiKey ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-300 mb-2">
                    ✓ API Key created successfully!
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400">
                    Copy this key now - it won't be shown again.
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={newApiKey}
                    readOnly
                    className="w-full pr-12 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(newApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
                  >
                    {copied ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowApiKeyModal(false);
                    setNewApiKey('');
                    setApiKeyName('');
                  }}
                  className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-md transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={apiKeyName}
                    onChange={(e) => setApiKeyName(e.target.value)}
                    placeholder="Production API, Testing, etc."
                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowApiKeyModal(false);
                      setApiKeyName('');
                    }}
                    className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (apiKeyName) {
                        createApiKeyMutation.mutate(apiKeyName);
                      }
                    }}
                    disabled={!apiKeyName || createApiKeyMutation.isPending}
                    className="flex-1 px-4 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-md disabled:opacity-50 transition-all"
                  >
                    {createApiKeyMutation.isPending ? 'Creating...' : 'Create Key'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add IP Modal */}
      {showIPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Add IP to Allowlist</h3>
              <button
                onClick={() => {
                  setShowIPModal(false);
                  setIpAddress('');
                  setIpDescription('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  IP Address
                </label>
                <input
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="192.168.1.1"
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={ipDescription}
                  onChange={(e) => setIpDescription(e.target.value)}
                  placeholder="Office network, Home, etc."
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowIPModal(false);
                    setIpAddress('');
                    setIpDescription('');
                  }}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (ipAddress) {
                      createIPMutation.mutate({
                        ip_address: ipAddress,
                        description: ipDescription,
                      });
                    }
                  }}
                  disabled={!ipAddress || createIPMutation.isPending}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-md disabled:opacity-50 transition-all"
                >
                  {createIPMutation.isPending ? 'Adding...' : 'Add IP'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
