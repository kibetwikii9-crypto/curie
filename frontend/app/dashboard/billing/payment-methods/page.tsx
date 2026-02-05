'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PaymentMethodCard from '@/components/billing/PaymentMethodCard';
import { Plus, CreditCard, AlertCircle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function AddCardForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Failed to add card');
        setIsProcessing(false);
        return;
      }

      const { error: confirmError } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/billing/payment-methods?success=true`,
        },
      });

      if (confirmError) {
        setError(confirmError.message || 'Failed to add card');
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Card Details
        </h3>
        <PaymentElement />
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {isProcessing ? 'Adding...' : 'Add Card'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function PaymentMethodsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAddCard, setShowAddCard] = useState(false);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch payment methods
  const { data: paymentMethods, isLoading } = useQuery({
    queryKey: ['billing', 'payment-methods'],
    queryFn: async () => {
      const response = await api.get('/api/billing/payment-methods');
      return response.data;
    },
    enabled: isAuthenticated
  });

  // Set default mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (paymentMethodId: number) => {
      await api.post(`/api/billing/payment-methods/${paymentMethodId}/default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'payment-methods'] });
    },
    onError: () => {
      alert('Failed to set default payment method');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (paymentMethodId: number) => {
      await api.delete(`/api/billing/payment-methods/${paymentMethodId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'payment-methods'] });
    },
    onError: () => {
      alert('Failed to remove payment method');
    }
  });

  // Create setup intent for adding card
  const handleAddCard = async () => {
    try {
      const response = await api.post('/api/billing/payment-methods/setup');
      setSetupSecret(response.data.client_secret);
      setShowAddCard(true);
    } catch (error) {
      alert('Failed to initialize card setup');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  const methods = paymentMethods || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Payment Methods</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your credit cards and payment options</p>
        </div>

        {/* Add Card Modal */}
        {showAddCard && setupSecret && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-8 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Add Payment Method
              </h2>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: setupSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#6366f1',
                    },
                  },
                }}
              >
                <AddCardForm
                  onSuccess={() => {
                    setShowAddCard(false);
                    setSetupSecret(null);
                    queryClient.invalidateQueries({ queryKey: ['billing', 'payment-methods'] });
                  }}
                  onCancel={() => {
                    setShowAddCard(false);
                    setSetupSecret(null);
                  }}
                />
              </Elements>
            </div>
          </div>
        )}

        {/* Cards Grid */}
        {methods.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <CreditCard className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                No Payment Methods Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Add a payment method to subscribe to a plan and unlock all features
              </p>
              <button
                onClick={handleAddCard}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-lg font-semibold hover:from-primary-700 hover:to-purple-700 transition-all hover:scale-105 shadow-lg"
              >
                <Plus className="h-5 w-5" />
                Add Your First Card
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Add Card Button */}
            <div className="mb-6 flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {methods.length} payment method{methods.length !== 1 ? 's' : ''} saved
              </p>
              <button
                onClick={handleAddCard}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Card
              </button>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {methods.map((method: any) => (
                <PaymentMethodCard
                  key={method.id}
                  paymentMethod={method}
                  onSetDefault={(id) => setDefaultMutation.mutate(id)}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  isProcessing={setDefaultMutation.isPending || deleteMutation.isPending}
                />
              ))}
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-6 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                    Your cards are secure
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    All payment information is encrypted and securely stored by Stripe. 
                    We never see or store your full card details.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

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
