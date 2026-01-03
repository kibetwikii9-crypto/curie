import axios from 'axios';

// Normalize NEXT_PUBLIC_API_URL so accidental relative values (like
// "/automify-ai-backend" or bare hostnames) don't produce requests
// that target the frontend host and produce 404s. This will also
// remove trailing slashes.
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function normalizeApiUrl(raw: string): string {
  if (!raw) return 'http://localhost:8000';

  // Already an absolute URL (http:// or https://) or protocol-relative //
  if (/^https?:\/\//i.test(raw) || /^\/\//.test(raw)) {
    return raw.replace(/\/+$/u, '');
  }

  // Leading slash: treat as path on current frontend host -> convert to full URL
  if (raw.startsWith('/')) {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.host}${raw.replace(/^\/+|\/+$/gu, '')}`;
    }
    // At build-time / server-side, assume https for safety
    return `https://${raw.replace(/^\/+/, '')}`;
  }

  // Bare hostname (e.g. automify-ai-backend or backend.example.com)
  if (/^[\w.-]+$/.test(raw)) {
    return `https://${raw.replace(/\/+$/u, '')}`;
  }

  // Fallback: return without trailing slashes
  return raw.replace(/\/+$/u, '');
}

const API_BASE_URL = normalizeApiUrl(rawApiUrl);

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

