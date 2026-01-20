import axios from 'axios';

/**
 * SINGLE SOURCE OF TRUTH: API URL Configuration
 * 
 * This is the ONLY place where API URL normalization happens.
 * All other files should import `api` from this file.
 * 
 * Strategy:
 * 1. If NEXT_PUBLIC_API_URL is a full URL (starts with http:// or https://) → use it
 * 2. If it's just a service name (e.g., "automify-ai-backend") → construct Render URL
 * 3. If not set → use localhost for development
 */

function getApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  
  // Development fallback
  if (!raw || raw === 'http://localhost:8000') {
    return 'http://localhost:8000';
  }

  // Already a full URL - use as-is (remove trailing slashes)
  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/u, '');
  }

  // Protocol-relative URL (//example.com)
  if (/^\/\//.test(raw)) {
    return `https:${raw.replace(/\/+$/u, '')}`;
  }

  // Leading slash - treat as path on current host
  if (raw.startsWith('/')) {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.host}${raw.replace(/^\/+|\/+$/gu, '')}`;
    }
    return `https://${raw.replace(/^\/+/, '')}`;
  }

  // Service name or hostname without protocol
  // Render's fromService returns just the service name (e.g., "automify-ai-backend")
  // We need to construct the full URL
  
  // If it contains a dot, it's likely a full hostname
  if (raw.includes('.')) {
    return `https://${raw.replace(/\/+$/u, '')}`;
  }

  // Just a service name (no dots) - construct Render URL
  // Render URLs follow pattern: https://{service-name}.onrender.com
  // But actual URLs might be: https://{service-name}-{random}.onrender.com
  // We'll try the simple pattern first, and if that fails, the frontend will show an error
  
  // In browser: try to infer from current hostname
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    // If we're on Render, extract the pattern
    const renderMatch = currentHost.match(/^([^-]+)-[^-]+\.onrender\.com$/);
    if (renderMatch) {
      // Current host is like "automify-ai-frontend-xxxx.onrender.com"
      // Backend should be "automify-ai-backend-xxxx.onrender.com"
      // But we don't know the random suffix, so we'll use the service name pattern
      // This is a limitation - the user MUST set the full URL manually
      console.warn('⚠️ Cannot auto-detect backend URL suffix. Please set NEXT_PUBLIC_API_URL to full URL in Render dashboard.');
    }
  }

  // Fallback: construct simple Render URL (may not work if service has random suffix)
  // This is why manual setup is recommended
  return `https://${raw}.onrender.com`;
}

const API_BASE_URL = getApiUrl();

// Runtime validation and helpful error messages
if (typeof window !== 'undefined') {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  
  // Only log in development or if there's an issue
  if (!raw || raw === 'http://localhost:8000' || (!raw.includes('://') && !raw.includes('.'))) {
    console.group('🔧 API Configuration');
    console.log('Raw env value:', raw || '(not set)');
    console.log('Resolved URL:', API_BASE_URL);
    
    if (!raw || raw === 'http://localhost:8000') {
      console.warn('⚠️ Using localhost (development mode)');
      console.info('For production: Set NEXT_PUBLIC_API_URL in Render dashboard');
    } else if (!raw.includes('://')) {
      console.error('❌ NEXT_PUBLIC_API_URL is missing protocol (http:// or https://)');
      console.error('Current value:', raw);
      console.error('Expected format: https://automify-ai-backend-xxxx.onrender.com');
      console.info('Fix: Go to Render Dashboard → automify-ai-frontend → Environment → Set NEXT_PUBLIC_API_URL to full URL');
    }
    
    console.groupEnd();
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
      const raw = process.env.NEXT_PUBLIC_API_URL;
      
      console.group('❌ Network Error: Cannot connect to backend');
      console.error('Attempted URL:', API_BASE_URL);
      console.error('Raw env value:', raw || '(not set)');
      
      if (!raw || !raw.includes('://')) {
        console.error('');
        console.error('🔴 ROOT CAUSE: NEXT_PUBLIC_API_URL is not set correctly');
        console.error('');
        console.error('📋 FIX STEPS:');
        console.error('1. Go to Render Dashboard → automify-ai-backend service');
        console.error('2. Copy the full URL from Settings tab (e.g., https://automify-ai-backend-xxxx.onrender.com)');
        console.error('3. Go to automify-ai-frontend service → Environment tab');
        console.error('4. Add/Edit: NEXT_PUBLIC_API_URL = https://automify-ai-backend-xxxx.onrender.com');
        console.error('5. Save and wait for automatic redeploy');
        console.error('');
        console.error('⚠️ IMPORTANT: The URL must include https:// and the full domain');
      } else {
        console.error('Possible causes:');
        console.error('1. Backend service is not running');
        console.error('2. Frontend needs rebuild after env var change');
        console.error('3. CORS or network firewall issue');
      }
      
      console.groupEnd();
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

