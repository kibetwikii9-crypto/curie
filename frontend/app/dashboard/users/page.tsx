'use client';

import { Users, Shield, UserCheck, Eye, Clock, Lock } from 'lucide-react';

const roles = [
  {
    name: 'Owner',
    description: 'Full platform access and billing control',
    permissions: ['All permissions'],
    icon: Shield,
  },
  {
    name: 'Admin',
    description: 'Manage users, settings, and all content',
    permissions: ['User management', 'Settings', 'Content management'],
    icon: UserCheck,
  },
  {
    name: 'Agent',
    description: 'Handle conversations and customer support',
    permissions: ['Conversations', 'Knowledge base', 'Lead management'],
    icon: Users,
  },
  {
    name: 'Viewer',
    description: 'Read-only access to analytics and reports',
    permissions: ['View analytics', 'View reports'],
    icon: Eye,
  },
];

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Users, Roles & Access Control
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage team members and access permissions
        </p>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
              Team Management Coming Soon
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Advanced user management, role-based access control, and team collaboration features are in development.
            </p>
          </div>
        </div>
      </div>

      {/* Role Types */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Role Types
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.name}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Icon className="h-5 w-5 text-primary-500" />
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white">
                    {role.name}
                  </h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {role.description}
                </p>
                <div className="space-y-1">
                  {role.permissions.map((permission, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                      {permission}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Permission Matrix Preview */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Permission Matrix (Preview)
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Feature
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Viewer
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {[
                { feature: 'View Dashboard', owner: true, admin: true, agent: true, viewer: true },
                { feature: 'Manage Conversations', owner: true, admin: true, agent: true, viewer: false },
                { feature: 'Edit Knowledge Base', owner: true, admin: true, agent: true, viewer: false },
                { feature: 'Manage Users', owner: true, admin: true, agent: false, viewer: false },
                { feature: 'Billing & Settings', owner: true, admin: false, agent: false, viewer: false },
              ].map((row, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {row.feature}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.owner ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                    ) : (
                      <Lock className="h-5 w-5 text-gray-300 dark:text-gray-600 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.admin ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                    ) : (
                      <Lock className="h-5 w-5 text-gray-300 dark:text-gray-600 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.agent ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                    ) : (
                      <Lock className="h-5 w-5 text-gray-300 dark:text-gray-600 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.viewer ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                    ) : (
                      <Lock className="h-5 w-5 text-gray-300 dark:text-gray-600 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          This is a preview of the permission structure. Full access control will be available in a future update.
        </p>
      </div>

      {/* Team Management Preview */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Team Management
          </h3>
          <button
            disabled
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
          >
            <Users className="h-4 w-4 mr-2" />
            Add Team Member
          </button>
        </div>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Team management features will be available soon</p>
        </div>
      </div>
    </div>
  );
}

