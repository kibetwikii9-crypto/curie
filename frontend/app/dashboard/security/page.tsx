'use client';

import { Shield, Lock, FileText, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default function SecurityPage() {
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

      {/* Coming Soon Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
              Security Center Coming Soon
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Advanced security controls, audit logs, and compliance management features are in development.
            </p>
          </div>
        </div>
      </div>

      {/* Security Feature Checklist */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Security Features (Planned)
        </h3>
        <div className="space-y-3">
          {[
            { feature: 'Two-Factor Authentication (2FA)', status: 'planned' },
            { feature: 'Single Sign-On (SSO)', status: 'planned' },
            { feature: 'IP Allowlisting', status: 'planned' },
            { feature: 'Session Management', status: 'planned' },
            { feature: 'API Key Management', status: 'planned' },
            { feature: 'Password Policy Enforcement', status: 'planned' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{item.feature}</span>
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Planned</span>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Log Structure Preview */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Audit Log Structure (Preview)
        </h3>
        <div className="space-y-3">
          {[
            { action: 'User login', user: 'admin@example.com', timestamp: '2024-01-15 10:30', ip: '192.168.1.1' },
            { action: 'Settings updated', user: 'admin@example.com', timestamp: '2024-01-15 09:15', ip: '192.168.1.1' },
            { action: 'Knowledge base entry created', user: 'admin@example.com', timestamp: '2024-01-14 16:45', ip: '192.168.1.1' },
          ].map((log, idx) => (
            <div key={idx} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{log.action}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{log.timestamp}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>User: {log.user}</span>
                <span>IP: {log.ip}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          Full audit logging and export capabilities will be available in a future update.
        </p>
      </div>

      {/* Compliance Readiness Indicators */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Compliance Readiness (Preview)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="h-5 w-5 text-blue-500" />
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">GDPR Compliance</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Data export</span>
                <span className="text-gray-500 dark:text-gray-400">Planned</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Right to deletion</span>
                <span className="text-gray-500 dark:text-gray-400">Planned</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Consent management</span>
                <span className="text-gray-500 dark:text-gray-400">Planned</span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="h-5 w-5 text-green-500" />
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Data Security</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Encryption at rest</span>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Encryption in transit</span>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Regular backups</span>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust-Focused Messaging */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-green-900 dark:text-green-300 mb-1">
              Security is Our Priority
            </h3>
            <p className="text-sm text-green-700 dark:text-green-400">
              We're committed to maintaining the highest security standards. Additional security features and compliance tools are continuously being developed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

