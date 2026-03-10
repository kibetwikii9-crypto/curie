'use client';

import { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, CheckCircle2, Loader2, HelpCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface ConnectBinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ConnectBinanceModal({ isOpen, onClose, onSuccess }: ConnectBinanceModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [channelName, setChannelName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const keyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey('');
      setApiSecret('');
      setChannelName('');
      setError(null);
      setSuccess(false);
      setShowHelp(false);
      setTimeout(() => keyRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose]);

  const validateApiKey = (key: string) => {
    return key && key.trim().length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateApiKey(apiKey.trim())) {
      setError('API Key is required');
      keyRef.current?.focus();
      return;
    }

    if (!apiSecret.trim()) {
      setError('API Secret is required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/api/integrations/binance/connect', {
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
        channel_name: channelName?.trim() || undefined,
      });

      if (response.status === 200 || response.status === 201) {
        setSuccess(true);
        onSuccess();
        setTimeout(() => onClose(), 1200);
      } else {
        setError('Failed to connect Binance. Please check your credentials and try again.');
      }
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || 'Failed to connect Binance. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="binance-modal-title">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={!isLoading ? onClose : undefined} aria-hidden="true" />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full transform transition-all" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} disabled={isLoading} className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300" aria-label="Close modal">
            <X className="h-6 w-6" />
          </button>

          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-3xl">💱</div>
                <h2 id="binance-modal-title" className="text-2xl font-bold text-gray-900 dark:text-white">Connect Binance</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Connect your Binance account using API Key & Secret. We store secrets encrypted.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-400 text-green-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>Binance connected successfully! Closing...</span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Key</label>
                <input ref={keyRef} type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} disabled={isLoading} placeholder="Your Binance API Key" className="w-full px-4 py-2 border rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Secret</label>
                <input type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} disabled={isLoading} placeholder="Your Binance API Secret" className="w-full px-4 py-2 border rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Integration Name (optional)</label>
                <input type="text" value={channelName} onChange={(e) => setChannelName(e.target.value)} disabled={isLoading} placeholder="e.g., Binance - Trading" className="w-full px-4 py-2 border rounded-lg shadow-sm dark:bg-gray-700 dark:text-white" />
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400">
                <p>Recommended permissions: Enable <strong>Read</strong> (Account) permissions. Do not add withdraw permissions for security.</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={onClose} disabled={isLoading} className="flex-1 px-4 py-2 border rounded-lg text-sm bg-gray-100 dark:bg-gray-700">Cancel</button>
                <button type="submit" disabled={isLoading} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center justify-center gap-2">
                  {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Connecting...</> : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
