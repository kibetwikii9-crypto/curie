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

  // Bare hostname (e.g. automify-ai-backend.onrender.com or just automify-ai-backend)
  // Render's fromService with property:host returns hostname without protocol
  if (/^[\w.-]+(\.[\w.-]+)*$/.test(raw)) {
    // If it contains a dot, it's likely a full hostname (e.g., automify-ai-backend.onrender.com)
    // If no dot, it might be just the service name (e.g., automify-ai-backend)
    // For Render, we assume https://
    return `https://${raw.replace(/\/+$/u, '')}`;
  }

  // Fallback: return without trailing slashes
  return raw.replace(/\/+$/u, '');
}

const API_BASE_URL = normalizeApiUrl(rawApiUrl);

// Debug: Log the API URL being used (remove after debugging)
if (typeof window !== 'undefined') {
  console.log('🔍 API Configuration Debug:');
  console.log('  Raw API URL from env:', rawApiUrl || '(not set)');
  console.log('  Normalized API Base URL:', API_BASE_URL);
  
  // Warn if URL looks wrong
  if (!rawApiUrl || rawApiUrl === 'http://localhost:8000') {
    console.warn('⚠️ NEXT_PUBLIC_API_URL is not set or using localhost default!');
    console.warn('   This will fail on Render. Set it in Render dashboard environment variables.');
  }
  
  if (rawApiUrl && !rawApiUrl.includes('://') && !rawApiUrl.includes('.')) {
    console.error('❌ ERROR: NEXT_PUBLIC_API_URL appears to be just a service name!');
    console.error('   Current value:', rawApiUrl);
    console.error('   Expected format: https://automify-ai-backend-xxxx.onrender.com');
    console.error('   Fix: Set NEXT_PUBLIC_API_URL in Render dashboard to the full backend URL');
  }
}

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

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors (like ERR_NAME_NOT_RESOLVED)
    if (error.code === 'ERR_NETWORK' || error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
      console.error('❌ Network Error: Cannot connect to backend API');
      console.error('   API URL:', API_BASE_URL);
      console.error('   This usually means:');
      console.error('   1. NEXT_PUBLIC_API_URL is not set correctly in Render');
      console.error('   2. Frontend needs to be rebuilt after setting env var');
      console.error('   3. Backend service is not running');
      console.error('   Fix: Check Render dashboard → automify-ai-frontend → Environment tab');
    }
    
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

