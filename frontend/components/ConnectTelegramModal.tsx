'use client';

import { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, CheckCircle2, Loader2, ExternalLink, HelpCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface ConnectTelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ConnectTelegramModal({ isOpen, onClose, onSuccess }: ConnectTelegramModalProps) {
  const [botToken, setBotToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setBotToken('');
      setError(null);
      setSuccess(false);
      setIsLoading(false);
      setShowHelp(false);
      // Focus input after a short delay
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose]);

  // Validate token format (basic check)
  const validateToken = (token: string): boolean => {
    if (!token || token.trim().length < 20) {
      return false;
    }
    // Telegram bot tokens typically follow pattern: numbers:letters
    return /^\d+:[A-Za-z0-9_-]+$/.test(token.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate token
    if (!botToken.trim()) {
      setError('Bot token is required');
      inputRef.current?.focus();
      return;
    }

    if (!validateToken(botToken.trim())) {
      setError('Invalid bot token format. Please check your token and try again.');
      inputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await api.post('/api/integrations/telegram/connect', {
        bot_token: botToken.trim(),
      });

      if (response.status === 200 || response.status === 201) {
        // Show success message
        setSuccess(true);
        setError(null);
        
        // Refresh integrations list
        onSuccess();
        
        // Close modal after a short delay to show success message
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError('Failed to connect Telegram bot. Please try again.');
        inputRef.current?.focus();
      }
    } catch (err: any) {
      // Handle 401/403 errors specifically
      if (err.response?.status === 401) {
        setError('Your session has expired. Please sign in again.');
        // Don't close modal on auth error - let user see the error
      } else if (err.response?.status === 403) {
        setError('You do not have permission to connect integrations. Only Admin and Business Owner roles can connect channels.');
      } else {
        const errorMessage = err.response?.data?.detail || err.message || 'Failed to connect Telegram bot. Please try again.';
        setError(errorMessage);
      }
      inputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBotToken(e.target.value);
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="telegram-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={!isLoading ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-3xl">✈️</div>
                <h2 id="telegram-modal-title" className="text-2xl font-bold text-gray-900 dark:text-white">
                  Connect your Telegram Bot
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Follow the steps below to connect your Telegram bot to Automify
              </p>
            </div>

            {/* Step-by-step Instructions */}
            <div className="mb-6 space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#007FFF] text-white flex items-center justify-center font-semibold text-sm">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Create or select a Telegram Bot
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Open Telegram and search for{' '}
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#007FFF] hover:text-[#0066CC] dark:hover:text-[#0066CC] font-medium inline-flex items-center gap-1"
                    >
                      @BotFather
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#007FFF] text-white flex items-center justify-center font-semibold text-sm">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Get your Bot Token
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Send <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">/newbot</code> or{' '}
                    <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">/token</code> to BotFather
                    and copy the token
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#007FFF] text-white flex items-center justify-center font-semibold text-sm">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Paste Bot Token below
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Paste your bot token in the field below and click Connect
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Success Message */}
              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>Telegram bot connected successfully! The modal will close shortly...</span>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Bot Token Input */}
              <div>
                <label htmlFor="bot-token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bot Token
                  <button
                    type="button"
                    onClick={() => setShowHelp(!showHelp)}
                    className="ml-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    aria-label="Show help"
                  >
                    <HelpCircle className="h-4 w-4 inline" />
                  </button>
                </label>
                {showHelp && (
                  <div className="mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                    <p className="font-medium mb-1">Where to find your Bot Token:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Open Telegram and search for @BotFather</li>
                      <li>Send <code className="px-1 bg-blue-100 dark:bg-blue-900/40 rounded">/token</code></li>
                      <li>Select your bot from the list</li>
                      <li>Copy the token (format: numbers:letters)</li>
                    </ol>
                  </div>
                )}
                <input
                  id="bot-token"
                  ref={inputRef}
                  type="password"
                  value={botToken}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:ring-[#007FFF] focus:border-[#007FFF] dark:bg-gray-700 dark:text-white dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed ${
                    error ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'bot-token-error' : undefined}
                />
                {error && (
                  <p id="bot-token-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !botToken.trim()}
                  className="flex-1 px-4 py-2 bg-[#007FFF] hover:bg-[#0066CC] text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#007FFF]/20 hover:shadow-xl hover:shadow-[#007FFF]/30 focus:outline-none focus:ring-2 focus:ring-[#007FFF] focus:ring-offset-2 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
