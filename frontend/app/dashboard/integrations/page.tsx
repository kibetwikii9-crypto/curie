'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { Plug, CheckCircle2, Clock, AlertCircle, ExternalLink, Settings, MessageSquare, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
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

interface Channel {
  name: string;
  status: string;
  description: string;
  icon: string;
}

const channels: Channel[] = [
  {
    name: 'WhatsApp',
    status: 'available',
    description: 'Connect WhatsApp Business API for customer support',
    icon: '/whatsapp-icon.png',
  },
  {
    name: 'Instagram',
    status: 'available',
    description: 'Manage Instagram Direct Messages and comments',
    icon: '/intagram-icon.png', // Note: using filename as provided
  },
  {
    name: 'Facebook Messenger',
    status: 'available',
    description: 'Integrate Facebook Messenger conversations',
    icon: '/messenger-icon.png',
  },
  {
    name: 'Telegram',
    status: 'available', // Will be updated dynamically
    description: 'Telegram bot integration',
    icon: '/telegram-icon.png',
  },
  {
    name: 'Website Chat',
    status: 'available',
    description: 'Embed chat widget on your website',
    icon: '/chat-icon.png',
  },
];

export default function IntegrationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<Integration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);

  // Check if user can manage integrations
  const canManage = user?.role === 'admin' || user?.role === 'business_owner';

  // Fetch integrations and Telegram status
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
      // If 403, user doesn't have permission - that's okay
      if (error.response?.status !== 403) {
        setTelegramStatus({ connected: false, message: 'Failed to load status' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
    
    // Handle OAuth callback success/error from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const channel = urlParams.get('channel');
    
    if (success === 'true' && channel === 'whatsapp') {
      // Refresh integrations to show WhatsApp as connected
      setTimeout(() => {
        fetchIntegrations();
      }, 1000);
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/integrations');
    } else if (error) {
      alert(`WhatsApp connection failed: ${error}`);
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/integrations');
    }
  }, [canManage]);

  const handleConnectSuccess = () => {
    fetchIntegrations();
    setTestError(null);
    setTestSuccess(false);
    // Invalidate onboarding progress to reflect Telegram connection
    queryClient.invalidateQueries({ queryKey: ['onboarding'] });
  };

  const handleTestMessage = async () => {
    if (!telegramStatus?.bot_username) {
      setTestError('Bot username not available');
      return;
    }

    setIsTestLoading(true);
    setTestError(null);
    setTestSuccess(false);

    try {
      // For testing, we need a chat_id. In a real scenario, you'd get this from a conversation
      // For now, we'll show a message that user needs to send a message first
      setTestError('To test, send a message to your bot first, then check if you receive a reply.');
    } catch (error: any) {
      setTestError(error.response?.data?.detail || 'Failed to send test message');
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Telegram? This will stop receiving messages.')) {
      return;
    }

    try {
      await api.delete('/api/integrations/telegram/disconnect');
      fetchIntegrations();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to disconnect Telegram');
    }
  };

  // Determine Telegram status
  const getTelegramStatus = () => {
    if (isLoading) return 'loading';
    if (!telegramStatus) return 'not_connected';
    if (telegramStatus.connected) {
      if (telegramStatus.last_error_message) return 'error';
      return 'connected';
    }
    return 'not_connected';
  };

  const telegramStatusValue = getTelegramStatus();

  if (!canManage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Integrations & Channels
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Connect and manage your communication channels
          </p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            Only Admin and Business Owner roles can manage integrations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Integrations & Channels
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Connect and manage your communication channels
        </p>
      </div>


      {/* Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {channels.map((channel) => {
          if (channel.name === 'WhatsApp') {
            const isWhatsAppConnected = whatsappStatus?.is_active === true;
            
            return (
              <div
                key={channel.name}
                className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src={channel.icon}
                      alt={`${channel.name} icon`}
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {channel.name}
                      </h3>
                      {isWhatsAppConnected ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 mt-1">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 mt-1">
                          Not Connected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {channel.description}
                  {whatsappStatus?.channel_name && (
                    <span className="block mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {whatsappStatus.channel_name}
                    </span>
                  )}
                </p>

                {/* Status Details */}
                {isWhatsAppConnected && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-xs text-green-700 dark:text-green-300">
                      ✅ Your WhatsApp is connected and ready to handle conversations
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  {isWhatsAppConnected ? (
                    <>
                      <button
                        onClick={async () => {
                          // Open popup immediately for faster perceived response
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
                            alert('Please allow popups for this site to reconnect WhatsApp');
                            return;
                          }
                          
                          // Show loading message immediately
                          popup.document.write(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                              <title>Reconnecting WhatsApp...</title>
                              <style>
                                body {
                                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                  display: flex;
                                  justify-content: center;
                                  align-items: center;
                                  height: 100vh;
                                  margin: 0;
                                  background: #f5f5f5;
                                }
                                .container {
                                  text-align: center;
                                  padding: 2rem;
                                }
                                .spinner {
                                  border: 4px solid #f3f3f3;
                                  border-top: 4px solid #25D366;
                                  border-radius: 50%;
                                  width: 40px;
                                  height: 40px;
                                  animation: spin 1s linear infinite;
                                  margin: 0 auto 1rem;
                                }
                                @keyframes spin {
                                  0% { transform: rotate(0deg); }
                                  100% { transform: rotate(360deg); }
                                }
                                h2 { color: #333; margin: 0.5rem 0; }
                                p { color: #666; margin: 0; }
                              </style>
                            </head>
                            <body>
                              <div class="container">
                                <div class="spinner"></div>
                                <h2>Reconnecting WhatsApp...</h2>
                                <p>Please wait while we prepare the connection.</p>
                              </div>
                            </body>
                            </html>
                          `);
                          
                          try {
                            // Use API call to get OAuth URL (includes auth headers)
                            const response = await api.get('/api/integrations/whatsapp/connect', {
                              headers: {
                                'Accept': 'application/json'
                              }
                            });
                            
                            if (response.data?.auth_url) {
                              // Navigate popup to OAuth URL immediately
                              popup.location.href = response.data.auth_url;
                            } else {
                              throw new Error('No auth_url in response');
                            }
                            
                            // Listen for message from popup
                            const handleMessage = (event: MessageEvent) => {
                              // Verify origin for security - allow messages from backend (callback page) or same origin
                              const backendUrl = api.defaults.baseURL || 'http://localhost:8000';
                              const backendOrigin = new URL(backendUrl).origin;
                              
                              // Allow messages from same origin or backend origin
                              if (event.origin !== window.location.origin && event.origin !== backendOrigin) {
                                return;
                              }
                              
                              // Only process WhatsApp OAuth messages
                              if (event.data?.type !== 'whatsapp-oauth-success' && event.data?.type !== 'whatsapp-oauth-error') {
                                return;
                              }
                              
                              if (event.data.type === 'whatsapp-oauth-success') {
                                popup.close();
                                fetchIntegrations();
                                alert('WhatsApp reconnected successfully!');
                                window.removeEventListener('message', handleMessage);
                              } else if (event.data.type === 'whatsapp-oauth-error') {
                                popup.close();
                                alert(`WhatsApp reconnection failed: ${event.data.error || 'Unknown error'}`);
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
                            console.error('WhatsApp reconnect error:', error);
                            popup.close();
                            if (error.response?.status === 401) {
                              alert('Please log in first');
                            } else if (error.response?.status === 403) {
                              alert(error.response?.data?.detail || 'You do not have permission');
                            } else {
                              alert('Failed to reconnect WhatsApp. Please try again.');
                            }
                          }
                        }}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-[#25D366] text-[#25D366] dark:text-[#25D366] bg-[#25D366]/10 dark:bg-[#25D366]/20 hover:bg-[#25D366]/20 dark:hover:bg-[#25D366]/30 rounded-md text-sm font-medium transition-colors"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Reconnect / Configure
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Are you sure you want to disconnect WhatsApp? This will stop receiving messages.')) {
                            return;
                          }
                          try {
                            await api.delete('/api/integrations/whatsapp/disconnect');
                            fetchIntegrations();
                          } catch (error: any) {
                            alert(error.response?.data?.detail || 'Failed to disconnect WhatsApp');
                          }
                        }}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md text-sm font-medium transition-colors"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={async () => {
                        // Open popup immediately for faster perceived response
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
                        
                        // Show loading message immediately
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
                                background: #f5f5f5;
                              }
                              .container {
                                text-align: center;
                                padding: 2rem;
                              }
                              .spinner {
                                border: 4px solid #f3f3f3;
                                border-top: 4px solid #25D366;
                                border-radius: 50%;
                                width: 40px;
                                height: 40px;
                                animation: spin 1s linear infinite;
                                margin: 0 auto 1rem;
                              }
                              @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                              }
                              h2 { color: #333; margin: 0.5rem 0; }
                              p { color: #666; margin: 0; }
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
                          // Use API call to get OAuth URL (includes auth headers)
                          const response = await api.get('/api/integrations/whatsapp/connect', {
                            headers: {
                              'Accept': 'application/json'
                            }
                          });
                          
                          // Backend returns JSON with auth_url
                          if (response.data?.auth_url) {
                            // Navigate popup to OAuth URL immediately
                            popup.location.href = response.data.auth_url;
                          } else {
                            throw new Error('No auth_url in response');
                          }
                          
                          // Listen for message from popup
                          const handleMessage = (event: MessageEvent) => {
                            // Verify origin for security - allow messages from backend (callback page) or same origin
                            const backendUrl = api.defaults.baseURL || 'http://localhost:8000';
                            const backendOrigin = new URL(backendUrl).origin;
                            
                            // Allow messages from same origin or backend origin
                            if (event.origin !== window.location.origin && event.origin !== backendOrigin) {
                              return;
                            }
                            
                            // Only process WhatsApp OAuth messages
                            if (event.data?.type !== 'whatsapp-oauth-success' && event.data?.type !== 'whatsapp-oauth-error') {
                              return;
                            }
                            
                            if (event.data.type === 'whatsapp-oauth-success') {
                              // Close popup
                              popup.close();
                              
                              // Refresh integrations
                              fetchIntegrations();
                              
                              // Show success message
                              alert('WhatsApp connected successfully!');
                              
                              // Remove listener
                              window.removeEventListener('message', handleMessage);
                            } else if (event.data.type === 'whatsapp-oauth-error') {
                              // Close popup
                              popup.close();
                              
                              // Show error
                              alert(`WhatsApp connection failed: ${event.data.error || 'Unknown error'}`);
                              
                              // Remove listener
                              window.removeEventListener('message', handleMessage);
                            }
                          };
                          
                          window.addEventListener('message', handleMessage);
                          
                          // Check if popup was closed manually
                          const checkClosed = setInterval(() => {
                            if (popup.closed) {
                              clearInterval(checkClosed);
                              window.removeEventListener('message', handleMessage);
                            }
                          }, 1000);
                        } catch (error: any) {
                          console.error('WhatsApp connection error:', error);
                          popup.close();
                          console.error('WhatsApp connection error:', error);
                          if (error.response?.status === 401) {
                            alert('Please log in first');
                            window.location.href = '/';
                          } else if (error.response?.status === 403) {
                            alert(error.response?.data?.detail || 'You do not have permission to connect integrations');
                          } else if (error.response?.status === 500) {
                            const errorMsg = error.response?.data?.detail || 'Meta OAuth is not configured. Please contact support.';
                            alert(errorMsg);
                            console.error('Backend error details:', error.response?.data);
                          } else if (error.code === 'ERR_NETWORK' || error.message?.includes('CORS')) {
                            // Network/CORS error - backend might be down or URL wrong
                            alert('Cannot connect to backend. Please check your connection and try again.');
                            console.error('Network error:', error);
                          } else {
                            alert('Failed to connect WhatsApp. Please try again.');
                            console.error('Full error:', error);
                          }
                        }
                      }}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent bg-[#25D366] hover:bg-[#20b558] text-white rounded-md text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plug className="h-4 w-4 mr-2" />
                      Connect WhatsApp
                    </button>
                  )}
                </div>
                {!isWhatsAppConnected && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    No tokens or code needed. You'll be redirected to Meta to authorize.
                  </p>
                )}
              </div>
            );
          }
          // Special handling for Telegram
          if (channel.name === 'Telegram') {
            return (
              <div
                key={channel.name}
                className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src={channel.icon}
                      alt={`${channel.name} icon`}
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {channel.name}
                      </h3>
                      {telegramStatusValue === 'connected' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 mt-1">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Connected
                        </span>
                      )}
                      {telegramStatusValue === 'not_connected' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 mt-1">
                          Not Connected
                        </span>
                      )}
                      {telegramStatusValue === 'error' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 mt-1">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Error
                        </span>
                      )}
                      {telegramStatusValue === 'loading' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 mt-1">
                          Loading...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {channel.description}
                  {telegramStatus?.bot_username && (
                    <span className="block mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Bot: @{telegramStatus.bot_username}
                    </span>
                  )}
                </p>

                {/* Status Details */}
                {telegramStatusValue === 'connected' && telegramStatus && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-xs text-green-700 dark:text-green-300">
                      ✅ Your bot is now connected and ready to handle conversations
                    </p>
                    {telegramStatus.pending_updates !== undefined && telegramStatus.pending_updates > 0 && (
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        ⚠️ {telegramStatus.pending_updates} pending updates
                      </p>
                    )}
                  </div>
                )}

                {telegramStatusValue === 'error' && telegramStatus?.last_error_message && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-xs text-red-700 dark:text-red-300">
                      ⚠️ {telegramStatus.last_error_message}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  {telegramStatusValue === 'connected' ? (
                    <>
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-[#007FFF] text-[#007FFF] dark:text-[#007FFF] bg-[#007FFF]/10 dark:bg-[#007FFF]/20 hover:bg-[#007FFF]/20 dark:hover:bg-[#007FFF]/30 rounded-md text-sm font-medium transition-colors"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Reconnect / Configure
                      </button>
                      <button
                        onClick={handleDisconnect}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md text-sm font-medium transition-colors"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsModalOpen(true)}
                      disabled={telegramStatusValue === 'loading'}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent bg-[#007FFF] hover:bg-[#0066CC] text-white rounded-md text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plug className="h-4 w-4 mr-2" />
                      Connect
                    </button>
                  )}
                </div>
              </div>
            );
          }

          // Other channels
          return (
            <div
              key={channel.name}
              className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Image
                    src={channel.icon}
                    alt={`${channel.name} icon`}
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {channel.name}
                    </h3>
                    {channel.status === 'available' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 mt-1">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Available
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {channel.description}
              </p>
              <button
                onClick={() => {
                  if (channel.name === 'Telegram') {
                    setIsModalOpen(true);
                  } else {
                    alert(`${channel.name} integration setup will be available soon. Backend endpoints are being configured.`);
                  }
                }}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-md text-sm font-medium"
              >
                {channel.name === 'Telegram' ? (
                  <>
                    <Plug className="h-4 w-4 mr-2" />
                    {telegramStatus?.connected ? 'Configure' : 'Connect'}
                  </>
                ) : (
                  <>
                    <Plug className="h-4 w-4 mr-2" />
                    Connect
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Integration Readiness */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Integration Readiness
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="text-sm text-gray-700 dark:text-gray-300">API Authentication</span>
            <span className="text-sm font-medium text-green-600 dark:text-green-400">Active</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="text-sm text-gray-700 dark:text-gray-300">Webhook Management</span>
            <span className="text-sm font-medium text-green-600 dark:text-green-400">Active</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="text-sm text-gray-700 dark:text-gray-300">Multi-Channel Routing</span>
            <span className="text-sm font-medium text-green-600 dark:text-green-400">Active</span>
          </div>
        </div>
      </div>

      {/* Connect Telegram Modal */}
      <ConnectTelegramModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleConnectSuccess}
      />
    </div>
  );
}
