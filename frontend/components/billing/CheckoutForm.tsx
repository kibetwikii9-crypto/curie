'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface CheckoutFormProps {
  planName: string;
  amount: number;
  billingCycle: 'monthly' | 'annual';
  checkoutData?: any;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function CheckoutForm({ 
  planName, 
  amount, 
  billingCycle,
  checkoutData,
  onSuccess,
  onError 
}: CheckoutFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cryptoPaymentStatus, setCryptoPaymentStatus] = useState<'pending' | 'completed' | 'failed'>('pending');

  const isCryptoPayment = checkoutData?.payment_method === 'crypto';
  const authorizationUrl = checkoutData?.authorization_url;

  const handleCardPayment = () => {
    if (!authorizationUrl) {
      setErrorMessage('Payment initialization failed. Please try again.');
      onError?.('No authorization URL');
      return;
    }

    setIsProcessing(true);
    
    // Redirect to Paystack payment page
    window.location.href = authorizationUrl;
  };

  const handleCryptoPayment = () => {
    // For crypto payments, we just show the QR code and wait for webhook
    // The backend will handle the subscription creation automatically
    setCryptoPaymentStatus('pending');
  };

  // Poll for crypto payment completion
  useEffect(() => {
    if (!isCryptoPayment || cryptoPaymentStatus !== 'pending') return;

    const pollInterval = setInterval(async () => {
      try {
        // Check if subscription was created
        const response = await api.get('/billing/subscription');
        const data = response.data;
        
        if (data.subscription && data.subscription.status === 'active') {
          setCryptoPaymentStatus('completed');
          onSuccess?.();
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
      }
    }, 5000); // Check every 5 seconds

    // Stop polling after 10 minutes
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      setCryptoPaymentStatus('failed');
      setErrorMessage('Payment timeout. Please try again or contact support.');
      onError?.('Payment timeout');
    }, 600000); // 10 minutes

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [isCryptoPayment, cryptoPaymentStatus, onSuccess, onError]);

  return (
    <div className="space-y-6">
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

      {/* Crypto Payment QR Code */}
      {isCryptoPayment && checkoutData && (
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg p-6 border border-orange-200 dark:border-orange-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
            Complete Payment with Crypto
          </h3>
          
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Scan the QR code below with your Binance app to complete the payment
            </p>
            
            {checkoutData.qr_code && (
              <div className="inline-block p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                <img 
                  src={checkoutData.qr_code} 
                  alt="Crypto Payment QR Code" 
                  className="w-48 h-48 mx-auto"
                />
              </div>
            )}
            
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium">Amount: {checkoutData.amount} {checkoutData.currency}</p>
              <p className="text-xs mt-1">Payment will be processed automatically once confirmed</p>
            </div>
          </div>

          {/* Payment Status */}
          <div className="text-center">
            {cryptoPaymentStatus === 'pending' && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Waiting for payment confirmation...</span>
              </div>
            )}
            
            {cryptoPaymentStatus === 'completed' && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-lg">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Payment completed! Setting up your subscription...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Card Payment Button */}
      {!isCryptoPayment && (
        <button
          type="button"
          onClick={handleCardPayment}
          disabled={!authorizationUrl || isProcessing}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:from-primary-700 hover:to-purple-700 transition-all hover:scale-105 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Redirecting to payment...
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5" />
              Proceed to Payment
            </>
          )}
        </button>
      )}

      {/* Security Notice */}
      <p className="text-center text-xs text-gray-600 dark:text-gray-400">
        {isCryptoPayment ? (
          <>🔒 Secured by Binance Pay. Your crypto transactions are secure and private.</>
        ) : (
          <>🔒 Secured by Paystack. Your payment information is encrypted and secure.</>
        )}
      </p>
    </div>
  );
}
