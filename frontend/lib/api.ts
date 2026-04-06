import axios from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const isBrowser = typeof window !== 'undefined'
  const url = typeof input === 'string' && input.startsWith('/api/')
    ? (process.env.NEXT_PUBLIC_API_URL || !isBrowser
        ? `${normalizedApiBaseUrl}${input}`
        : input)
    : input;

  return fetch(url, init);
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
    return Promise.reject(error);
  }
);

