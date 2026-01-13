'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { X } from 'lucide-react';
import Image from 'next/image';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'signin' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialTab = 'signin' }: AuthModalProps) {
  const router = useRouter();
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  
  // Sign In state
  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
  });
  const [signInErrors, setSignInErrors] = useState<Record<string, string>>({});
  const [signInRemember, setSignInRemember] = useState(false);
  
  // Sign Up state
  const [signUpData, setSignUpData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [signUpErrors, setSignUpErrors] = useState<Record<string, string>>({});
  const [signUpTerms, setSignUpTerms] = useState(false);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus first input when modal opens
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = '';
      // Reset form data when closing
      setSignInData({ email: '', password: '' });
      setSignUpData({ fullName: '', email: '', password: '', confirmPassword: '' });
      setSignInErrors({});
      setSignUpErrors({});
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    // Update active tab when initialTab changes
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Validation helpers
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  // Sign In handlers
  const handleSignInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignInData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (signInErrors[name]) {
      setSignInErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    // Validation
    if (!signInData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(signInData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!signInData.password) {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      setSignInErrors(errors);
      return;
    }

    setIsLoading(true);
    setSignInErrors({});

    try {
      await login(signInData.email, signInData.password);
      onClose();
      router.push('/dashboard');
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.detail || 'Login failed. Please check your credentials and try again.';
      setSignInErrors({ submit: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up handlers
  const handleSignUpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignUpData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (signUpErrors[name]) {
      setSignUpErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    // Validation
    if (!signUpData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (!signUpData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(signUpData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!signUpData.password) {
      errors.password = 'Password is required';
    } else {
      const passwordError = validatePassword(signUpData.password);
      if (passwordError) {
        errors.password = passwordError;
      }
    }

    if (!signUpData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (signUpData.password !== signUpData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!signUpTerms) {
      errors.terms = 'You must agree to the Terms of Service and Privacy Policy';
    }

    if (Object.keys(errors).length > 0) {
      setSignUpErrors(errors);
      return;
    }

    setIsLoading(true);
    setSignUpErrors({});

    try {
      // Call the register API endpoint
      // Backend will auto-create Business and assign business_owner role
      const { api } = await import('@/lib/api');
      const response = await api.post('/api/auth/register', {
        email: signUpData.email,
        password: signUpData.password,
        full_name: signUpData.fullName,
        // role is optional - backend will auto-assign business_owner and create Business
      });

      // Show success message and switch to sign in tab
      setSignUpErrors({ submit: 'Account created successfully! Please sign in with your credentials.' });
      
      // Pre-fill email in sign-in form
      setSignInData({ email: signUpData.email, password: '' });
      
      // Clear sign-up form
      setSignUpData({ fullName: '', email: '', password: '', confirmPassword: '' });
      setSignUpTerms(false);
      
      // Switch to sign-in tab after a short delay
      setTimeout(() => {
        setActiveTab('signin');
        setSignUpErrors({});
        // Focus on password field in sign-in
        setTimeout(() => {
          const passwordInput = document.getElementById('signin-password');
          passwordInput?.focus();
        }, 100);
      }, 2000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Sign up failed. Please try again.';
      setSignUpErrors({ submit: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm backdrop-enter"
        onClick={(e) => {
          // Only close if not loading and no errors are showing
          if (!isLoading && !signInErrors.submit && !signUpErrors.submit) {
            onClose();
          }
        }}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full modal-enter"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={() => {
              // Only allow closing if not loading
              if (!isLoading) {
                onClose();
              }
            }}
            disabled={isLoading}
            className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-[#007FFF] rounded-lg p-1 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Logo */}
          <div className="flex justify-center pt-6 pb-4">
            <Image
              src="/logo-main-no-tagline.png"
              alt="Automify"
              width={200}
              height={66}
              className="h-16 w-auto dark:hidden"
              priority
            />
            <Image
              src="/logo-white-no-tagline.png"
              alt="Automify"
              width={200}
              height={66}
              className="h-16 w-auto hidden dark:block"
              priority
            />
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700" role="tablist" aria-label="Authentication tabs">
            <button
              id="signin-tab"
              onClick={() => {
                setActiveTab('signin');
                setSignInErrors({});
              }}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#007FFF] ${
                activeTab === 'signin'
                  ? 'text-[#007FFF] border-b-2 border-[#007FFF]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              aria-selected={activeTab === 'signin'}
              aria-controls="signin-panel"
              role="tab"
            >
              Sign In
            </button>
            <button
              id="signup-tab"
              onClick={() => {
                setActiveTab('signup');
                setSignUpErrors({});
              }}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#007FFF] ${
                activeTab === 'signup'
                  ? 'text-[#007FFF] border-b-2 border-[#007FFF]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              aria-selected={activeTab === 'signup'}
              aria-controls="signup-panel"
              role="tab"
            >
              Sign Up
            </button>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* Sign In Tab */}
            {activeTab === 'signin' && (
              <div id="signin-panel" role="tabpanel" aria-labelledby="signin-tab">
                <div className="mb-6">
                  <h2 id="auth-modal-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Welcome Back
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Sign in to your account to continue.
                  </p>
                </div>

                <form onSubmit={handleSignInSubmit} className="space-y-4" noValidate>
                  {signInErrors.submit && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm font-medium flex items-start gap-2">
                      <span className="flex-shrink-0 mt-0.5">⚠️</span>
                      <span>{signInErrors.submit}</span>
                    </div>
                  )}

                  <div>
                    <label htmlFor="signin-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      ref={activeTab === 'signin' ? firstInputRef : undefined}
                      id="signin-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={signInData.email}
                      onChange={handleSignInChange}
                      className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007FFF] focus:border-transparent transition-all ${
                        signInErrors.email
                          ? 'border-red-300 dark:border-red-700'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="you@example.com"
                      aria-invalid={!!signInErrors.email}
                      aria-describedby={signInErrors.email ? 'signin-email-error' : undefined}
                    />
                    {signInErrors.email && (
                      <p id="signin-email-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                        {signInErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="signin-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password
                    </label>
                    <input
                      id="signin-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={signInData.password}
                      onChange={handleSignInChange}
                      className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007FFF] focus:border-transparent transition-all ${
                        signInErrors.password
                          ? 'border-red-300 dark:border-red-700'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="••••••••"
                      aria-invalid={!!signInErrors.password}
                      aria-describedby={signInErrors.password ? 'signin-password-error' : undefined}
                    />
                    {signInErrors.password && (
                      <p id="signin-password-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                        {signInErrors.password}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="signin-remember"
                        name="remember"
                        type="checkbox"
                        checked={signInRemember}
                        onChange={(e) => setSignInRemember(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-[#007FFF] focus:ring-[#007FFF]"
                      />
                      <label htmlFor="signin-remember" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Remember me
                      </label>
                    </div>
                    <a
                      href="#"
                      className="text-sm text-[#007FFF] hover:text-[#0066CC] transition-colors focus:outline-none focus:ring-2 focus:ring-[#007FFF] rounded"
                      onClick={(e) => {
                        e.preventDefault();
                        // TODO: Implement forgot password flow
                      }}
                    >
                      Forgot password?
                    </a>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-[#007FFF] hover:bg-[#0066CC] text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#007FFF]/20 hover:shadow-xl hover:shadow-[#007FFF]/30 focus:outline-none focus:ring-2 focus:ring-[#007FFF] focus:ring-offset-2"
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              </div>
            )}

            {/* Sign Up Tab */}
            {activeTab === 'signup' && (
              <div id="signup-panel" role="tabpanel" aria-labelledby="signup-tab">
                <div className="mb-6">
                  <h2 id="auth-modal-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Create Account
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Get started with Automify today. Free trial available.
                  </p>
                </div>

                <form onSubmit={handleSignUpSubmit} className="space-y-4" noValidate>
                  {signUpErrors.submit && (
                    <div className={`px-4 py-3 rounded-lg text-sm font-medium flex items-start gap-2 ${
                      signUpErrors.submit.includes('successfully')
                        ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                    }`}>
                      <span className="flex-shrink-0 mt-0.5">
                        {signUpErrors.submit.includes('successfully') ? '✓' : '⚠️'}
                      </span>
                      <span>{signUpErrors.submit}</span>
                    </div>
                  )}

                  <div>
                    <label htmlFor="signup-fullname" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name
                    </label>
                    <input
                      ref={activeTab === 'signup' ? firstInputRef : undefined}
                      id="signup-fullname"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      required
                      value={signUpData.fullName}
                      onChange={handleSignUpChange}
                      className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007FFF] focus:border-transparent transition-all ${
                        signUpErrors.fullName
                          ? 'border-red-300 dark:border-red-700'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="John Doe"
                      aria-invalid={!!signUpErrors.fullName}
                      aria-describedby={signUpErrors.fullName ? 'signup-fullname-error' : undefined}
                    />
                    {signUpErrors.fullName && (
                      <p id="signup-fullname-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                        {signUpErrors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      id="signup-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={signUpData.email}
                      onChange={handleSignUpChange}
                      className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007FFF] focus:border-transparent transition-all ${
                        signUpErrors.email
                          ? 'border-red-300 dark:border-red-700'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="you@example.com"
                      aria-invalid={!!signUpErrors.email}
                      aria-describedby={signUpErrors.email ? 'signup-email-error' : undefined}
                    />
                    {signUpErrors.email && (
                      <p id="signup-email-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                        {signUpErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password
                    </label>
                    <input
                      id="signup-password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={signUpData.password}
                      onChange={handleSignUpChange}
                      className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007FFF] focus:border-transparent transition-all ${
                        signUpErrors.password
                          ? 'border-red-300 dark:border-red-700'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="••••••••"
                      aria-invalid={!!signUpErrors.password}
                      aria-describedby={signUpErrors.password ? 'signup-password-error' : undefined}
                    />
                    {signUpErrors.password && (
                      <p id="signup-password-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                        {signUpErrors.password}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Must be at least 8 characters with uppercase, lowercase, and number
                    </p>
                  </div>

                  <div>
                    <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirm Password
                    </label>
                    <input
                      id="signup-confirm-password"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={signUpData.confirmPassword}
                      onChange={handleSignUpChange}
                      className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007FFF] focus:border-transparent transition-all ${
                        signUpErrors.confirmPassword
                          ? 'border-red-300 dark:border-red-700'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="••••••••"
                      aria-invalid={!!signUpErrors.confirmPassword}
                      aria-describedby={signUpErrors.confirmPassword ? 'signup-confirm-password-error' : undefined}
                    />
                    {signUpErrors.confirmPassword && (
                      <p id="signup-confirm-password-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                        {signUpErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-start">
                      <input
                        id="signup-terms"
                        name="terms"
                        type="checkbox"
                        required
                        checked={signUpTerms}
                        onChange={(e) => setSignUpTerms(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-[#007FFF] focus:ring-[#007FFF] mt-0.5"
                        aria-invalid={!!signUpErrors.terms}
                        aria-describedby={signUpErrors.terms ? 'signup-terms-error' : undefined}
                      />
                      <label htmlFor="signup-terms" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        I agree to the{' '}
                        <a href="#" className="text-[#007FFF] hover:text-[#0066CC] transition-colors focus:outline-none focus:ring-2 focus:ring-[#007FFF] rounded">
                          Terms of Service
                        </a>
                        {' '}and{' '}
                        <a href="#" className="text-[#007FFF] hover:text-[#0066CC] transition-colors focus:outline-none focus:ring-2 focus:ring-[#007FFF] rounded">
                          Privacy Policy
                        </a>
                      </label>
                    </div>
                    {signUpErrors.terms && (
                      <p id="signup-terms-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                        {signUpErrors.terms}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-[#007FFF] hover:bg-[#0066CC] text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#007FFF]/20 hover:shadow-xl hover:shadow-[#007FFF]/30 focus:outline-none focus:ring-2 focus:ring-[#007FFF] focus:ring-offset-2"
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

