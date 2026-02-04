'use client';

import { Check, Sparkles, Zap } from 'lucide-react';

interface PlanCardProps {
  plan: {
    id: number;
    name: string;
    display_name: string;
    description: string;
    price_monthly: number;
    price_annual: number;
    currency: string;
    conversation_limit: number | null;
    channel_limit: number | null;
    user_limit: number | null;
    storage_limit: number | null;
    features: string;
    is_popular: boolean;
  };
  isAnnual: boolean;
  onSelect: () => void;
  isCurrentPlan?: boolean;
}

export default function PlanCard({ plan, isAnnual, onSelect, isCurrentPlan }: PlanCardProps) {
  const price = isAnnual ? plan.price_annual : plan.price_monthly;
  const monthlyEquivalent = isAnnual ? plan.price_annual / 12 : plan.price_monthly;
  const savings = isAnnual ? ((plan.price_monthly * 12 - plan.price_annual) / (plan.price_monthly * 12) * 100).toFixed(0) : null;
  
  // Parse features
  let features: any = {};
  try {
    features = JSON.parse(plan.features);
  } catch (e) {
    features = {};
  }
  
  // Get feature list
  const featureList = [
    {
      name: `${plan.conversation_limit ? plan.conversation_limit.toLocaleString() : 'Unlimited'} conversations/month`,
      included: true
    },
    {
      name: `${plan.channel_limit ? plan.channel_limit : 'Unlimited'} channels`,
      included: true
    },
    {
      name: `${plan.user_limit ? plan.user_limit : 'Unlimited'} team members`,
      included: true
    },
    {
      name: `${plan.storage_limit ? plan.storage_limit + ' MB' : 'Unlimited'} knowledge base`,
      included: true
    },
    {
      name: 'Voice AI',
      included: features.voice_ai
    },
    {
      name: 'API Access',
      included: features.api_access
    },
    {
      name: 'Advanced CRM',
      included: features.crm
    },
    {
      name: 'Payment Automation',
      included: features.payment_automation
    },
    {
      name: 'Advanced Analytics',
      included: features.advanced_analytics
    },
    {
      name: 'White Label',
      included: features.white_label
    },
    {
      name: 'Priority Support',
      included: features.priority_support
    },
    {
      name: 'Dedicated Support',
      included: features.dedicated_support
    },
    {
      name: 'SLA Guarantee',
      included: features.sla
    }
  ].filter(f => f.name);

  // Gradient styles for popular plans
  const gradientStyles = plan.is_popular
    ? 'bg-gradient-to-br from-primary-500 via-purple-500 to-pink-500'
    : 'bg-gradient-to-br from-gray-800 to-gray-900';
  
  const borderStyles = plan.is_popular
    ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900'
    : 'border border-gray-200 dark:border-gray-700';

  return (
    <div
      className={`relative flex flex-col rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:shadow-2xl ${borderStyles} ${
        isCurrentPlan ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-white dark:bg-gray-800'
      }`}
    >
      {/* Popular Badge */}
      {plan.is_popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-primary-600 to-purple-600 px-4 py-1.5 shadow-lg">
            <Sparkles className="h-3.5 w-3.5 text-white" />
            <span className="text-xs font-bold text-white">MOST POPULAR</span>
          </div>
        </div>
      )}

      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute -top-4 right-4">
          <div className="rounded-full bg-green-500 px-3 py-1 shadow-md">
            <span className="text-xs font-semibold text-white">CURRENT PLAN</span>
          </div>
        </div>
      )}

      {/* Plan Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {plan.display_name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 min-h-[40px]">
          {plan.description}
        </p>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-extrabold text-gray-900 dark:text-white">
            ${monthlyEquivalent.toFixed(0)}
          </span>
          <span className="text-gray-600 dark:text-gray-400">/ month</span>
        </div>
        
        {isAnnual && savings && (
          <div className="mt-2 flex items-center gap-1">
            <Zap className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              Save {savings}% with annual billing
            </span>
          </div>
        )}
        
        {isAnnual && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Billed ${price.toFixed(2)} annually
          </p>
        )}
      </div>

      {/* CTA Button */}
      <button
        onClick={onSelect}
        disabled={isCurrentPlan}
        className={`w-full rounded-lg px-6 py-3.5 text-sm font-semibold transition-all duration-200 mb-6 ${
          plan.is_popular
            ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white hover:from-primary-700 hover:to-purple-700 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed'
            : isCurrentPlan
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {isCurrentPlan ? 'Current Plan' : plan.name === 'enterprise' ? 'Contact Sales' : 'Get Started'}
      </button>

      {/* Features List */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          What's included:
        </p>
        <ul className="space-y-3">
          {featureList.map((feature, index) => (
            feature.included && (
              <li key={index} className="flex items-start gap-3">
                <div className={`mt-0.5 flex-shrink-0 rounded-full p-0.5 ${
                  plan.is_popular 
                    ? 'bg-gradient-to-br from-primary-500 to-purple-500'
                    : 'bg-green-500'
                }`}>
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {feature.name}
                </span>
              </li>
            )
          ))}
        </ul>
      </div>

      {/* Decorative Elements */}
      {plan.is_popular && (
        <>
          <div className="absolute -z-10 top-0 left-0 w-full h-full rounded-2xl bg-gradient-to-br from-primary-500/10 via-purple-500/10 to-pink-500/10 blur-xl" />
          <div className="absolute -z-10 -top-4 -right-4 w-24 h-24 bg-primary-500/20 rounded-full blur-2xl" />
          <div className="absolute -z-10 -bottom-4 -left-4 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl" />
        </>
      )}
    </div>
  );
}
