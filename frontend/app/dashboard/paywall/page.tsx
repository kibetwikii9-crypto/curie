'use client';

import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Lock, CreditCard } from 'lucide-react';

export default function PaywallPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30">
            <Lock className="h-5 w-5 text-amber-700 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Subscription Required
          </h1>
        </div>

        <p className="mb-3 text-gray-700 dark:text-gray-300">
          Your account needs an active plan to continue using this feature.
        </p>
        {reason ? (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
            {reason}
          </p>
        ) : null}
        <p className="mb-8 text-gray-600 dark:text-gray-400">
          Choose a plan to unlock full access immediately. If you think this is a mistake, contact support.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push('/dashboard/billing/plans')}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-3 font-semibold text-white hover:bg-primary-700"
          >
            <CreditCard className="h-4 w-4" />
            View Plans
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
