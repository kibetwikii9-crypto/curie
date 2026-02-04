'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Download, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';

export default function InvoicesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: async () => {
      const response = await api.get('/api/billing/invoices?limit=50');
      return response.data;
    },
    enabled: isAuthenticated
  });

  const invoices = invoicesData?.invoices || [];

  const getStatusBadge = (status: string) => {
    const styles = {
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
      void: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-500',
      uncollectible: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };

    const icons = {
      paid: CheckCircle,
      open: Clock,
      draft: FileText,
      void: XCircle,
      uncollectible: XCircle
    };

    const Icon = icons[status as keyof typeof icons] || FileText;
    const style = styles[status as keyof typeof styles] || styles.draft;

    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${style}`}>
        <Icon className="h-3.5 w-3.5" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Invoice History</h1>
          <p className="text-gray-600 dark:text-gray-400">View and download all your invoices</p>
        </div>

        {/* Invoices Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {invoices.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Invoices Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your invoices will appear here once you subscribe to a plan
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                      Invoice
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                      Date
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                      Status
                    </th>
                    <th className="text-right py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                      Amount
                    </th>
                    <th className="text-right py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {invoices.map((invoice: any) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                            <FileText className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {invoice.invoice_number}
                            </p>
                            {invoice.due_date && invoice.status === 'open' && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Due {new Date(invoice.due_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          ${invoice.total.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                          {invoice.currency}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {invoice.pdf_url && (
                            <a
                              href={invoice.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              <Download className="h-3.5 w-3.5" />
                              PDF
                            </a>
                          )}
                          {invoice.status === 'open' && (
                            <button
                              onClick={async () => {
                                try {
                                  await api.post(`/api/billing/invoices/${invoice.id}/pay`);
                                  alert('Payment initiated!');
                                  window.location.reload();
                                } catch (error) {
                                  alert('Payment failed. Please try again.');
                                }
                              }}
                              className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                            >
                              Pay Now
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/dashboard/billing')}
            className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium transition-colors"
          >
            ← Back to Billing
          </button>
        </div>
      </div>
    </div>
  );
}
