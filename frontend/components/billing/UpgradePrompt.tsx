'use client';

import { ArrowRight, Sparkles, X, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UpgradePromptProps {
  title: string;
  message: string;
  feature?: string;
  currentUsage?: number;
  limit?: number;
  ctaText?: string;
  variant?: 'banner' | 'card' | 'modal';
  dismissible?: boolean;
}

export default function UpgradePrompt({
  title,
  message,
  feature,
  currentUsage,
  limit,
  ctaText = 'Upgrade Now',
  variant = 'banner',
  dismissible = true
}: UpgradePromptProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const router = useRouter();

  if (isDismissed) return null;

  const handleUpgrade = () => {
    router.push('/dashboard/billing/plans');
  };

  // Banner variant (top of page)
  if (variant === 'banner') {
    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 rounded-lg shadow-lg mb-6">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" 
               style={{ animationDuration: '3s' }} />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" 
               style={{ animationDuration: '4s', animationDelay: '1s' }} />
        </div>

        <div className="relative px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex-shrink-0 p-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-semibold text-sm mb-0.5">{title}</h4>
              <p className="text-white/90 text-sm">{message}</p>
              {currentUsage !== undefined && limit !== undefined && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 max-w-xs h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white transition-all duration-500"
                      style={{ width: `${Math.min((currentUsage / limit) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/80">
                    {currentUsage.toLocaleString()} / {limit.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleUpgrade}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-primary-600 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-all hover:scale-105 shadow-lg"
            >
              {ctaText}
              <ArrowRight className="h-4 w-4" />
            </button>
            
            {dismissible && (
              <button
                onClick={() => setIsDismissed(true)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Card variant (in-page)
  if (variant === 'card') {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 rounded-xl border-2 border-primary-200 dark:border-primary-800 p-6">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-purple-500 rounded-xl shadow-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">{message}</p>
              {feature && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  <Sparkles className="h-4 w-4 text-primary-500" />
                  <span>Unlock: {feature}</span>
                </div>
              )}
              <button
                onClick={handleUpgrade}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-lg font-semibold hover:from-primary-700 hover:to-purple-700 transition-all hover:scale-105 shadow-lg"
              >
                {ctaText}
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
            
            {dismissible && (
              <button
                onClick={() => setIsDismissed(true)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Modal variant (overlay)
  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-200 dark:border-gray-700">
          {/* Decorative gradient */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary-500/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl" />
          
          <div className="relative">
            {dismissible && (
              <button
                onClick={() => setIsDismissed(true)}
                className="absolute -top-2 -right-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            )}

            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-gradient-to-br from-primary-500 to-purple-500 rounded-2xl shadow-lg mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {title}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {message}
              </p>

              {feature && (
                <div className="w-full p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg mb-6">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Unlock: <span className="text-primary-600 dark:text-primary-400">{feature}</span>
                  </p>
                </div>
              )}

              <button
                onClick={handleUpgrade}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl font-semibold hover:from-primary-700 hover:to-purple-700 transition-all hover:scale-105 shadow-xl"
              >
                {ctaText}
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
