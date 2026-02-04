'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import UpgradePrompt from '@/components/billing/UpgradePrompt';
import {
  Users,
  Shield,
  UserCheck,
  Eye,
  Plus,
  Edit,
  Trash2,
  Search,
  Grid3x3,
  List,
  Power,
  PowerOff,
  Check,
  X,
  Sparkles,
  Lock,
  Unlock,
  Crown,
  Star,
  Target,
  TrendingUp,
  Activity,
  Clock,
  Filter,
  ChevronDown,
  Settings,
  Key,
  Mail,
  User,
} from 'lucide-react';

interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface Role {
  id: number;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: Array<{ id: number; name: string }>;
}

interface Permission {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
}

interface UserStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  by_role: Record<string, number>;
  recent_users: number;
}

export default function UsersPage() {
  const [activeView, setActiveView] = useState<'users' | 'roles' | 'permissions'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  // Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Form states
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('agent');
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState('');
  const [editUserActive, setEditUserActive] = useState(true);

  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState<number[]>([]);

  const queryClient = useQueryClient();

  // Queries
  const { data: stats } = useQuery<UserStats>({
    queryKey: ['user-stats'],
    queryFn: async () => {
      const response = await api.get('/api/users/stats');
      return response.data;
    },
    refetchInterval: 30000,
  });

  // Fetch usage for team limit
  const { data: usageData } = useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/billing/usage');
        return response.data;
      } catch (error) {
        return { usage: {} };
      }
    }
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['users', searchTerm, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      const response = await api.get(`/api/users/?${params}`);
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.get('/api/users/roles/');
      return response.data;
    },
  });

  const { data: permissions = [] } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await api.get('/api/users/permissions/');
      return response.data;
    },
  });

  // Mutations
  const addUserMutation = useMutation({
    mutationFn: async (userData: { email: string; full_name?: string; role: string }) => {
      const response = await api.post('/api/users/', userData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      setShowAddUserModal(false);
      resetForms();
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await api.put(`/api/users/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      setShowEditUserModal(false);
      resetForms();
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await api.delete(`/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: async (roleData: { name: string; description?: string; permission_ids: number[] }) => {
      const response = await api.post('/api/users/roles/', roleData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowAddRoleModal(false);
      resetForms();
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await api.put(`/api/users/roles/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowEditRoleModal(false);
      resetForms();
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      await api.delete(`/api/users/roles/${roleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  const bulkToggleMutation = useMutation({
    mutationFn: async ({ user_ids, is_active }: { user_ids: number[]; is_active: boolean }) => {
      const response = await api.post('/api/users/bulk/toggle-active', user_ids, {
        params: { is_active },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      setSelectedUsers([]);
      setBulkMode(false);
    },
  });

  const resetForms = () => {
    setNewUserEmail('');
    setNewUserName('');
    setNewUserRole('agent');
    setEditUserName('');
    setEditUserRole('');
    setEditUserActive(true);
    setNewRoleName('');
    setNewRoleDescription('');
    setNewRolePermissions([]);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditUserName(user.full_name || '');
    setEditUserRole(user.role);
    setEditUserActive(user.is_active);
    setShowEditUserModal(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setNewRoleName(role.name);
    setNewRoleDescription(role.description || '');
    setNewRolePermissions(role.permissions.map((p) => p.id));
    setShowEditRoleModal(true);
  };

  const handleTogglePermission = (permissionId: number) => {
    if (newRolePermissions.includes(permissionId)) {
      setNewRolePermissions(newRolePermissions.filter((id) => id !== permissionId));
    } else {
      setNewRolePermissions([...newRolePermissions, permissionId]);
    }
  };

  const handleToggleUser = (userId: number) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const getRoleColor = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'business_owner':
        return 'from-yellow-500 to-orange-500';
      case 'admin':
        return 'from-blue-500 to-indigo-600';
      case 'agent':
        return 'from-green-500 to-teal-600';
      case 'viewer':
        return 'from-gray-500 to-gray-600';
      default:
        return 'from-purple-500 to-pink-600';
    }
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'business_owner':
        return <Crown className="h-4 w-4" />;
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'agent':
        return <Users className="h-4 w-4" />;
      case 'viewer':
        return <Eye className="h-4 w-4" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };

  const filteredUsers = users.filter((user) => {
    if (statusFilter === 'active' && !user.is_active) return false;
    if (statusFilter === 'inactive' && user.is_active) return false;
    return true;
  });

  const permissionsByCategory = permissions.reduce((acc, permission) => {
    const category = permission.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6">
      {/* Team Limit Upgrade Prompt */}
      {usageData?.usage?.user && usageData.usage.user.exceeded && (
        <UpgradePrompt
          title="Team Limit Reached"
          message={`You have ${usageData.usage.user.used} of ${usageData.usage.user.limit} team members. Upgrade to add more.`}
          feature="More Team Members"
          ctaText="Upgrade Plan"
          variant="banner"
          dismissible={false}
        />
      )}

      {/* Enhanced Hero Header */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg p-1 shadow-lg">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shadow-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Users, Roles & Permissions
                  </h1>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Manage team members and control access with granular permissions
                  </p>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAddUserModal(true)}
                className="inline-flex items-center px-6 py-3 border border-transparent shadow-lg text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transform hover:scale-105 transition-all"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add User
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{stats.total_users}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Users</p>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{stats.active_users}</p>
              </div>
              <Power className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Roles</p>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{roles.length}</p>
              </div>
              <Shield className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">New (7 days)</p>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{stats.recent_users}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
        </div>
      )}

      {/* View Navigation */}
      <div className="flex space-x-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        {[
          { id: 'users', label: 'Users', icon: Users, color: 'text-blue-600' },
          { id: 'roles', label: 'Roles', icon: Shield, color: 'text-purple-600' },
          { id: 'permissions', label: 'Permissions Matrix', icon: Lock, color: 'text-pink-600' },
        ].map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all transform hover:scale-105 ${
              activeView === view.id
                ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <view.icon className={`h-5 w-5 ${activeView !== view.id ? view.color : ''}`} />
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        ))}
      </div>

      {/* Users View */}
      {activeView === 'users' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="all">All Roles</option>
                <option value="business_owner">Business Owner</option>
                <option value="admin">Admin</option>
                <option value="agent">Agent</option>
                <option value="viewer">Viewer</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${
                    viewMode === 'grid'
                      ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Grid3x3 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${
                    viewMode === 'list'
                      ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <button
                onClick={() => setBulkMode(!bulkMode)}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
              >
                {bulkMode ? '✓ Bulk Mode Active' : 'Enable Bulk Mode'}
              </button>
              {bulkMode && selectedUsers.length > 0 && (
                <div className="flex gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{selectedUsers.length} selected</span>
                  <button
                    onClick={() => bulkToggleMutation.mutate({ user_ids: selectedUsers, is_active: false })}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700"
                  >
                    Deactivate
                  </button>
                  <button
                    onClick={() => bulkToggleMutation.mutate({ user_ids: selectedUsers, is_active: true })}
                    className="text-sm text-green-600 dark:text-green-400 hover:text-green-700"
                  >
                    Activate
                  </button>
                  <button onClick={() => setSelectedUsers([])} className="text-sm text-gray-600 hover:text-gray-700">
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Users List */}
          {usersLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-5">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                  Team Members ({filteredUsers.length})
                </h3>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUsers.map((user) => {
                      const initials = (user.full_name || user.email)
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .substring(0, 2);

                      return (
                        <div
                          key={user.id}
                          className="group relative p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-xl transition-all transform hover:-translate-y-1"
                        >
                          {bulkMode && (
                            <div className="absolute top-4 left-4">
                              <input
                                type="checkbox"
                                checked={selectedUsers.includes(user.id)}
                                onChange={() => handleToggleUser(user.id)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            </div>
                          )}

                          <div className="flex flex-col items-center text-center mb-4">
                            <div
                              className={`w-16 h-16 rounded-full bg-gradient-to-br ${getRoleColor(
                                user.role
                              )} flex items-center justify-center text-white text-xl font-bold shadow-lg mb-3`}
                            >
                              {initials}
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                              {user.full_name || user.email.split('@')[0]}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{user.email}</p>

                            <div className="flex items-center gap-2 mt-2">
                              <span
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getRoleColor(
                                  user.role
                                )} text-white`}
                              >
                                {getRoleIcon(user.role)}
                                {user.role.replace('_', ' ')}
                              </span>
                              {user.is_active ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                  <Power className="h-3 w-3" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                                  <PowerOff className="h-3 w-3" />
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="flex-1 px-3 py-2 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700 transition-all"
                            >
                              <Edit className="h-3 w-3 inline mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete ${user.email}?`)) {
                                  deleteUserMutation.mutate(user.id);
                                }
                              }}
                              className="px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredUsers.map((user) => {
                      const initials = (user.full_name || user.email)
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .substring(0, 2);

                      return (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            {bulkMode && (
                              <input
                                type="checkbox"
                                checked={selectedUsers.includes(user.id)}
                                onChange={() => handleToggleUser(user.id)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            )}
                            <div
                              className={`w-10 h-10 rounded-full bg-gradient-to-br ${getRoleColor(
                                user.role
                              )} flex items-center justify-center text-white text-sm font-bold shadow`}
                            >
                              {initials}
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                {user.full_name || user.email.split('@')[0]}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getRoleColor(
                                user.role
                              )} text-white`}
                            >
                              {getRoleIcon(user.role)}
                              {user.role.replace('_', ' ')}
                            </span>
                            {user.is_active ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                <Power className="h-3 w-3" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                                <PowerOff className="h-3 w-3" />
                                Inactive
                              </span>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditUser(user)}
                                className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete ${user.email}?`)) {
                                    deleteUserMutation.mutate(user.id);
                                  }
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center mb-4">
                <Users className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No users found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Add your first team member to get started</p>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="inline-flex items-center px-6 py-3 border border-transparent shadow-lg text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add User
              </button>
            </div>
          )}
        </div>
      )}

      {/* Roles View */}
      {activeView === 'roles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manage Roles</h2>
            <button
              onClick={() => setShowAddRoleModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Custom Role
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => {
              const userCount = stats?.by_role[role.name] || 0;

              return (
                <div
                  key={role.id}
                  className="group relative p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-2xl transition-all transform hover:-translate-y-2"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`p-4 bg-gradient-to-br ${getRoleColor(role.name)} rounded-lg shadow-lg text-white`}
                    >
                      {getRoleIcon(role.name)}
                    </div>
                    {role.is_system ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        <Shield className="h-3 w-3 mr-1" />
                        System
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                        <Star className="h-3 w-3 mr-1" />
                        Custom
                      </span>
                    )}
                  </div>

                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 capitalize">
                    {role.name.replace('_', ' ')}
                  </h4>
                  {role.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{role.description}</p>
                  )}

                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Permissions:</p>
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.slice(0, 3).map((permission) => (
                        <span
                          key={permission.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400"
                        >
                          {permission.name.split('.')[1] || permission.name}
                        </span>
                      ))}
                      {role.permissions.length > 3 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{role.permissions.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{userCount} users</span>
                    {!role.is_system && (
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditRole(role)}
                          className="px-3 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 bg-white dark:bg-gray-700 border border-purple-300 dark:border-purple-600 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20"
                        >
                          <Edit className="h-3 w-3 inline mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete role "${role.name}"?`)) {
                              deleteRoleMutation.mutate(role.id);
                            }
                          }}
                          className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Permissions Matrix */}
      {activeView === 'permissions' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-5">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                Permission Matrix - Role Access Control
              </h3>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-white dark:bg-gray-800 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700">
                        Role / Permission
                      </th>
                      {Object.keys(permissionsByCategory).map((category) => (
                        <th
                          key={category}
                          colSpan={permissionsByCategory[category].length}
                          className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-x border-gray-200 dark:border-gray-700"
                        >
                          {category}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      <th className="sticky left-0 bg-white dark:bg-gray-800 px-6 py-3 border-r border-gray-200 dark:border-gray-700"></th>
                      {Object.values(permissionsByCategory)
                        .flat()
                        .map((permission) => (
                          <th
                            key={permission.id}
                            className="px-2 py-2 text-xs text-gray-600 dark:text-gray-400 border-x border-gray-200 dark:border-gray-700"
                          >
                            <div className="transform -rotate-45 whitespace-nowrap">
                              {permission.name.split('.')[1] || permission.name}
                            </div>
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {roles.map((role) => (
                      <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="sticky left-0 bg-white dark:bg-gray-800 px-6 py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <div
                              className={`p-2 bg-gradient-to-br ${getRoleColor(role.name)} rounded text-white`}
                            >
                              {getRoleIcon(role.name)}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                              {role.name.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        {Object.values(permissionsByCategory)
                          .flat()
                          .map((permission) => {
                            const hasPermission = role.permissions.some((p) => p.id === permission.id);
                            return (
                              <td
                                key={permission.id}
                                className="px-2 py-4 text-center border-x border-gray-200 dark:border-gray-700"
                              >
                                {hasPermission ? (
                                  <Check className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto" />
                                ) : (
                                  <X className="h-5 w-5 text-gray-300 dark:text-gray-600 mx-auto" />
                                )}
                              </td>
                            );
                          })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Add New User</h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newUserEmail) {
                      addUserMutation.mutate({
                        email: newUserEmail,
                        full_name: newUserName || undefined,
                        role: newUserRole,
                      });
                    }
                  }}
                  disabled={!newUserEmail || addUserMutation.isPending}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-lg disabled:opacity-50"
                >
                  {addUserMutation.isPending ? 'Adding...' : 'Add User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Edit User</h3>
              <button
                onClick={() => setShowEditUserModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email (read-only)
                </label>
                <input
                  type="email"
                  value={selectedUser.email}
                  disabled
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value)}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editUserActive}
                  onChange={(e) => setEditUserActive(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label className="text-sm text-gray-700 dark:text-gray-300">Active User</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditUserModal(false)}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateUserMutation.mutate({
                      id: selectedUser.id,
                      data: {
                        full_name: editUserName,
                        role: editUserRole,
                        is_active: editUserActive,
                      },
                    });
                  }}
                  disabled={updateUserMutation.isPending}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-lg disabled:opacity-50"
                >
                  {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Role Modal */}
      {(showAddRoleModal || showEditRoleModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {showAddRoleModal ? 'Create Custom Role' : 'Edit Role'}
              </h3>
              <button
                onClick={() => {
                  setShowAddRoleModal(false);
                  setShowEditRoleModal(false);
                  resetForms();
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role Name *
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., Support Lead"
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  rows={2}
                  placeholder="Describe what this role does..."
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Permissions
                </label>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(permissionsByCategory).map(([category, perms]) => (
                    <div key={category} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">{category}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {perms.map((permission) => (
                          <label key={permission.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newRolePermissions.includes(permission.id)}
                              onChange={() => handleTogglePermission(permission.id)}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {permission.name.split('.')[1] || permission.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddRoleModal(false);
                    setShowEditRoleModal(false);
                    resetForms();
                  }}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newRoleName) {
                      if (showAddRoleModal) {
                        addRoleMutation.mutate({
                          name: newRoleName,
                          description: newRoleDescription,
                          permission_ids: newRolePermissions,
                        });
                      } else if (selectedRole) {
                        updateRoleMutation.mutate({
                          id: selectedRole.id,
                          data: {
                            name: newRoleName,
                            description: newRoleDescription,
                            permission_ids: newRolePermissions,
                          },
                        });
                      }
                    }
                  }}
                  disabled={
                    !newRoleName ||
                    (showAddRoleModal ? addRoleMutation.isPending : updateRoleMutation.isPending)
                  }
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-lg disabled:opacity-50"
                >
                  {showAddRoleModal
                    ? addRoleMutation.isPending
                      ? 'Creating...'
                      : 'Create Role'
                    : updateRoleMutation.isPending
                    ? 'Saving...'
                    : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
