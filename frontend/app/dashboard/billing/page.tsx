'use client';

import { CreditCard, CheckCircle2, Clock, TrendingUp, Zap } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '$0',
    period: 'Free',
    features: ['Up to 1,000 conversations/month', 'Basic AI rules', 'Email support'],
    popular: false,
  },
  {
    name: 'Professional',
    price: '$49',
    period: 'per month',
    features: ['Up to 10,000 conversations/month', 'Advanced AI rules', 'Priority support', 'Analytics'],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'pricing',
    features: ['Unlimited conversations', 'Custom AI rules', 'Dedicated support', 'Advanced analytics', 'API access'],
    popular: false,
  },
];

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Billing, Plans & Usage
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage your subscription and view usage metrics
        </p>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
              Payment System Coming Soon
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Subscription management, billing, and payment processing will be available in a future update. Currently, the platform is free to use.
            </p>
          </div>
        </div>
      </div>

      {/* Current Plan */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Current Plan
        </h3>
        <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Starter Plan</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Free tier - No payment required</p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Subscription Tiers */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Available Plans
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`p-6 border-2 rounded-lg ${
                plan.popular
                  ? 'border-primary-500 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {plan.popular && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-600 text-white mb-3">
                  Most Popular
                </span>
              )}
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {plan.name}
              </h4>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                disabled
                className={`w-full inline-flex items-center justify-center px-4 py-2 border rounded-md text-sm font-medium ${
                  plan.popular
                    ? 'border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20 cursor-not-allowed'
                    : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 cursor-not-allowed'
                }`}
              >
                {plan.price === 'Custom' ? 'Contact Sales' : 'Available Soon'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Metrics Placeholders */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Usage Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-primary-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Conversations</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">0 / 1,000</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This month</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-primary-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">AI Responses</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">0</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This month</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-5 w-5 text-primary-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Storage</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">0 GB</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Used</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-primary-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Leads</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">0</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Captured</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          Detailed usage tracking and billing will be available in a future update.
        </p>
      </div>

      {/* Upgrade Path */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Upgrade Path
        </h3>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            As your business grows, upgrade to unlock additional features:
          </p>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>• Higher conversation limits</li>
            <li>• Advanced analytics and reporting</li>
            <li>• Priority support and faster response times</li>
            <li>• Custom integrations and API access</li>
          </ul>
        </div>
        <button
          disabled
          className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
        >
          Upgrade Available Soon
        </button>
      </div>
    </div>
  );
}

