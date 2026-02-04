'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import UsageWidget from '@/components/billing/UsageWidget';
import { CreditCard, FileText, Package, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

export default function BillingPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch subscription
  const { data: subscriptionData, isLoading: subLoading } = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: async () => {
      const response = await api.get('/api/billing/subscription');
      return response.data;
    },
    enabled: isAuthenticated
  });

  // Fetch usage
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: async () => {
      const response = await api.get('/api/billing/usage');
      return response.data;
    },
    enabled: isAuthenticated
  });

  // Fetch invoices
  const { data: invoicesData } = useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: async () => {
      const response = await api.get('/api/billing/invoices?limit=5');
      return response.data;
    },
    enabled: isAuthenticated
  });

  const subscription = subscriptionData?.subscription;
  const usage = usageData?.usage || {};
  const invoices = invoicesData?.invoices || [];

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  // Calculate days until renewal
  const daysUntilRenewal = subscription?.current_period_end
    ? Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Billing & Subscription</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your plan, usage, and payments</p>
        </div>

        {/* Current Plan Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-gradient-to-br from-primary-600 via-purple-600 to-pink-600 rounded-xl shadow-xl p-8 text-white relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-white/80 text-sm mb-2">Current Plan</p>
                  <h2 className="text-4xl font-bold mb-2">
                    {subscription?.plan?.name || 'Free Trial'}
                  </h2>
                  <p className="text-white/90">
                    ${subscription?.plan?.price || '0'}/{subscription?.plan?.billing_cycle || 'month'}
                  </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <div className={`h-2.5 w-2.5 rounded-full ${
                    subscription?.status === 'active' ? 'bg-green-400' :
                    subscription?.status === 'trialing' ? 'bg-blue-400' :
                    'bg-red-400'
                  } animate-pulse`} />
                  <span className="text-sm font-semibold capitalize">
                    {subscription?.status || 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm text-white/80">Next Billing</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {subscription?.current_period_end 
                      ? new Date(subscription.current_period_end).toLocaleDateString()
                      : 'N/A'
                    }
                  </p>
                  {daysUntilRenewal > 0 && (
                    <p className="text-xs text-white/70 mt-1">
                      in {daysUntilRenewal} days
                    </p>
                  )}
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm text-white/80">Amount Due</span>
                  </div>
                  <p className="text-lg font-semibold">
                    ${subscription?.plan?.price || '0.00'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/dashboard/billing/plans')}
                  className="flex-1 px-6 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-gray-100 transition-all hover:scale-105 shadow-lg"
                >
                  Change Plan
                </button>
                <button
                  onClick={() => router.push('/dashboard/billing/invoices')}
                  className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-lg font-semibold hover:bg-white/20 transition-all border border-white/20"
                >
                  View Invoices
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Recent Invoices</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{invoices.length}</p>
                </div>
              </div>
              <button
                onClick={() => router.push('/dashboard/billing/invoices')}
                className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline"
              >
                View all →
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Payment Methods</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">1</p>
                </div>
              </div>
              <button
                onClick={() => router.push('/dashboard/billing/payment-methods')}
                className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline"
              >
                Manage cards →
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Add-ons</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
                </div>
              </div>
              <button
                onClick={() => router.push('/dashboard/billing/addons')}
                className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline"
              >
                Browse add-ons →
              </button>
            </div>
          </div>
        </div>

        {/* Usage Widget */}
        {!usageLoading && (
          <div className="mb-8">
            <UsageWidget usage={usage} planName={subscription?.plan?.name} />
          </div>
        )}

        {/* Trial Warning */}
        {subscription?.status === 'trialing' && subscription?.trial_end && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-6 rounded-lg mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                  Trial Ends Soon
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
                  Your trial ends on {new Date(subscription.trial_end).toLocaleDateString()}. 
                  Add a payment method to continue after your trial.
                </p>
                <button
                  onClick={() => router.push('/dashboard/billing/payment-methods')}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-semibold hover:bg-yellow-700 transition-colors"
                >
                  Add Payment Method
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancelled Warning */}
        {subscription?.cancel_at_period_end && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-6 rounded-lg mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-200 mb-1">
                  Subscription Cancelled
                </h3>
                <p className="text-sm text-red-800 dark:text-red-300 mb-3">
                  Your subscription will end on {new Date(subscription.current_period_end).toLocaleDateString()}. 
                  You can resume anytime before then.
                </p>
                <button
                  onClick={async () => {
                    try {
                      await api.post('/api/billing/subscription/resume');
                      alert('Subscription resumed successfully!');
                      window.location.reload();
                    } catch (error) {
                      alert('Failed to resume subscription');
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  Resume Subscription
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
