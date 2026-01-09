'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { X } from 'lucide-react';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignUp?: () => void;
}

export default function SignInModal({ isOpen, onClose, onSwitchToSignUp }: SignInModalProps) {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setEmail('');
      setPassword('');
      setError('');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      onClose();
      router.push('/dashboard');
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.detail || 'Login failed. Please check your credentials and try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8 transform transition-all">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Sign In
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Welcome back! Sign in to your account.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007FFF] focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007FFF] focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-[#007FFF] focus:ring-[#007FFF]"
                />
                <label htmlFor="remember" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Remember me
                </label>
              </div>
              <a href="#" className="text-sm text-[#007FFF] hover:text-[#0066CC]">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-[#007FFF] hover:bg-[#0066CC] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#007FFF]/20"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <button
                onClick={() => {
                  onClose();
                  onSwitchToSignUp?.();
                }}
                className="text-[#007FFF] hover:text-[#0066CC] font-semibold"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

