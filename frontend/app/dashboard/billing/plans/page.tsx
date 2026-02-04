'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PlanCard from '@/components/billing/PlanCard';
import { Check, X } from 'lucide-react';

export default function BillingPlansPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch plans
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: async () => {
      const response = await api.get('/api/billing/plans');
      return response.data;
    },
    enabled: isAuthenticated
  });

  // Fetch current subscription
  const { data: subscriptionData } = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: async () => {
      const response = await api.get('/api/billing/subscription');
      return response.data;
    },
    enabled: isAuthenticated
  });

  const handleSelectPlan = (plan: any) => {
    if (plan.name === 'enterprise') {
      window.location.href = 'mailto:sales@automify.ai?subject=Enterprise Plan Inquiry';
      return;
    }
    router.push(`/dashboard/billing/checkout?plan_id=${plan.id}&billing_cycle=${isAnnual ? 'annual' : 'monthly'}`);
  };

  const currentPlanId = subscriptionData?.subscription?.plan?.id;
  const plans = plansData || [];

  if (authLoading || plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-pink-50/30 dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
            Choose Your <span className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">Perfect Plan</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Unlock the power of AI automation. Scale your business with intelligent conversations.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center mb-12">
          <div className="relative inline-flex items-center gap-4 p-1.5 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setIsAnnual(false)}
              className={`relative px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 ${
                !isAnnual
                  ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`relative px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 ${
                isAnnual
                  ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Annual
              <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {plans.map((plan: any) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isAnnual={isAnnual}
              onSelect={() => handleSelectPlan(plan)}
              isCurrentPlan={plan.id === currentPlanId}
            />
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Compare All Features
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                    Feature
                  </th>
                  {plans.map((plan: any) => (
                    <th key={plan.id} className="text-center py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                      {plan.display_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">Conversations/month</td>
                  {plans.map((plan: any) => (
                    <td key={plan.id} className="text-center py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">
                      {plan.conversation_limit ? plan.conversation_limit.toLocaleString() : 'Unlimited'}
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-900/50">
                  <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">Channels</td>
                  {plans.map((plan: any) => (
                    <td key={plan.id} className="text-center py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">
                      {plan.channel_limit || 'Unlimited'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">Team Members</td>
                  {plans.map((plan: any) => (
                    <td key={plan.id} className="text-center py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">
                      {plan.user_limit || 'Unlimited'}
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-900/50">
                  <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">Knowledge Base Storage</td>
                  {plans.map((plan: any) => (
                    <td key={plan.id} className="text-center py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">
                      {plan.storage_limit ? `${plan.storage_limit} MB` : 'Unlimited'}
                    </td>
                  ))}
                </tr>
                {['Voice AI', 'API Access', 'Advanced CRM', 'Payment Automation', 'Advanced Analytics', 'White Label', 'Priority Support'].map((feature, idx) => {
                  const featureKey = feature.toLowerCase().replace(/ /g, '_');
                  return (
                    <tr key={feature} className={idx % 2 === 0 ? '' : 'bg-gray-50 dark:bg-gray-900/50'}>
                      <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">{feature}</td>
                      {plans.map((plan: any) => {
                        let features: any = {};
                        try {
                          features = JSON.parse(plan.features);
                        } catch (e) {}
                        const hasFeature = features[featureKey];
                        
                        return (
                          <td key={plan.id} className="text-center py-4 px-6">
                            {hasFeature ? (
                              <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30">
                                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center w-6 h-6">
                                <X className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Need Help Choosing?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Not sure which plan is right for you? We're here to help!
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="mailto:sales@automify.ai"
              className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              Contact Sales
            </a>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
