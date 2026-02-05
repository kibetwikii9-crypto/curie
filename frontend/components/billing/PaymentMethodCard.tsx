'use client';

import { CreditCard, Check, Trash2, MoreVertical } from 'lucide-react';
import { useState } from 'react';

interface PaymentMethodCardProps {
  paymentMethod: {
    id: number;
    card_brand: string;
    card_last4: string;
    card_exp_month: number;
    card_exp_year: number;
    is_default: boolean;
  };
  onSetDefault: (id: number) => void;
  onDelete: (id: number) => void;
  isProcessing?: boolean;
}

export default function PaymentMethodCard({
  paymentMethod,
  onSetDefault,
  onDelete,
  isProcessing = false
}: PaymentMethodCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getBrandIcon = (brand: string) => {
    const brandLower = brand.toLowerCase();
    
    // Card brand colors
    const colors = {
      visa: 'from-blue-600 to-blue-700',
      mastercard: 'from-orange-600 to-red-600',
      amex: 'from-blue-500 to-cyan-500',
      discover: 'from-orange-500 to-orange-600',
      default: 'from-gray-600 to-gray-700'
    };

    return colors[brandLower as keyof typeof colors] || colors.default;
  };

  const formatExpiry = () => {
    return `${String(paymentMethod.card_exp_month).padStart(2, '0')}/${String(paymentMethod.card_exp_year).slice(-2)}`;
  };

  const isExpired = () => {
    const now = new Date();
    const expiry = new Date(paymentMethod.card_exp_year, paymentMethod.card_exp_month - 1);
    return expiry < now;
  };

  return (
    <div className={`relative bg-gradient-to-br ${getBrandIcon(paymentMethod.card_brand)} rounded-xl p-6 text-white shadow-xl hover:shadow-2xl transition-all ${
      isProcessing ? 'opacity-50 pointer-events-none' : ''
    }`}>
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium opacity-90 capitalize">{paymentMethod.card_brand}</p>
              {isExpired() && (
                <p className="text-xs text-red-200 font-semibold">Expired</p>
              )}
            </div>
          </div>
          
          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-20">
                {!paymentMethod.is_default && (
                  <button
                    onClick={() => {
                      onSetDefault(paymentMethod.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Set as Default
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to remove this payment method?')) {
                      onDelete(paymentMethod.id);
                    }
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove Card
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card Number */}
        <div className="mb-6">
          <p className="text-2xl font-mono tracking-wider">
            •••• •••• •••• {paymentMethod.card_last4}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs opacity-70 mb-1">Expires</p>
            <p className="text-sm font-semibold">{formatExpiry()}</p>
          </div>
          
          {paymentMethod.is_default && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg">
              <Check className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">Default</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
