import axios from 'axios';

const normalizeApiUrl = (rawUrl: string) => {
  let url = rawUrl?.trim() || 'https://www.automifyyai.com';

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    // If the API URL includes a trailing /api path, remove it so requests like
    // api.get('/api/...') do not become /api/api/...
    if (parsed.pathname.endsWith('/api')) {
      parsed.pathname = parsed.pathname.replace(/\/api\/?$/, '');
    }
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return url.replace(/\/+$/, '').replace(/\/api$/, '');
  }
};

export const API_BASE_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL || 'https://www.automifyyai.com');

const normalizedApiBaseUrl = API_BASE_URL;

export const api = axios.create({
  baseURL: normalizedApiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

const redirectToPaywall = (message?: string) => {
  if (typeof window === 'undefined') return;
  const redirectFlag = '__subscriptionRedirectInProgress__';
  const win = window as typeof window & { [key: string]: boolean };
  if (win[redirectFlag]) return;
  const currentPath = window.location.pathname;
  const isBillingPath = currentPath.startsWith('/dashboard/billing');
  const isPaywallPath = currentPath.startsWith('/dashboard/paywall');
  if (isBillingPath || isPaywallPath) return;
  win[redirectFlag] = true;

  const banner = document.createElement('div');
  banner.textContent = 'Your free plan ended, redirecting to plans...';
  banner.style.position = 'fixed';
  banner.style.top = '24px';
  banner.style.left = '50%';
  banner.style.transform = 'translateX(-50%)';
  banner.style.zIndex = '99999';
  banner.style.background = '#1f2937';
  banner.style.color = '#ffffff';
  banner.style.padding = '12px 18px';
  banner.style.borderRadius = '10px';
  banner.style.fontSize = '14px';
  banner.style.fontWeight = '600';
  banner.style.boxShadow = '0 12px 24px rgba(0,0,0,0.22)';
  banner.style.maxWidth = '420px';
  banner.style.width = 'calc(100% - 32px)';
  banner.style.textAlign = 'center';
  document.body.appendChild(banner);

  const params = new URLSearchParams();
  if (message) {
    params.set('reason', message);
  }
  const query = params.toString();
  window.setTimeout(() => {
    window.location.href = query ? `/dashboard/paywall?${query}` : '/dashboard/paywall';
  }, 900);
};

export async function apiFetch(input: RequestInfo, init: RequestInit = {}) {
  const isBrowser = typeof window !== 'undefined'
  const url = typeof input === 'string' && input.startsWith('/api/')
    ? (normalizedApiBaseUrl ? `${normalizedApiBaseUrl}${input}` : input)
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

  const response = await fetch(url, { ...init, headers });

  // Mirror axios behavior for subscription-gated endpoints used with apiFetch.
  if (
    isBrowser &&
    response.status === 402
  ) {
    try {
      const payload = await response.clone().json();
      if (payload?.code === 'SUBSCRIPTION_REQUIRED') {
        redirectToPaywall(payload?.detail);
      }
    } catch {
      // Keep original response behavior if payload is not JSON.
    }
  }

  return response;
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
      redirectToPaywall(error.response?.data?.detail);
    }

    return Promise.reject(error);
  }
);

