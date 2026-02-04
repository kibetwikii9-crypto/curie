'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import {
  Plus,
  Video,
  Image as ImageIcon,
  FileText,
  Play,
  Edit,
  Trash2,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Zap,
  Palette,
  Type,
  Mail,
  Phone,
  Globe,
  TrendingUp,
  BarChart3,
  Eye,
  Copy,
  Download,
  ChevronRight,
  ChevronLeft,
  Film,
  Layers,
  Sparkles,
  Grid3x3,
  List,
  Filter,
  Search,
  Upload,
  Star,
  Heart,
  Share2,
  MessageSquare,
  Target,
  Wand2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Check,
  Clock,
  Archive,
  Send,
} from 'lucide-react';

interface Campaign {
  name: string;
  assets: Array<{
    id: number;
    title: string;
    type: string;
    platform: string;
    status: string;
  }>;
  asset_count: number;
  platforms: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

interface AdAsset {
  id: number;
  title: string;
  asset_type: string;
  platform: string;
  status: string;
  campaign_name: string;
  created_at: string;
  updated_at: string;
}

export default function AdStudioPage() {
  const [activeSection, setActiveSection] = useState<
    'workspace' | 'copy' | 'video' | 'brand' | 'insights' | 'library'
  >('workspace');
  const [showCopyComposer, setShowCopyComposer] = useState(false);
  const [showVideoBuilder, setShowVideoBuilder] = useState(false);
  const [videoStep, setVideoStep] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Copy composer state
  const [copyObjective, setCopyObjective] = useState('promotion');
  const [copyPlatform, setCopyPlatform] = useState('instagram');
  const [copyHeadline, setCopyHeadline] = useState('');
  const [copyDescription, setCopyDescription] = useState('');
  const [copyCta, setCopyCta] = useState('');
  const [useIntelligence, setUseIntelligence] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Video builder state
  const [videoObjective, setVideoObjective] = useState('');
  const [videoPlatform, setVideoPlatform] = useState('');
  const [videoTemplate, setVideoTemplate] = useState('');
  const [videoHeadline, setVideoHeadline] = useState('');
  const [videoText, setVideoText] = useState('');
  const [videoCta, setVideoCta] = useState('');

  // Asset library state
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const queryClient = useQueryClient();

  const { data: campaignsData } = useQuery<{ campaigns: Campaign[] }>({
    queryKey: ['ads-campaigns'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ads/campaigns');
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: assetsData, isLoading: assetsLoading } = useQuery<{ assets: AdAsset[] }>({
    queryKey: ['ads-assets', assetTypeFilter, platformFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (assetTypeFilter !== 'all') params.append('asset_type', assetTypeFilter);
      if (platformFilter !== 'all') params.append('platform', platformFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const response = await api.get(`/api/dashboard/ads/assets?${params}`);
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: templatesData } = useQuery<{ templates: any }>({
    queryKey: ['ads-templates'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ads/copy-templates');
      return response.data;
    },
  });

  const { data: intelligenceData } = useQuery<{
    top_questions: any[];
    high_performing_intents: any[];
    frequently_asked: any[];
  }>({
    queryKey: ['ads-intelligence'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ads/conversation-intelligence');
      return response.data;
    },
  });

  const { data: presetsData } = useQuery<{ presets: any }>({
    queryKey: ['ads-presets'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ads/platform-presets');
      return response.data;
    },
  });

  const { data: videoTemplatesData } = useQuery<{ templates: any }>({
    queryKey: ['ads-video-templates'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ads/video-templates');
      return response.data;
    },
  });

  const { data: brandData } = useQuery<{
    logo: any;
    colors: any;
    fonts: any;
    contact: any;
    legal_disclaimer: string | null;
  }>({
    queryKey: ['ads-brand'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ads/brand-assets');
      return response.data;
    },
  });

  const { data: insightsData } = useQuery<{
    total_assets: number;
    assets_by_type: any[];
    assets_by_platform: any[];
    assets_by_status: any[];
    intent_linkage: string[];
  }>({
    queryKey: ['ads-insights'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ads/usage-insights');
      return response.data;
    },
    refetchInterval: 30000,
  });

  const generateCopyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/dashboard/ads/generate-copy', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.copy) {
        if (data.template_type === 'headline') {
          setCopyHeadline(data.copy);
        } else if (data.template_type === 'description') {
          setCopyDescription(data.copy);
        } else if (data.template_type === 'cta') {
          setCopyCta(data.copy);
        }
      }
      setAiGenerating(false);
    },
  });

  const createAssetMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/dashboard/ads/assets', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['ads-assets'] });
      queryClient.invalidateQueries({ queryKey: ['ads-insights'] });
      setShowCopyComposer(false);
      setShowVideoBuilder(false);
      setVideoStep(1);
      resetForms();
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await api.put(`/api/dashboard/ads/assets/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-assets'] });
      queryClient.invalidateQueries({ queryKey: ['ads-campaigns'] });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/dashboard/ads/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-assets'] });
      queryClient.invalidateQueries({ queryKey: ['ads-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['ads-insights'] });
    },
  });

  const resetForms = () => {
    setCopyHeadline('');
    setCopyDescription('');
    setCopyCta('');
    setCampaignName('');
    setVideoHeadline('');
    setVideoText('');
    setVideoCta('');
  };

  const handleGenerateCopy = (type: 'headline' | 'description' | 'cta') => {
    setAiGenerating(true);
    generateCopyMutation.mutate({
      objective: copyObjective,
      platform: copyPlatform,
      template_type: type,
      use_intelligence: useIntelligence,
    });
  };

  const handleSaveCopy = () => {
    if (!copyHeadline || !campaignName) {
      alert('Please fill in headline and campaign name');
      return;
    }

    createAssetMutation.mutate({
      asset_type: 'ad_copy',
      title: copyHeadline.substring(0, 50),
      content: `${copyHeadline}\n\n${copyDescription}\n\n${copyCta}`,
      platform: copyPlatform,
      status: 'draft',
      campaign_name: campaignName,
    });
  };

  const handleSaveVideo = () => {
    if (!videoHeadline || !campaignName) {
      alert('Please complete all video steps');
      return;
    }

    createAssetMutation.mutate({
      asset_type: 'video',
      title: videoHeadline.substring(0, 50),
      content: JSON.stringify({
        objective: videoObjective,
        template: videoTemplate,
        headline: videoHeadline,
        text: videoText,
        cta: videoCta,
      }),
      platform: videoPlatform,
      status: 'draft',
      campaign_name: campaignName,
    });
  };

  const handleDeleteAsset = (id: number, title: string) => {
    if (confirm(`Delete asset "${title}"?`)) {
      deleteAssetMutation.mutate(id);
    }
  };

  const handleChangeStatus = (id: number, newStatus: string) => {
    updateAssetMutation.mutate({
      id,
      data: { status: newStatus },
    });
  };

  const nextVideoStep = () => {
    if (videoStep < 6) setVideoStep(videoStep + 1);
  };

  const prevVideoStep = () => {
    if (videoStep > 1) setVideoStep(videoStep - 1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <Send className="h-3 w-3" />;
      case 'draft':
        return <Edit className="h-3 w-3" />;
      case 'archived':
        return <Archive className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Film className="h-5 w-5" />;
      case 'image':
        return <ImageIcon className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const filteredAssets = assetsData?.assets?.filter((asset) => {
    if (searchQuery) {
      return asset.title.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Enhanced Hero Header with Gradient */}
      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 rounded-lg p-1 shadow-md">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-md">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Ad & Video Creation Studio
                  </h1>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Create stunning ads with AI-powered creative tools
                  </p>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setShowCopyComposer(true);
                  setActiveSection('copy');
                }}
                className="inline-flex items-center px-6 py-3 border border-transparent shadow-md text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-all"
              >
                <Zap className="h-5 w-5 mr-2" />
                Create Ad Copy
              </button>
              <button
                onClick={() => {
                  setShowVideoBuilder(true);
                  setActiveSection('video');
                }}
                className="inline-flex items-center px-6 py-3 border-2 border-purple-300 dark:border-purple-700 shadow-md text-sm font-medium rounded-lg text-purple-700 dark:text-purple-300 bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 transform hover:scale-105 transition-all"
              >
                <Film className="h-5 w-5 mr-2" />
                Create Video
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Creative Section Navigation with Icons */}
      <div className="flex space-x-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        {[
          { id: 'workspace', label: 'Campaigns', icon: Layers, color: 'text-purple-600' },
          { id: 'library', label: 'Asset Library', icon: Grid3x3, color: 'text-blue-600' },
          { id: 'copy', label: 'Ad Copy', icon: FileText, color: 'text-green-600' },
          { id: 'video', label: 'Video Builder', icon: Film, color: 'text-red-600' },
          { id: 'brand', label: 'Brand Kit', icon: Palette, color: 'text-pink-600' },
          { id: 'insights', label: 'Analytics', icon: BarChart3, color: 'text-orange-600' },
        ].map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all transform hover:scale-105 ${
              activeSection === section.id
                ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <section.icon className={`h-5 w-5 ${activeSection !== section.id ? section.color : ''}`} />
            <span className="hidden sm:inline">{section.label}</span>
          </button>
        ))}
      </div>

      {/* Campaign Workspace with Visual Cards */}
      {activeSection === 'workspace' && (
        <div className="space-y-4">
          {/* Quick Stats */}
          {insightsData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Assets</p>
                    <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{insightsData.total_assets}</p>
                  </div>
                  <Layers className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Campaigns</p>
                    <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{campaignsData?.campaigns?.length || 0}</p>
                  </div>
                  <Target className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Published</p>
                    <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">
                      {insightsData.assets_by_status.find((s) => s.status === 'published')?.count || 0}
                    </p>
                  </div>
                  <Send className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Drafts</p>
                    <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">
                      {insightsData.assets_by_status.find((s) => s.status === 'draft')?.count || 0}
                    </p>
                  </div>
                  <Edit className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
            </div>
          )}

          {/* Campaign Cards */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-6">
                Active Campaigns
              </h3>
              {campaignsData && campaignsData.campaigns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {campaignsData.campaigns.map((campaign, idx) => (
                    <div
                      key={idx}
                      className="group relative p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-xl transition-all transform hover:-translate-y-1"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                            {campaign.name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Created {new Date(campaign.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            campaign.status
                          )}`}
                        >
                          {getStatusIcon(campaign.status)}
                          {campaign.status}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Assets</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            {campaign.asset_count}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {campaign.platforms.map((platform, pidx) => (
                            <span
                              key={pidx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400 capitalize"
                            >
                              {platform}
                            </span>
                          ))}
                        </div>

                        <button className="w-full mt-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
                          View Campaign →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="mx-auto w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full flex items-center justify-center mb-4">
                    <Layers className="h-12 w-12 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No campaigns yet
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Create your first ad or video to get started
                  </p>
                  <button
                    onClick={() => {
                      setShowCopyComposer(true);
                      setActiveSection('copy');
                    }}
                    className="inline-flex items-center px-6 py-3 border border-transparent shadow-md text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create Your First Campaign
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Asset Library with Grid/List View */}
      {activeSection === 'library' && (
        <div className="space-y-4">
          {/* Filters & View Controls */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Grid3x3 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Asset Library</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${
                    viewMode === 'grid'
                      ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Grid3x3 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${
                    viewMode === 'list'
                      ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <select
                value={assetTypeFilter}
                onChange={(e) => setAssetTypeFilter(e.target.value)}
                className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="all">All Types</option>
                <option value="ad_copy">Ad Copy</option>
                <option value="video">Video</option>
                <option value="image">Image</option>
              </select>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="all">All Platforms</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="whatsapp_status">WhatsApp</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Assets Grid/List */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            {assetsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : filteredAssets && filteredAssets.length > 0 ? (
              <div className="p-6">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="group relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:shadow-xl transition-all transform hover:-translate-y-1"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2 bg-white dark:bg-gray-900 rounded-lg shadow">
                            {getAssetIcon(asset.asset_type)}
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              asset.status
                            )}`}
                          >
                            {getStatusIcon(asset.status)}
                            {asset.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 truncate">
                          {asset.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 capitalize">
                          {asset.platform} • {asset.campaign_name}
                        </p>

                        {/* Quick Actions */}
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setSelectedAssetId(asset.id);
                              setShowPreview(true);
                            }}
                            className="flex-1 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
                          >
                            <Eye className="h-3 w-3 inline mr-1" />
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset.id, asset.title)}
                            className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Status Change Dropdown */}
                        {asset.status === 'draft' && (
                          <button
                            onClick={() => handleChangeStatus(asset.id, 'published')}
                            className="mt-2 w-full px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                          >
                            Publish Now
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg">
                            {getAssetIcon(asset.asset_type)}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {asset.title}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              {asset.asset_type} • {asset.platform} • {asset.campaign_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              asset.status
                            )}`}
                          >
                            {getStatusIcon(asset.status)}
                            {asset.status}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedAssetId(asset.id);
                                setShowPreview(true);
                              }}
                              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAsset(asset.id, asset.title)}
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
            ) : (
              <div className="text-center py-16">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-full flex items-center justify-center mb-4">
                  <ImageIcon className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No assets yet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Start creating ads to build your asset library
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Ad Copy Composer with Template Gallery */}
      {activeSection === 'copy' && (
        <div className="space-y-4">
          {/* Template Gallery */}
          {templatesData && !showCopyComposer && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Choose Your Template
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(templatesData.templates).map(([key, template]: [string, any]) => (
                    <div
                      key={key}
                      className="group relative p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-lg border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer"
                      onClick={() => {
                        setSelectedTemplate(key);
                        setShowCopyComposer(true);
                        // Auto-fill with template
                        if (template.sample) {
                          setCopyHeadline(template.sample.headline || '');
                          setCopyDescription(template.sample.description || '');
                          setCopyCta(template.sample.cta || '');
                        }
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <FileText className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                        </div>
                        <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 animate-pulse" />
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {template.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-full capitalize">
                          {template.objective}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {template.char_limit} chars
                        </span>
                      </div>
                      <button className="mt-4 w-full py-2 text-sm font-medium text-white bg-primary-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        Use Template →
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowCopyComposer(true)}
                    className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Start from Scratch
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Copy Composer */}
          {showCopyComposer && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-5">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      AI-Powered Ad Copy Composer
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowCopyComposer(false);
                      resetForms();
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Editor */}
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Campaign Name *
                      </label>
                      <input
                        type="text"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        placeholder="e.g., Summer Sale 2024"
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Objective
                        </label>
                        <select
                          value={copyObjective}
                          onChange={(e) => setCopyObjective(e.target.value)}
                          className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm"
                        >
                          <option value="promotion">Promotion</option>
                          <option value="announcement">Announcement</option>
                          <option value="offer">Offer</option>
                          <option value="product_highlight">Product Highlight</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Platform
                        </label>
                        <select
                          value={copyPlatform}
                          onChange={(e) => setCopyPlatform(e.target.value)}
                          className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm"
                        >
                          <option value="instagram">Instagram</option>
                          <option value="facebook">Facebook</option>
                          <option value="whatsapp_status">WhatsApp Status</option>
                        </select>
                      </div>
                    </div>

                    {/* AI Intelligence Toggle */}
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useIntelligence}
                          onChange={(e) => setUseIntelligence(e.target.checked)}
                          className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            Use Conversation Intelligence
                          </span>
                        </div>
                      </label>
                      {useIntelligence && intelligenceData && (
                        <div className="mt-3 pl-7 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                          {intelligenceData.top_questions?.length > 0 && (
                            <div>📊 Top question: {intelligenceData.top_questions[0].question.substring(0, 50)}...</div>
                          )}
                          {intelligenceData.high_performing_intents?.length > 0 && (
                            <div>🎯 Best intent: {intelligenceData.high_performing_intents[0].intent}</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Headline */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Headline *
                        </label>
                        <button
                          onClick={() => handleGenerateCopy('headline')}
                          disabled={aiGenerating}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 disabled:opacity-50"
                        >
                          <Wand2 className="h-3 w-3" />
                          AI Generate
                        </button>
                      </div>
                      <textarea
                        value={copyHeadline}
                        onChange={(e) => setCopyHeadline(e.target.value)}
                        rows={2}
                        placeholder="Catchy headline here..."
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                        {copyHeadline.length} / {presetsData?.presets?.[copyPlatform]?.max_length || 280}
                      </p>
                    </div>

                    {/* Description */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Description
                        </label>
                        <button
                          onClick={() => handleGenerateCopy('description')}
                          disabled={aiGenerating}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 disabled:opacity-50"
                        >
                          <Wand2 className="h-3 w-3" />
                          AI Generate
                        </button>
                      </div>
                      <textarea
                        value={copyDescription}
                        onChange={(e) => setCopyDescription(e.target.value)}
                        rows={4}
                        placeholder="Compelling description..."
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>

                    {/* CTA */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Call-to-Action
                        </label>
                        <button
                          onClick={() => handleGenerateCopy('cta')}
                          disabled={aiGenerating}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 disabled:opacity-50"
                        >
                          <Wand2 className="h-3 w-3" />
                          AI Generate
                        </button>
                      </div>
                      <input
                        type="text"
                        value={copyCta}
                        onChange={(e) => setCopyCta(e.target.value)}
                        placeholder="Shop Now, Learn More, Sign Up..."
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => {
                          setShowCopyComposer(false);
                          resetForms();
                        }}
                        className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveCopy}
                        disabled={createAssetMutation.isPending}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-md disabled:opacity-50 transition-all"
                      >
                        <Save className="h-4 w-4" />
                        {createAssetMutation.isPending ? 'Saving...' : 'Save as Draft'}
                      </button>
                    </div>
                  </div>

                  {/* Right: Live Preview */}
                  <div className="lg:sticky lg:top-6">
                    <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Live Preview
                        </h4>
                        <span className="text-xs px-2 py-1 bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400 rounded-full capitalize">
                          {copyPlatform}
                        </span>
                      </div>

                      {/* Platform Mockup */}
                      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-xl border border-gray-300 dark:border-gray-600">
                        <div className="space-y-4">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {copyHeadline || 'Your headline will appear here...'}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                            {copyDescription || 'Your description will appear here...'}
                          </div>
                          {copyCta && (
                            <button className="w-full py-2.5 text-sm font-bold text-white bg-primary-600 rounded-lg shadow-md hover:bg-primary-700 transition-all">
                              {copyCta}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Platform Guidelines */}
                      {presetsData?.presets?.[copyPlatform] && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-xs space-y-1">
                          <p className="font-medium text-blue-900 dark:text-blue-400">
                            {copyPlatform.charAt(0).toUpperCase() + copyPlatform.slice(1)} Guidelines:
                          </p>
                          <p className="text-blue-700 dark:text-blue-300">
                            Tone: {presetsData.presets[copyPlatform].tone}
                          </p>
                          <p className="text-blue-700 dark:text-blue-300">
                            Max Length: {presetsData.presets[copyPlatform].max_length} chars
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Video Builder with Steps */}
      {activeSection === 'video' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Film className="h-6 w-6 text-red-600 dark:text-red-400" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Video Asset Builder
                </h3>
              </div>
              {showVideoBuilder && (
                <button
                  onClick={() => {
                    setShowVideoBuilder(false);
                    setVideoStep(1);
                    resetForms();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              )}
            </div>

            {!showVideoBuilder ? (
              <div className="text-center py-16">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/20 dark:to-pink-900/20 rounded-full flex items-center justify-center mb-4">
                  <Video className="h-12 w-12 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Create Professional Videos
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Build short promotional videos using guided templates
                </p>
                <button
                  onClick={() => setShowVideoBuilder(true)}
                  className="inline-flex items-center px-6 py-3 border border-transparent shadow-md text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-all"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Start Building
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Creative Step Progress */}
                <div className="flex items-center justify-between">
                  {[
                    { num: 1, label: 'Objective', icon: Target },
                    { num: 2, label: 'Platform', icon: Globe },
                    { num: 3, label: 'Template', icon: Layers },
                    { num: 4, label: 'Content', icon: Type },
                    { num: 5, label: 'Assets', icon: ImageIcon },
                    { num: 6, label: 'Preview', icon: Eye },
                  ].map((step, idx) => (
                    <div key={step.num} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
                            step.num <= videoStep
                              ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md scale-110'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {step.num < videoStep ? (
                            <Check className="h-6 w-6" />
                          ) : (
                            <step.icon className="h-6 w-6" />
                          )}
                        </div>
                        <span className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                          {step.label}
                        </span>
                      </div>
                      {idx < 5 && (
                        <div
                          className={`flex-1 h-1 mx-2 transition-all ${
                            step.num < videoStep
                              ? 'bg-primary-600'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Step Content */}
                <div className="min-h-[300px]">
                  {/* Step 1: Objective */}
                  {videoStep === 1 && (
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        What's your objective?
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {['Promotion', 'Announcement', 'Offer', 'Brand Highlight'].map((obj) => (
                          <button
                            key={obj}
                            onClick={() => {
                              setVideoObjective(obj.toLowerCase());
                              nextVideoStep();
                            }}
                            className="group p-6 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-md transition-all transform hover:scale-105"
                          >
                            <Target className="h-8 w-8 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 mx-auto mb-3" />
                            <div className="font-semibold text-gray-900 dark:text-white">{obj}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Platform */}
                  {videoStep === 2 && (
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        Choose your platform
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { name: 'Instagram', id: 'instagram', color: 'from-pink-500 to-purple-500' },
                          { name: 'WhatsApp', id: 'whatsapp_status', color: 'from-green-500 to-green-600' },
                          { name: 'Facebook', id: 'facebook', color: 'from-blue-500 to-blue-600' },
                        ].map((platform) => (
                          <button
                            key={platform.id}
                            onClick={() => {
                              setVideoPlatform(platform.id);
                              nextVideoStep();
                            }}
                            className={`group p-6 bg-gradient-to-br ${platform.color} rounded-lg text-white shadow-md hover:shadow-2xl transition-all transform hover:scale-105`}
                          >
                            <Globe className="h-8 w-8 mx-auto mb-3" />
                            <div className="font-bold">{platform.name}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Template */}
                  {videoStep === 3 && videoTemplatesData && (
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        Pick a template
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(videoTemplatesData.templates).map(([key, template]: [string, any]) => (
                          <button
                            key={key}
                            onClick={() => {
                              setVideoTemplate(key);
                              nextVideoStep();
                            }}
                            className="group p-6 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-md transition-all text-left"
                          >
                            <Film className="h-8 w-8 text-purple-600 dark:text-purple-400 mb-3" />
                            <div className="font-semibold text-gray-900 dark:text-white mb-1">
                              {template.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {template.description} • {template.duration}s
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 4: Content */}
                  {videoStep === 4 && (
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">Add your content</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Campaign Name *
                        </label>
                        <input
                          type="text"
                          value={campaignName}
                          onChange={(e) => setCampaignName(e.target.value)}
                          placeholder="e.g., Summer Sale 2024"
                          className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Headline *
                        </label>
                        <input
                          type="text"
                          value={videoHeadline}
                          onChange={(e) => setVideoHeadline(e.target.value)}
                          placeholder="Main headline text"
                          className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Supporting Text
                        </label>
                        <textarea
                          value={videoText}
                          onChange={(e) => setVideoText(e.target.value)}
                          rows={3}
                          placeholder="Additional text"
                          className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Call-to-Action
                        </label>
                        <input
                          type="text"
                          value={videoCta}
                          onChange={(e) => setVideoCta(e.target.value)}
                          placeholder="Shop Now"
                          className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 5: Assets */}
                  {videoStep === 5 && (
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        Add visual assets
                      </h4>
                      <div className="p-12 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 text-center">
                        <Upload className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Drag & drop your images or videos here
                        </p>
                        <button className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg shadow-md hover:bg-primary-700">
                          <Plus className="h-5 w-5 mr-2" />
                          Choose Files
                        </button>
                      </div>
                      {brandData && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-blue-900 dark:text-blue-400">
                            <Sparkles className="h-4 w-4" />
                            <span>Pro Tip: Use brand assets for consistent look & feel</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 6: Preview & Export */}
                  {videoStep === 6 && (
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        Preview & finalize
                      </h4>
                      <div className="p-12 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border-2 border-dashed border-gray-600 text-center">
                        <div className="bg-white dark:bg-gray-700 rounded-lg p-8 max-w-sm mx-auto shadow-2xl">
                          <Film className="h-16 w-16 text-purple-600 mx-auto mb-4" />
                          <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                            {videoHeadline || 'Your Headline'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {videoText || 'Your supporting text'}
                          </p>
                          {videoCta && (
                            <button className="mt-4 px-6 py-2 text-sm font-bold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-all">
                              {videoCta}
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-4">
                          Template: {videoTemplate} • Platform: {videoPlatform} • Duration: ~10s
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {['MP4', 'Square (1:1)', 'Vertical (9:16)', 'Story (4:5)'].map((format) => (
                          <button
                            key={format}
                            className="flex-1 px-4 py-2 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            {format}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                {showVideoBuilder && (
                  <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={prevVideoStep}
                      disabled={videoStep === 1}
                      className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </button>
                    {videoStep < 6 ? (
                      <button
                        onClick={nextVideoStep}
                        className="inline-flex items-center px-6 py-3 border border-transparent shadow-md text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveVideo}
                        disabled={createAssetMutation.isPending}
                        className="inline-flex items-center px-6 py-3 border border-transparent shadow-md text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-all"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {createAssetMutation.isPending ? 'Saving...' : 'Save as Draft'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Brand Kit with Color Picker */}
      {activeSection === 'brand' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-6">
              <Palette className="h-6 w-6 text-pink-600 dark:text-pink-400" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Brand Kit</h3>
            </div>
            {brandData && (
              <div className="space-y-6">
                {/* Colors */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                    Brand Colors
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(brandData.colors).map(([name, color]: [string, any]) => (
                      <div key={name} className="group">
                        <div
                          className="w-full h-32 rounded-lg mb-3 border-4 border-white dark:border-gray-900 shadow-md group-hover:scale-105 transition-transform"
                          style={{ backgroundColor: color }}
                        />
                        <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                          {name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{color}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fonts */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Typography</h4>
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Heading Font</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {brandData.fonts.heading}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Body Font</span>
                        <span className="text-base text-gray-900 dark:text-white">
                          {brandData.fonts.body}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logo Upload */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Logos</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:border-purple-400 dark:hover:border-purple-600 transition-colors">
                      <ImageIcon className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Primary Logo
                      </p>
                      <button className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700">
                        Upload
                      </button>
                    </div>
                    <div className="p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:border-purple-400 dark:hover:border-purple-600 transition-colors">
                      <ImageIcon className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Secondary Logo
                      </p>
                      <button className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700">
                        Upload
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Insights with Charts */}
      {activeSection === 'insights' && insightsData && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Usage & Performance Insights
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Assets by Type */}
                <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/10 dark:to-blue-800/10 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                    Assets by Type
                  </h4>
                  <div className="space-y-3">
                    {insightsData.assets_by_type.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                          {item.type}
                        </span>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assets by Platform */}
                <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/10 dark:to-purple-800/10 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                    Assets by Platform
                  </h4>
                  <div className="space-y-3">
                    {insightsData.assets_by_platform.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                          {item.platform}
                        </span>
                        <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assets by Status */}
                <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/10 dark:to-green-800/10 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                    Assets by Status
                  </h4>
                  <div className="space-y-3">
                    {insightsData.assets_by_status.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                          {item.status}
                        </span>
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
