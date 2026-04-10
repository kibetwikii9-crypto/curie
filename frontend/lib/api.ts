import axios from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.automifyyai.com';

// Fix for Render: if URL is missing protocol, add https://
const normalizedApiBaseUrl = (API_BASE_URL && !API_BASE_URL.startsWith('http://') && !API_BASE_URL.startsWith('https://'))
  ? `https://${API_BASE_URL}`
  : API_BASE_URL;

export const api = axios.create({
  baseURL: normalizedApiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function apiFetch(input: RequestInfo, init: RequestInit = {}) {
  const isBrowser = typeof window !== 'undefined'
  const url = typeof input === 'string' && input.startsWith('/api/')
    ? (process.env.NEXT_PUBLIC_API_URL || !isBrowser
        ? `${normalizedApiBaseUrl}${input}`
        : input)
    : input;

  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (isBrowser) {
    const token = localStorage.getItem('access_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return fetch(url, { ...init, headers });
}


// Add token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 errors - but not for login/register endpoints
// Those need to be handled by the component to show proper error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login on 401 if it's NOT from the login/register endpoints
    // (those should be handled by the component's error handling)
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                          error.config?.url?.includes('/auth/register');
    
    if (error.response?.status === 401 && !isAuthEndpoint) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        // Redirect to home page (not /login since that route doesn't exist)
        // The auth state will be cleared and user will see landing page
        window.location.href = '/';
      }
    }

    // Redirect to paywall when backend requires active subscription.
    if (
      error.response?.status === 402 &&
      error.response?.data?.code === 'SUBSCRIPTION_REQUIRED' &&
      typeof window !== 'undefined'
    ) {
      const currentPath = window.location.pathname;
      const isBillingPath = currentPath.startsWith('/dashboard/billing');
      const isPaywallPath = currentPath.startsWith('/dashboard/paywall');

      if (!isBillingPath && !isPaywallPath) {
        window.location.href = '/dashboard/paywall';
      }
    }

    return Promise.reject(error);
  }
);

