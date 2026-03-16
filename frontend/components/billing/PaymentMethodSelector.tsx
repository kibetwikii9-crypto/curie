'use client';

import { useState } from 'react';
import { CreditCard, Coins } from 'lucide-react';

interface PaymentMethodSelectorProps {
  selectedMethod: 'card' | 'crypto';
  onMethodChange: (method: 'card' | 'crypto') => void;
}

export default function PaymentMethodSelector({ selectedMethod, onMethodChange }: PaymentMethodSelectorProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Choose Payment Method
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Payment Option */}
        <button
          onClick={() => onMethodChange('card')}
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedMethod === 'card'
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              selectedMethod === 'card'
                ? 'bg-primary-100 dark:bg-primary-800'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              <CreditCard className={`h-6 w-6 ${
                selectedMethod === 'card'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`} />
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-gray-900 dark:text-white">Credit/Debit Card</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Visa, Mastercard, etc.</p>
            </div>
          </div>
        </button>

        {/* Crypto Payment Option */}
        <button
          onClick={() => onMethodChange('crypto')}
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedMethod === 'crypto'
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              selectedMethod === 'crypto'
                ? 'bg-orange-100 dark:bg-orange-800'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              <Coins className={`h-6 w-6 ${
                selectedMethod === 'crypto'
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`} />
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-gray-900 dark:text-white">Cryptocurrency</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">USDT, BTC, ETH via Binance</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}