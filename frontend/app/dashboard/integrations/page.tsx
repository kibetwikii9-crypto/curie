'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Image from 'next/image';
import {
  Plug,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Settings,
  XCircle,
  Zap,
  Shield,
  Activity,
  TrendingUp,
  BarChart3,
  Globe,
  Webhook,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Sparkles,
  Check,
  X,
  MessageSquare,
  Clock,
  Link as LinkIcon,
  Code,
  Terminal,
  Server,
  Play,
  Pause,
  Grid3x3,
  List,
  Filter,
  Search,
  Plus,
  Download,
  Upload,
  Target,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import ConnectTelegramModal from '@/components/ConnectTelegramModal';

interface Integration {
  id: number;
  channel: string;
  channel_name: string | null;
  is_active: boolean;
  webhook_url: string | null;
  created_at: string;
  updated_at: string;
}

interface TelegramStatus {
  connected: boolean;
  webhook_url?: string | null;
  pending_updates?: number;
  last_error_date?: number | null;
  last_error_message?: string | null;
  bot_username?: string | null;
  integration_id?: number | null;
  message?: string | null;
}

interface HealthStatus {
  total_integrations: number;
  active_integrations: number;
  inactive_integrations: number;
  by_channel: Record<string, number>;
  integrations: Integration[];
}

interface AvailableChannel {
  name: string;
  id: string;
  status: string;
  description: string;
  icon: string;
  category: string;
  color: string;
  features: string[];
}

const availableChannels: AvailableChannel[] = [
  {
    name: 'WhatsApp Business',
    id: 'whatsapp',
    status: 'available',
    description: 'Connect WhatsApp Business API with one-click OAuth',
    icon: '/whatsapp-icon.png',
    category: 'Messaging',
    color: 'from-green-500 to-green-600',
    features: ['Auto-replies', 'Media support', 'Template messages', 'Analytics'],
  },
  {
    name: 'Telegram',
    id: 'telegram',
    status: 'available',
    description: 'Telegram bot integration for instant messaging',
    icon: '/telegram-icon.png',
    category: 'Messaging',
    color: 'from-blue-500 to-blue-600',
    features: ['Bot commands', 'Group chats', 'File sharing', 'Inline keyboards'],
  },
  {
    name: 'Instagram',
    id: 'instagram',
    status: 'available',
    description: 'Manage Instagram Direct Messages and comments',
    icon: '/intagram-icon.png',
    category: 'Social Media',
    color: 'from-pink-500 to-purple-600',
    features: ['DM automation', 'Comment replies', 'Story mentions', 'Media'],
  },
  {
    name: 'Facebook Messenger',
    id: 'messenger',
    status: 'available',
    description: 'Integrate Facebook Messenger conversations',
    icon: '/messenger-icon.png',
    category: 'Social Media',
    color: 'from-blue-600 to-indigo-600',
    features: ['Instant replies', 'Rich media', 'Quick replies', 'Templates'],
  },
  {
    name: 'Website Chat',
    id: 'webchat',
    status: 'available',
    description: 'Embed chat widget on your website',
    icon: '/chat-icon.png',
    category: 'Web',
    color: 'from-gray-600 to-gray-700',
    features: ['Custom branding', 'Instant setup', 'Copy-paste embed', 'Real-time chat'],
  },
  {
    name: 'Email',
    id: 'email',
    status: 'available',
    description: 'Connect Gmail with one-click OAuth',
    icon: '/chat-icon.png',
    category: 'Email',
    color: 'from-red-500 to-red-600',
    features: ['Auto-responses', 'Gmail integration', 'AI-powered replies', 'Smart inbox'],
  },
];

export default function IntegrationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<'connected' | 'marketplace' | 'health'>('connected');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<Integration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editChannelName, setEditChannelName] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const canManage = user?.role === 'admin' || user?.role === 'business_owner';

  const { data: healthData, isLoading: healthLoading } = useQuery<HealthStatus>({
    queryKey: ['integrations-health'],
    queryFn: async () => {
      const response = await api.get('/api/integrations/health/check');
      return response.data;
    },
    enabled: canManage,
    refetchInterval: 30000,
  });

  const fetchIntegrations = async () => {
    if (!canManage) {
      setIsLoading(false);
      return;
    }

    try {
      const [integrationsRes, telegramStatusRes, whatsappStatusRes] = await Promise.all([
        api.get('/api/integrations/'),
        api.get('/api/integrations/telegram/status').catch(() => ({ data: { connected: false } })),
        api.get('/api/integrations/whatsapp/status').catch(() => ({ data: null })),
      ]);

      setIntegrations(integrationsRes.data || []);
      setTelegramStatus(telegramStatusRes.data);
      setWhatsappStatus(whatsappStatusRes.data || null);
    } catch (error: any) {
      console.error('Error fetching integrations:', error);
      if (error.response?.status !== 403) {
        setTelegramStatus({ connected: false, message: 'Failed to load status' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();

    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const channel = urlParams.get('channel');

    if (success === 'true' && channel === 'whatsapp') {
      setTimeout(() => {
        fetchIntegrations();
      }, 1000);
      window.history.replaceState({}, '', '/dashboard/integrations');
    } else if (error) {
      alert(`Connection failed: ${error}`);
      window.history.replaceState({}, '', '/dashboard/integrations');
    }
  }, [canManage]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await api.put(`/api/integrations/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations-health'] });
      fetchIntegrations();
      setShowEditModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/integrations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations-health'] });
      fetchIntegrations();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      await api.put(`/api/integrations/${id}`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations-health'] });
      fetchIntegrations();
    },
  });

  const handleConnectSuccess = () => {
    fetchIntegrations();
    queryClient.invalidateQueries({ queryKey: ['integrations-health'] });
    queryClient.invalidateQueries({ queryKey: ['onboarding'] });
  };

  const handleDisconnect = async (channel: string) => {
    if (!confirm(`Are you sure you want to disconnect ${channel}? This will stop receiving messages.`)) {
      return;
    }

    try {
      if (channel === 'telegram') {
        await api.delete('/api/integrations/telegram/disconnect');
      } else if (channel === 'whatsapp') {
        await api.delete('/api/integrations/whatsapp/disconnect');
      }
      fetchIntegrations();
      queryClient.invalidateQueries({ queryKey: ['integrations-health'] });
    } catch (error: any) {
      alert(error.response?.data?.detail || `Failed to disconnect ${channel}`);
    }
  };

  const handleEditIntegration = (integration: Integration) => {
    setSelectedIntegration(integration);
    setEditChannelName(integration.channel_name || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (selectedIntegration) {
      updateMutation.mutate({
        id: selectedIntegration.id,
        data: { channel_name: editChannelName },
      });
    }
  };

  const getChannelColor = (channel: string) => {
    const channelData = availableChannels.find((c) => c.id === channel);
    return channelData?.color || 'from-gray-500 to-gray-600';
  };

  const getChannelIcon = (channel: string) => {
    const iconPath = availableChannels.find((c) => c.id === channel)?.icon;
    return iconPath || '/chat-icon.png';
  };

  const filteredChannels = availableChannels.filter((channel) => {
    if (categoryFilter === 'all') return true;
    return channel.category === categoryFilter;
  });

  const connectWhatsApp = async () => {
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const popup = window.open(
      'about:blank',
      'WhatsApp OAuth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      alert('Please allow popups for this site to connect WhatsApp');
      return;
    }

    popup.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connecting WhatsApp...</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
          }
          .container {
            text-align: center;
            padding: 2rem;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #25D366;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1.5rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h2 { color: white; margin: 0.5rem 0; font-size: 1.5rem; }
          p { color: rgba(255, 255, 255, 0.9); margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <h2>Connecting WhatsApp...</h2>
          <p>Please wait while we prepare the connection.</p>
        </div>
      </body>
      </html>
    `);

    try {
      const response = await api.get('/api/integrations/whatsapp/connect', {
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.data?.auth_url) {
        popup.location.href = response.data.auth_url;
      } else {
        throw new Error('No auth_url in response');
      }

      const handleMessage = (event: MessageEvent) => {
        const backendUrl = api.defaults.baseURL || 'http://localhost:8000';
        const backendOrigin = new URL(backendUrl).origin;

        if (event.origin !== window.location.origin && event.origin !== backendOrigin) {
          return;
        }

        if (event.data?.type !== 'whatsapp-oauth-success' && event.data?.type !== 'whatsapp-oauth-error') {
          return;
        }

        if (event.data.type === 'whatsapp-oauth-success') {
          popup.close();
          fetchIntegrations();
          queryClient.invalidateQueries({ queryKey: ['integrations-health'] });
          alert('WhatsApp connected successfully!');
          window.removeEventListener('message', handleMessage);
        } else if (event.data.type === 'whatsapp-oauth-error') {
          popup.close();
          alert(`WhatsApp connection failed: ${event.data.error || 'Unknown error'}`);
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
        }
      }, 1000);
    } catch (error: any) {
      console.error('WhatsApp connection error:', error);
      popup.close();
      if (error.response?.status === 401) {
        alert('Please log in first');
      } else if (error.response?.status === 403) {
        alert(error.response?.data?.detail || 'You do not have permission');
      } else {
        alert('Integration in progress... If this persists, please try again.');
      }
    }
  };

  const connectInstagram = async () => {
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const popup = window.open(
      'about:blank',
      'Instagram OAuth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      alert('Please allow popups for this site to connect Instagram');
      return;
    }

    popup.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connecting Instagram...</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #E1306C 0%, #C13584 50%, #833AB4 100%);
          }
          .container {
            text-align: center;
            padding: 2rem;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #E1306C;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1.5rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h2 { color: white; margin: 0.5rem 0; font-size: 1.5rem; }
          p { color: rgba(255, 255, 255, 0.9); margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <h2>Connecting Instagram...</h2>
          <p>Please wait while we prepare the connection.</p>
        </div>
      </body>
      </html>
    `);

    try {
      // Use api.get() to send JWT token with request
      const response = await api.get('/api/integrations/instagram/connect', {
        headers: {
          Accept: 'application/json',
        },
      });

      // Backend returns auth_url in JSON
      if (response.data?.auth_url) {
        popup.location.href = response.data.auth_url;
      } else {
        throw new Error('No auth_url in response');
      }

      // Listen for messages from popup
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'instagram-oauth-success') {
          console.log('Instagram connected successfully:', event.data.account);
          fetchIntegrations();
          popup.close();
          window.removeEventListener('message', handleMessage);
        } else if (event.data.type === 'instagram-oauth-error') {
          console.error('Instagram connection error:', event.data.error);
          alert(`Failed to connect Instagram: ${event.data.error}`);
          popup.close();
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          fetchIntegrations();
        }
      }, 1000);
    } catch (error: any) {
      console.error('Instagram connection error:', error);
      popup.close();
      if (error.response?.status === 401) {
        alert('Please log in first');
      } else if (error.response?.status === 403) {
        alert(error.response?.data?.detail || 'You do not have permission');
      } else {
        alert('Integration in progress... If this persists, please try again.');
      }
    }
  };

  const connectMessenger = async () => {
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const popup = window.open(
      'about:blank',
      'Messenger OAuth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      alert('Please allow popups for this site to connect Messenger');
      return;
    }

    popup.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connecting Messenger...</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #0084ff 0%, #0066ff 100%);
          }
          .container {
            text-align: center;
            padding: 2rem;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #0084ff;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1.5rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h2 { color: white; margin: 0.5rem 0; font-size: 1.5rem; }
          p { color: rgba(255, 255, 255, 0.9); margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <h2>Connecting Messenger...</h2>
          <p>Please wait while we prepare the connection.</p>
        </div>
      </body>
      </html>
    `);

    try {
      // Use api.get() to send JWT token with request
      const response = await api.get('/api/integrations/messenger/connect', {
        headers: {
          Accept: 'application/json',
        },
      });

      // Backend returns auth_url in JSON
      if (response.data?.auth_url) {
        popup.location.href = response.data.auth_url;
      } else {
        throw new Error('No auth_url in response');
      }

      // Listen for messages from popup
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'messenger-oauth-success') {
          console.log('Messenger connected successfully:', event.data.account);
          fetchIntegrations();
          popup.close();
          window.removeEventListener('message', handleMessage);
        } else if (event.data.type === 'messenger-oauth-error') {
          console.error('Messenger connection error:', event.data.error);
          alert(`Failed to connect Messenger: ${event.data.error}`);
          popup.close();
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          fetchIntegrations();
        }
      }, 1000);
    } catch (error: any) {
      console.error('Messenger connection error:', error);
      popup.close();
      if (error.response?.status === 401) {
        alert('Please log in first');
      } else if (error.response?.status === 403) {
        alert(error.response?.data?.detail || 'You do not have permission');
      } else {
        alert('Integration in progress... If this persists, please try again.');
      }
    }
  };

  const connectEmail = async () => {
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const popup = window.open(
      'about:blank',
      'Email OAuth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      alert('Please allow popups for this site to connect Email');
      return;
    }

    popup.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connecting Email...</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #EA4335 0%, #FBBC05 50%, #34A853 100%);
          }
          .container {
            text-align: center;
            padding: 2rem;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #EA4335;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1.5rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h2 { color: white; margin: 0.5rem 0; font-size: 1.5rem; }
          p { color: rgba(255, 255, 255, 0.9); margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <h2>Connecting Gmail...</h2>
          <p>Please wait while we prepare the connection.</p>
        </div>
      </body>
      </html>
    `);

    try {
      // Use api.get() to send JWT token with request
      const response = await api.get('/api/integrations/email/connect', {
        headers: {
          Accept: 'application/json',
        },
      });

      // Backend should return auth_url in JSON or redirect with 302
      if (response.data?.auth_url) {
        popup.location.href = response.data.auth_url;
      } else {
        throw new Error('No auth_url in response');
      }

      const handleMessage = (event: MessageEvent) => {
        const backendUrl = api.defaults.baseURL || 'http://localhost:8000';
        const backendOrigin = new URL(backendUrl).origin;

        if (event.origin !== window.location.origin && event.origin !== backendOrigin) {
          return;
        }

        if (event.data?.type !== 'email-oauth-success' && event.data?.type !== 'email-oauth-error') {
          return;
        }

        if (event.data.type === 'email-oauth-success') {
          console.log('Email connected successfully:', event.data.account);
          fetchIntegrations();
          popup.close();
        } else if (event.data.type === 'email-oauth-error') {
          console.error('Email connection error:', event.data.error);
          alert(`Failed to connect Email: ${event.data.error}`);
          popup.close();
        }

        window.removeEventListener('message', handleMessage);
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          fetchIntegrations();
        }
      }, 1000);
    } catch (error: any) {
      console.error('Email connection error:', error);
      popup.close();
      if (error.response?.status === 401) {
        alert('Please log in first');
      } else if (error.response?.status === 403) {
        alert(error.response?.data?.detail || 'You do not have permission');
      } else {
        alert('Integration in progress... If this persists, please try again.');
      }
    }
  };

  const connectWebchat = async () => {
    try {
      const response = await api.post('/api/integrations/webchat/connect');
      
      if (response.data.success) {
        // Show embed code modal
        const embedCode = response.data.embed_code;
        const widgetId = response.data.widget_id;
        
        // Create modal to show embed code
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;';
        modal.innerHTML = `
          <div style="background:white;padding:2rem;border-radius:12px;max-width:600px;width:90%;">
            <h2 style="margin:0 0 1rem 0;font-size:1.5rem;color:#111;">Website Chat Widget Created! 🎉</h2>
            <p style="color:#666;margin-bottom:1rem;">Copy the code below and paste it before the closing &lt;/body&gt; tag on your website:</p>
            <div style="background:#f5f5f5;padding:1rem;border-radius:8px;margin-bottom:1rem;overflow-x:auto;">
              <code style="font-family:monospace;font-size:0.875rem;white-space:pre;display:block;">${embedCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>
            </div>
            <div style="display:flex;gap:0.5rem;">
              <button onclick="navigator.clipboard.writeText(\`${embedCode.replace(/`/g, '\\`')}\`).then(() => alert('Copied to clipboard!')); this.textContent='✓ Copied!';" style="flex:1;padding:0.75rem;background:#10b981;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
                Copy Embed Code
              </button>
              <button onclick="this.parentElement.parentElement.parentElement.remove();" style="flex:1;padding:0.75rem;background:#6b7280;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
                Close
              </button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        
        fetchIntegrations();
      }
    } catch (error: any) {
      console.error('Website chat connection error:', error);
      if (error.response?.status === 401) {
        alert('Please log in first');
      } else if (error.response?.status === 403) {
        alert(error.response?.data?.detail || 'You do not have permission');
      } else {
        alert('Integration in progress... If this persists, please try again.');
      }
    }
  };

  if (!canManage) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-1 shadow-lg">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Integrations & Channels</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Connect and manage your communication channels
            </p>
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Only Admin and Business Owner roles can manage integrations.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Hero Header */}
      <div className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-lg p-1 shadow-lg">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg shadow-lg">
                  <Plug className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Integrations Hub
                  </h1>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Connect, manage, and monitor all your communication channels
                  </p>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveView('marketplace')}
                className="inline-flex items-center px-6 py-3 border border-transparent shadow-md text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-all"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Integration
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      {healthData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Integrations</p>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{healthData.active_integrations}</p>
              </div>
              <Power className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Channels</p>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{healthData.total_integrations}</p>
              </div>
              <Layers className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Health Status</p>
                <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                  {healthData.active_integrations > 0 ? '✓ Good' : '⚠ Setup'}
                </p>
              </div>
              <Activity className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Webhooks</p>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">
                  {healthData.integrations.filter((i) => i.webhook_url).length}
                </p>
              </div>
              <Webhook className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
        </div>
      )}

      {/* View Navigation */}
      <div className="flex space-x-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        {[
          { id: 'connected', label: 'Connected', icon: CheckCircle2, color: 'text-green-600' },
          { id: 'marketplace', label: 'Marketplace', icon: Grid3x3, color: 'text-blue-600' },
          { id: 'health', label: 'Health Dashboard', icon: Activity, color: 'text-purple-600' },
        ].map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeView === view.id
                ? 'bg-primary-500 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <view.icon className={`h-5 w-5 ${activeView !== view.id ? view.color : ''}`} />
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        ))}
      </div>

      {/* Connected Integrations View */}
      {activeView === 'connected' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
            </div>
          ) : integrations.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-5">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Your Integrations</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded ${
                        viewMode === 'grid'
                          ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <Grid3x3 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded ${
                        viewMode === 'list'
                          ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <List className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {integrations.map((integration) => (
                      <div
                        key={integration.id}
                        className="group relative p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-xl transition-all transform hover:-translate-y-1"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center">
                              <Image
                                src={getChannelIcon(integration.channel)}
                                alt={integration.channel}
                                width={56}
                                height={56}
                                className="w-14 h-14 object-contain"
                              />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                                {integration.channel}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {integration.channel_name || `${integration.channel} Integration`}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                              integration.is_active
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {integration.is_active ? (
                              <><CheckCircle2 className="h-3 w-3" /> Active</>
                            ) : (
                              <><PowerOff className="h-3 w-3" /> Inactive</>
                            )}
                          </span>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Webhook className="h-4 w-4" />
                            <span className="truncate">
                              {integration.webhook_url ? '✓ Configured' : '⚠ Not configured'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="h-4 w-4" />
                            <span>Connected {new Date(integration.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() =>
                              toggleMutation.mutate({ id: integration.id, is_active: !integration.is_active })
                            }
                            className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
                          >
                            {integration.is_active ? <Pause className="h-3 w-3 inline mr-1" /> : <Play className="h-3 w-3 inline mr-1" />}
                            {integration.is_active ? 'Pause' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleEditIntegration(integration)}
                            className="px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this integration?')) {
                                deleteMutation.mutate(integration.id);
                              }
                            }}
                            className="px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {integrations.map((integration) => (
                      <div
                        key={integration.id}
                        className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center justify-center">
                            <Image
                              src={getChannelIcon(integration.channel)}
                              alt={integration.channel}
                              width={48}
                              height={48}
                              className="w-12 h-12 object-contain"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                              {integration.channel}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {integration.channel_name || `${integration.channel} Integration`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                              integration.is_active
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {integration.is_active ? (
                              <><CheckCircle2 className="h-3 w-3" /> Active</>
                            ) : (
                              <><PowerOff className="h-3 w-3" /> Inactive</>
                            )}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                toggleMutation.mutate({ id: integration.id, is_active: !integration.is_active })
                              }
                              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              {integration.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleEditIntegration(integration)}
                              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this integration?')) {
                                  deleteMutation.mutate(integration.id);
                                }
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-full flex items-center justify-center mb-4">
                <Plug className="h-12 w-12 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No integrations yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Connect your first channel to start automating conversations
              </p>
              <button
                onClick={() => setActiveView('marketplace')}
                className="inline-flex items-center px-6 py-3 border border-transparent shadow-md text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-all"
              >
                <Plus className="h-5 w-5 mr-2" />
                Browse Integrations
              </button>
            </div>
          )}
        </div>
      )}

      {/* Marketplace View */}
      {activeView === 'marketplace' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Integration Marketplace</h3>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="all">All Categories</option>
                <option value="Messaging">Messaging</option>
                <option value="Social Media">Social Media</option>
                <option value="Web">Web</option>
                <option value="Email">Email</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredChannels.map((channel) => {
                const isConnected = integrations.some(
                  (i) => i.channel === channel.id && i.is_active
                );

                return (
                  <div
                    key={channel.id}
                    className="group relative p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-cyan-400 dark:hover:border-cyan-600 hover:shadow-2xl transition-all transform hover:-translate-y-2"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center">
                        <Image
                          src={channel.icon}
                          alt={channel.name}
                          width={64}
                          height={64}
                          className="w-16 h-16 object-contain"
                        />
                      </div>
                      {channel.status === 'available' && isConnected && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          <Check className="h-3 w-3" />
                          Connected
                        </span>
                      )}
                      {channel.status === 'coming_soon' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                          Coming Soon
                        </span>
                      )}
                    </div>

                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{channel.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{channel.description}</p>

                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Features:</p>
                      <div className="flex flex-wrap gap-2">
                        {channel.features.slice(0, 3).map((feature) => (
                          <span
                            key={feature}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (channel.status === 'available') {
                          if (channel.id === 'whatsapp') {
                            connectWhatsApp();
                          } else if (channel.id === 'telegram') {
                            setIsModalOpen(true);
                          } else if (channel.id === 'instagram') {
                            connectInstagram();
                          } else if (channel.id === 'messenger') {
                            connectMessenger();
                          } else if (channel.id === 'email') {
                            connectEmail();
                          } else if (channel.id === 'webchat') {
                            connectWebchat();
                          }
                        } else {
                          alert('This integration is coming soon!');
                        }
                      }}
                      disabled={channel.status !== 'available' || isConnected}
                      className={`w-full py-3 text-sm font-medium rounded-lg transition-all ${
                        channel.status === 'available' && !isConnected
                          ? `bg-gradient-to-r ${channel.color} text-white shadow-lg hover:shadow-xl`
                          : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isConnected ? (
                        <><Check className="h-4 w-4 inline mr-2" /> Connected</>
                      ) : channel.status === 'available' ? (
                        <><Plus className="h-4 w-4 inline mr-2" /> Connect Now</>
                      ) : (
                        <>Coming Soon</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Health Dashboard View */}
      {activeView === 'health' && healthData && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Channel Distribution */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Channel Distribution</h3>
              <div className="space-y-3">
                {Object.entries(healthData.by_channel).map(([channel, count]) => (
                  <div key={channel}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400 capitalize">{channel}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`bg-gradient-to-r ${getChannelColor(channel)} h-2 rounded-full`}
                        style={{
                          width: `${(count / healthData.total_integrations) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Integration Status */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Integration Status</h3>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-400">Active</p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                        {healthData.active_integrations}
                      </p>
                    </div>
                    <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-400">Inactive</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-300">
                        {healthData.inactive_integrations}
                      </p>
                    </div>
                    <PowerOff className="h-10 w-10 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">System Health</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                  <span className="text-sm text-green-700 dark:text-green-300">API Status</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">✓ Online</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                  <span className="text-sm text-green-700 dark:text-green-300">Webhooks</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">✓ Active</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                  <span className="text-sm text-green-700 dark:text-green-300">Message Queue</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">✓ Healthy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedIntegration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Edit Integration</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Channel Name
                </label>
                <input
                  type="text"
                  value={editChannelName}
                  onChange={(e) => setEditChannelName(e.target.value)}
                  placeholder="e.g., Customer Support WhatsApp"
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={updateMutation.isPending}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-md disabled:opacity-50 transition-all"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connect Telegram Modal */}
      <ConnectTelegramModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleConnectSuccess}
      />
    </div>
  );
}
