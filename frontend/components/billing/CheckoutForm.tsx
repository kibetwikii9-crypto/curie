'use client';

import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface CheckoutFormProps {
  planName: string;
  amount: number;
  billingCycle: 'monthly' | 'annual';
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function CheckoutForm({ 
  planName, 
  amount, 
  billingCycle,
  onSuccess,
  onError 
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/billing?success=true`,
        },
      });

      if (error) {
        setErrorMessage(error.message || 'An error occurred during payment.');
        onError?.(error.message || 'Payment failed');
      } else {
        setSuccessMessage('Payment successful! Redirecting...');
        onSuccess?.();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
      onError?.(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Element */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Payment Details
        </h3>
        <PaymentElement 
          options={{
            layout: 'tabs',
            style: {
              base: {
                fontSize: '16px',
                color: '#1f2937',
                '::placeholder': {
                  color: '#9ca3af',
                },
              },
              invalid: {
                color: '#ef4444',
              },
            },
          }}
        />
      </div>

      {/* Order Summary */}
      <div className="bg-gradient-to-br from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-primary-200 dark:border-primary-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Order Summary
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 dark:text-gray-300">Plan</span>
            <span className="font-semibold text-gray-900 dark:text-white">{planName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700 dark:text-gray-300">Billing Cycle</span>
            <span className="font-semibold text-gray-900 dark:text-white capitalize">{billingCycle}</span>
          </div>
          {billingCycle === 'annual' && (
            <div className="flex justify-between items-center text-green-600 dark:text-green-400">
              <span className="text-sm">Annual Discount (20%)</span>
              <span className="text-sm font-semibold">-${(amount * 0.2).toFixed(2)}</span>
            </div>
          )}
          <div className="pt-3 border-t border-gray-300 dark:border-gray-600">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                ${amount.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Billed {billingCycle === 'monthly' ? 'monthly' : 'annually'}
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900 dark:text-red-200">Payment Failed</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900 dark:text-green-200">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:from-primary-700 hover:to-purple-700 transition-all hover:scale-105 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CheckCircle className="h-5 w-5" />
            Subscribe to {planName}
          </>
        )}
      </button>

      {/* Security Notice */}
      <p className="text-center text-xs text-gray-600 dark:text-gray-400">
        🔒 Secured by Stripe. Your payment information is encrypted and secure.
      </p>
    </form>
  );
}
