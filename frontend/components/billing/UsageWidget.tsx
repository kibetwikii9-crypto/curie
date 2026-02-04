'use client';

import { TrendingUp, MessageSquare, Radio, Users, HardDrive, Cpu } from 'lucide-react';

interface UsageWidgetProps {
  usage: {
    conversation?: { limit: number | null; used: number; percentage: number; unlimited?: boolean };
    channel?: { limit: number | null; used: number; percentage: number; unlimited?: boolean };
    user?: { limit: number | null; used: number; percentage: number; unlimited?: boolean };
    storage?: { limit: number | null; used: number; percentage: number; unlimited?: boolean };
    ai_token?: { limit: number | null; used: number; percentage: number; unlimited?: boolean };
  };
  planName?: string;
}

export default function UsageWidget({ usage, planName }: UsageWidgetProps) {
  const resources = [
    {
      key: 'conversation',
      icon: MessageSquare,
      label: 'Conversations',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      key: 'channel',
      icon: Radio,
      label: 'Channels',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-600 dark:text-purple-400'
    },
    {
      key: 'user',
      icon: Users,
      label: 'Team Members',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-600 dark:text-green-400'
    },
    {
      key: 'storage',
      icon: HardDrive,
      label: 'Storage',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      textColor: 'text-orange-600 dark:text-orange-400'
    },
    {
      key: 'ai_token',
      icon: Cpu,
      label: 'AI Tokens',
      color: 'from-indigo-500 to-purple-500',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      textColor: 'text-indigo-600 dark:text-indigo-400'
    }
  ];

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getProgressGradient = (percentage: number, gradient: string) => {
    if (percentage >= 90) return 'from-red-500 to-red-600';
    if (percentage >= 75) return 'from-yellow-500 to-orange-500';
    return gradient;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Usage This Month</h3>
          {planName && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {planName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20">
          <TrendingUp className="h-4 w-4 text-primary-600 dark:text-primary-400" />
          <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">LIVE</span>
        </div>
      </div>

      {/* Usage Bars */}
      <div className="space-y-5">
        {resources.map((resource) => {
          const data = usage[resource.key as keyof typeof usage];
          if (!data) return null;

          const Icon = resource.icon;
          const percentage = data.percentage || 0;
          const isUnlimited = data.unlimited || false;

          return (
            <div key={resource.key} className="group">
              {/* Label */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${resource.bgColor}`}>
                    <Icon className={`h-4 w-4 ${resource.textColor}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {resource.label}
                  </span>
                </div>
                <div className="text-right">
                  {isUnlimited ? (
                    <span className="text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      Unlimited
                    </span>
                  ) : (
                    <>
                      <span className={`text-sm font-semibold ${
                        percentage >= 90 ? 'text-red-600 dark:text-red-400' :
                        percentage >= 75 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-gray-900 dark:text-white'
                      }`}>
                        {data.used.toLocaleString()} / {data.limit?.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                        ({percentage.toFixed(0)}%)
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {!isUnlimited && (
                <div className="relative h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  {/* Animated Background Shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" 
                       style={{ animationDuration: '2s' }} />
                  
                  {/* Progress Fill */}
                  <div
                    className={`h-full bg-gradient-to-r ${getProgressGradient(percentage, resource.color)} transition-all duration-1000 ease-out relative overflow-hidden`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  >
                    {/* Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                  </div>

                  {/* Warning Pulse for High Usage */}
                  {percentage >= 90 && (
                    <div className="absolute right-0 top-0 h-full w-2 bg-red-500 animate-pulse" />
                  )}
                </div>
              )}

              {/* Warning Message */}
              {percentage >= 90 && !isUnlimited && (
                <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400 animate-pulse">
                  ⚠️ Limit almost reached! Upgrade to continue.
                </p>
              )}
              {percentage >= 75 && percentage < 90 && !isUnlimited && (
                <p className="mt-1.5 text-xs text-yellow-600 dark:text-yellow-400">
                  🔔 Approaching limit
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Add shimmer animation to globals.css if not exists */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
