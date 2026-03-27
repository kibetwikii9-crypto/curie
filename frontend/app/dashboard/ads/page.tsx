'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
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
    'workspace' | 'copy' | 'video' | 'brand' | 'insights' | 'library' | 'publish' | 'analytics' | 'smart-copy'
  >('workspace');
  const [showCopyComposer, setShowCopyComposer] = useState(false);
  const [showVideoBuilder, setShowVideoBuilder] = useState(false);
  const [videoStep, setVideoStep] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [saveTemplateDescription, setSaveTemplateDescription] = useState('');
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const { user } = useAuth();
  const canDeleteTemplates = user?.role === 'admin' || user?.role === 'business_owner';

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
  const [selectedVideoTemplateConfig, setSelectedVideoTemplateConfig] = useState<any>(null);
  const [videoTemplateMode, setVideoTemplateMode] = useState<'custom'>('custom');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [videoHeadline, setVideoHeadline] = useState('');
  const [videoText, setVideoText] = useState('');
  const [videoCta, setVideoCta] = useState('');
  const [showSaveVideoTemplateModal, setShowSaveVideoTemplateModal] = useState(false);
  const [saveVideoTemplateName, setSaveVideoTemplateName] = useState('');
  const [saveVideoTemplateDescription, setSaveVideoTemplateDescription] = useState('');
  const [templatePreview, setTemplatePreview] = useState<{ name: string; preview_url?: string } | null>(null);

  // Asset library state
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Brand asset state
  const [showBrandAssetUpload, setShowBrandAssetUpload] = useState(false);
  const [brandAssetType, setBrandAssetType] = useState<'logo' | 'color' | 'font' | 'style_guide'>('logo');
  const [brandAssetName, setBrandAssetName] = useState('');
  const [brandAssetFile, setBrandAssetFile] = useState<File | null>(null);

  // Publishing state
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishAssetId, setPublishAssetId] = useState<number | null>(null);
  const [publishPlatform, setPublishPlatform] = useState('instagram');
  const [scheduled_time, setScheduledTime] = useState('');

  // Smart copy insights state  
  const [selectedInsightTheme, setSelectedInsightTheme] = useState<string | null>(null);
  
  // Video export state
  const [selectedExportFormat, setSelectedExportFormat] = useState<string>('MP4');
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [fullscreenVideoIndex, setFullscreenVideoIndex] = useState<number | null>(null);
  const videoRefs = uploadedFiles.map(() => ({ current: null as HTMLVideoElement | null }));
  
  // File upload constants
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'];

  // Platform to export format mapping
  const PLATFORM_FORMATS: Record<string, string> = {
    instagram: 'Vertical (9:16)',
    facebook: 'Square (1:1)',
    whatsapp_status: 'Vertical (9:16)',
    tiktok: 'Vertical (9:16)',
    youtube: 'Story (4:5)',
    linkedin: 'Square (1:1)',
  };

  // Format dimensions for proper aspect ratio
  const FORMAT_RATIOS: Record<string, { w: number; h: number }> = {
    'MP4': { w: 16, h: 9 },
    'Square (1:1)': { w: 1, h: 1 },
    'Vertical (9:16)': { w: 9, h: 16 },
    'Story (4:5)': { w: 4, h: 5 },
  };

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

  const { data: customTemplatesData, refetch: refetchCustomTemplates } = useQuery<{ templates: any; total: number }>({
    queryKey: ['ads-custom-templates'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ads/templates');
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

  const { data: customVideoTemplatesData, refetch: refetchCustomVideoTemplates } = useQuery<{ templates: any[]; total: number }>({
    queryKey: ['ads-video-templates-custom'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ads/video-templates/custom');
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

  // New queries for enhanced features
  const { data: brandAssetsData, refetch: refetchBrandAssets } = useQuery<{
    logos: any[];
    colors: any[];
    fonts: any[];
    guides: any[];
  }>({
    queryKey: ['brand-assets'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ads/brand-assets/list');
      return response.data;
    },
  });

  const { data: smartInsightsData } = useQuery<{
    top_intents: any[];
    unresolved_questions: string[];
    pain_points: any[];
    suggested_copy_themes: any;
  }>({
    queryKey: ['ads-smart-insights'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ads/smart-copy-insights');
      return response.data;
    },
  });

  const { data: dashboardMetricsData } = useQuery<{
    total_assets: number;
    published_count: number;
    total_views: number;
    total_clicks: number;
    total_conversions: number;
    total_spend: number;
    total_revenue: number;
    roi: number;
  }>({
    queryKey: ['ads-dashboard-metrics'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ads/dashboard-metrics');
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: publicationsData, refetch: refetchPublications } = useQuery<{
    publications: any[];
    total: number;
  }>({
    queryKey: ['ads-publications'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/ads/publications');
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
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to generate copy';
      alert(`Error: ${message}`);
      setAiGenerating(false);
    },
  });

  const createAssetMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/dashboard/ads/assets', data);
      return response.data;
    },
    onSuccess: () => {
      alert('Asset saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['ads-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['ads-assets'] });
      queryClient.invalidateQueries({ queryKey: ['ads-insights'] });
      setShowCopyComposer(false);
      setShowVideoBuilder(false);
      setVideoStep(1);
      resetForms();
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to save asset';
      alert(`Error: ${message}`);
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

  const saveTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/dashboard/ads/templates', data);
      return response.data;
    },
    onSuccess: () => {
      refetchCustomTemplates();
      setShowSaveTemplateModal(false);
      setSaveTemplateName('');
      setSaveTemplateDescription('');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/dashboard/ads/templates/${id}`);
    },
    onSuccess: () => {
      refetchCustomTemplates();
    },
  });

  const createVideoTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/dashboard/ads/video-templates', data);
      return response.data;
    },
    onSuccess: () => {
      alert('Video template created successfully!');
      refetchCustomVideoTemplates();
      setShowSaveVideoTemplateModal(false);
      setSaveVideoTemplateName('');
      setSaveVideoTemplateDescription('');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create template';
      alert(`Error: ${message}`);
    },
  });

  const deleteVideoTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/dashboard/ads/video-templates/${id}`);
    },
    onSuccess: () => {
      alert('Template deleted successfully!');
      refetchCustomVideoTemplates();
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete template';
      alert(`Error: ${message}`);
    },
  });

  // New mutations for enhanced features
  const uploadBrandAssetMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await api.post('/api/dashboard/ads/brand-assets', data);
      return response.data;
    },
    onSuccess: () => {
      refetchBrandAssets();
      setShowBrandAssetUpload(false);
      setBrandAssetName('');
      setBrandAssetFile(null);
    },
  });

  const publishAssetMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`/api/dashboard/ads/assets/${data.asset_id}/publish`, {
        platform: data.platform,
        scheduled_for: data.scheduled_for,
      });
      return response.data;
    },
    onSuccess: () => {
      refetchPublications();
      setShowPublishModal(false);
      setPublishAssetId(null);
    },
  });

  const generateSmartCopyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/dashboard/ads/generate-smart-copy', data);
      return response.data;
    },
  });

  const resetForms = () => {
    // Copy state
    setCopyHeadline('');
    setCopyDescription('');
    setCopyCta('');
    setCampaignName('');
    // Video state
    setVideoHeadline('');
    setVideoText('');
    setVideoCta('');
    setVideoObjective('');
    setVideoPlatform('');
    setVideoTemplate('');
    setSelectedVideoTemplateConfig(null);
    setUploadedFiles([]);
    setVideoStep(1);
    setAiGenerating(false);
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
    const missingFields = [];
    if (!videoHeadline) missingFields.push('Headline');
    if (!campaignName) missingFields.push('Campaign Name');
    if (!videoPlatform) missingFields.push('Platform');
    if (!videoObjective) missingFields.push('Objective');
    if (!videoTemplate) missingFields.push('Template');
    const hasTemplate = !!videoTemplate;
    if (!hasTemplate && uploadedFiles.length === 0) missingFields.push('At least one asset (or select a template)');

    if (missingFields.length > 0) {
      alert(`Missing required fields: ${missingFields.join(', ')}`);
      return;
    }

    createAssetMutation.mutate({
      asset_type: 'video',
      title: videoHeadline.substring(0, 50),
      content: JSON.stringify({
        objective: videoObjective,
        template: videoTemplate,
        template_config: selectedVideoTemplateConfig,
        headline: videoHeadline,
        text: videoText,
        cta: videoCta,
        file_count: uploadedFiles.length,
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles: File[] = [];
    let totalSize = uploadedFiles.reduce((sum, f) => sum + f.size, 0);

    Array.from(files).forEach(file => {
      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name} exceeds 50MB limit`);
        return;
      }

      // Validate type
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(`${file.name} format not supported. Allowed: JPEG, PNG, GIF, MP4, WebM`);
        return;
      }

      // Validate total
      if (totalSize + file.size > MAX_TOTAL_SIZE) {
        alert('Total upload size exceeds 500MB limit');
        return;
      }

      validFiles.push(file);
      totalSize += file.size;
    });

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Cleanup object URLs when component unmounts or uploadedFiles change
  useEffect(() => {
    return () => {
      uploadedFiles.forEach(file => {
        try {
          const url = URL.createObjectURL(file);
          URL.revokeObjectURL(url);
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
    };
  }, [uploadedFiles]);

  const handleCloseVideoBuilder = () => {
    const hasChanges = videoHeadline || videoText || videoCta || uploadedFiles.length > 0 || videoObjective || videoPlatform || videoTemplate;

    if (hasChanges && !confirm('You have unsaved changes. Are you sure you want to close?')) {
      return;
    }

    setShowVideoBuilder(false);
    setVideoStep(1);
    resetForms();
  };

  const canProceedToStep = (targetStep: number): boolean => {
    // Validate current step before moving to next
    if (targetStep > videoStep) {
      switch (videoStep) {
        case 1:
          return !!videoObjective;
        case 2:
          return !!videoPlatform;
        case 3:
          return !!videoTemplate;
        case 4:
          return !!videoHeadline && !!campaignName;
        case 5:
          return uploadedFiles.length > 0;
        default:
          return true;
      }
    }
    return true; // Allow backward navigation
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep < videoStep) {
      // Allow backward navigation
      setVideoStep(targetStep);
    } else if (targetStep === videoStep + 1 && canProceedToStep(videoStep)) {
      // Allow next if current valid
      setVideoStep(targetStep);
    } else if (targetStep === videoStep) {
      // Same step
      setVideoStep(targetStep);
    } else {
      // Invalid navigation
      alert('Please complete current step first');
    }
  };

  const isValidTemplateConfig = (config: any): boolean => {
    return config && typeof config === 'object';
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
    <>
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
      <div className="flex space-x-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
        {[
          { id: 'workspace', label: 'Campaigns', icon: Layers, color: 'text-purple-600' },
          { id: 'library', label: 'Asset Library', icon: Grid3x3, color: 'text-blue-600' },
          { id: 'copy', label: 'Ad Copy', icon: FileText, color: 'text-green-600' },
          { id: 'video', label: 'Video Builder', icon: Film, color: 'text-red-600' },
          { id: 'smart-copy', label: 'AI Insights', icon: Sparkles, color: 'text-cyan-600' },
          { id: 'brand', label: 'Brand Kit', icon: Palette, color: 'text-pink-600' },
          { id: 'publish', label: 'Publish', icon: Send, color: 'text-indigo-600' },
          { id: 'analytics', label: 'Analytics', icon: BarChart3, color: 'text-orange-600' },
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
          {(templatesData || customTemplatesData) && !showCopyComposer && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-5">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {customTemplatesData && customTemplatesData.total > 0 ? 'Your Saved Templates' : 'Choose Your Template'}
                    </h3>
                  </div>
                  {customTemplatesData && customTemplatesData.total > 0 && (
                    <button
                      onClick={() => setShowTemplateManager(true)}
                      className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Manage → 
                    </button>
                  )}
                </div>

                {/* Custom Templates */}
                {customTemplatesData && customTemplatesData.total > 0 && (
                  <div>
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Your Templates</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {customTemplatesData.templates.map((template: any) => (
                          <div
                            key={template.id}
                            className="group relative p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 rounded-lg border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer"
                            onClick={() => {
                              setShowCopyComposer(true);
                              setCopyHeadline(template.content.headline || '');
                              setCopyDescription(template.content.description || '');
                              setCopyCta(template.content.cta || '');
                              setCopyObjective(template.objective);
                              setCopyPlatform(template.platform || 'instagram');
                            }}
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Star className="h-6 w-6 text-blue-600" />
                              </div>
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                                {template.usage_count} uses
                              </span>
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                              {template.name}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                              {template.description || 'No description'}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full capitalize">
                                {template.objective}
                              </span>
                              {template.platform && (
                                <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full capitalize">
                                  {template.platform}
                                </span>
                              )}
                            </div>
                            <button className="mt-4 w-full py-2 text-sm font-medium text-white bg-blue-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              Use Template →
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

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
                        onClick={() => setShowSaveTemplateModal(true)}
                        title="Save current copy as reusable template"
                        className="px-4 py-3 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800 transition-colors"
                      >
                        <Star className="h-4 w-4" />
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

      {/* Save as Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSaveTemplateModal(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-6 w-6 text-purple-600" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Save as Template</h3>
                <button
                  onClick={() => setShowSaveTemplateModal(false)}
                  className="ml-auto text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={saveTemplateName}
                  onChange={(e) => setSaveTemplateName(e.target.value)}
                  placeholder="e.g., Summer Promotion"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={saveTemplateDescription}
                  onChange={(e) => setSaveTemplateDescription(e.target.value)}
                  placeholder="Describe when to use this template..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowSaveTemplateModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!saveTemplateName.trim()) {
                      alert('Please enter a template name');
                      return;
                    }
                    saveTemplateMutation.mutate({
                      name: saveTemplateName,
                      description: saveTemplateDescription,
                      category: 'headline',
                      objective: copyObjective,
                      platform: copyPlatform,
                      content: {
                        headline: copyHeadline,
                        description: copyDescription,
                        cta: copyCta,
                      },
                    });
                  }}
                  disabled={saveTemplateMutation.isPending || !saveTemplateName.trim()}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {saveTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Video Template Modal */}
      {showSaveVideoTemplateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSaveVideoTemplateModal(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Film className="h-6 w-6 text-red-600" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Save video template</h3>
                <button
                  onClick={() => setShowSaveVideoTemplateModal(false)}
                  className="ml-auto text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template Name *</label>
                <input
                  type="text"
                  value={saveVideoTemplateName}
                  onChange={(e) => setSaveVideoTemplateName(e.target.value)}
                  placeholder="e.g., Product Launch"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={saveVideoTemplateDescription}
                  onChange={(e) => setSaveVideoTemplateDescription(e.target.value)}
                  placeholder="Describe the template use case"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowSaveVideoTemplateModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!saveVideoTemplateName.trim()) {
                      alert('Please enter a template name');
                      return;
                    }
                    createVideoTemplateMutation.mutate({
                      name: saveVideoTemplateName,
                      description: saveVideoTemplateDescription,
                      video_type: videoTemplate || 'static_image_text',
                      platform: videoPlatform || 'instagram',
                      config: selectedVideoTemplateConfig || {
                        headline: videoHeadline,
                        text: videoText,
                        cta: videoCta,
                      },
                    });
                  }}
                  disabled={!saveVideoTemplateName.trim() || createVideoTemplateMutation.isPending}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {createVideoTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
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
                  onClick={handleCloseVideoBuilder}
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
                    <div
                      key={step.num}
                      className={`flex items-center flex-1 ${step.num <= videoStep || (step.num === videoStep + 1 && canProceedToStep(videoStep)) ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                      onClick={() => handleStepClick(step.num)}
                    >
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
                              // Auto-set export format based on platform
                              const autoFormat = PLATFORM_FORMATS[platform.id] || 'MP4';
                              setSelectedExportFormat(autoFormat);
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
                  {videoStep === 3 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 dark:text-white">Pick a template</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Use your saved template, or upload one from JSON.</p>
                        </div>
                        <label className="px-3 py-2 text-xs font-semibold rounded-lg border border-primary-600 text-primary-600 bg-primary-50 dark:bg-primary-900/20 cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-800 disabled:opacity-50">
                          {isLoadingTemplate ? 'Loading...' : 'Upload JSON'}
                          <input
                            type="file"
                            accept="application/json"
                            disabled={isLoadingTemplate}
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                
                                try {
                                  setIsLoadingTemplate(true);
                                  const text = await file.text();
                                  const parsed = JSON.parse(text);
                                  
                                  // Validate required fields
                                  if (!parsed.name) {
                                    alert('Template must have a "name" field');
                                    return;
                                  }
                                  
                                  await createVideoTemplateMutation.mutateAsync({
                                    name: parsed.name,
                                    description: parsed.description || '',
                                    video_type: parsed.video_type || 'static_image_text',
                                    platform: parsed.platform || videoPlatform || 'instagram',
                                    config: parsed.config || parsed.template_config || {},
                                    thumbnail_url: parsed.thumbnail_url || null,
                                  });
                                  setVideoTemplateMode('custom');
                                } catch (err: any) {
                                  if (err instanceof SyntaxError) {
                                    alert('Invalid JSON format. Check for syntax errors.');
                                  } else if (err.code === 'NotReadableError') {
                                    alert('Could not read file. Try again.');
                                  } else if (err.response?.data?.detail) {
                                    alert(`Error: ${err.response.data.detail}`);
                                  } else {
                                    alert(`Error: ${err.message || 'Failed to upload template'}`);
                                  }
                                } finally {
                                  setIsLoadingTemplate(false);
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Custom video templates section */}
                      <div>
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Your saved video templates</h5>
                          {customVideoTemplatesData?.total === 0 ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">No custom templates found. Save a template at the end of the wizard.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {customVideoTemplatesData.templates.map((template: any) => (
                                <div
                                  key={template.id}
                                  className="group p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition-all"
                                >
                                  <div className="mb-3">
                                    {template.thumbnail_url ? (
                                      <img
                                        src={template.thumbnail_url}
                                        alt={`${template.name} thumbnail`}
                                        className="w-full h-24 object-cover rounded-lg mb-2"
                                      />
                                    ) : (
                                      <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-2">
                                        <Film className="h-8 w-8 text-purple-500" />
                                      </div>
                                    )}
                                    <div className="text-md font-semibold text-gray-900 dark:text-white">{template.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{template.description || 'No description'}</div>
                                  </div>
                                  <div className="flex justify-between items-start gap-2">
                                    <div />
                                    {canDeleteTemplates ? (
                                      <button
                                        onClick={() => {
                                          if (confirm('Are you sure you want to delete this template? This cannot be undone.')) {
                                            deleteVideoTemplateMutation.mutate(template.id);
                                          }
                                        }}
                                        className="text-red-500 text-xs hover:text-red-700"
                                        title="Only admin/business_owner can delete templates"
                                      >
                                        Delete
                                      </button>
                                    ) : (
                                      <span className="text-gray-400 text-xs" title="Only admin/business_owner can delete templates">Delete unavailable</span>
                                    )}
                                  </div>
                                  <div className="flex gap-2 mt-3">
                                    <button
                                      onClick={() => {
                                        const config = template.config || template.template_config || {};
                                        if (!isValidTemplateConfig(config)) {
                                          alert('Invalid template configuration. Please try another template.');
                                          return;
                                        }
                                        setVideoTemplate(`custom:${template.id}`);
                                        setSelectedVideoTemplateConfig(config);
                                        nextVideoStep();
                                      }}
                                      className="flex-1 px-2 py-2 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                                    >
                                      Use This Template
                                    </button>
                                    <button
                                      onClick={() => setTemplatePreview({
                                        name: template.name,
                                        preview_url: template.preview_url || template.thumbnail_url || 'https://via.placeholder.com/640x360?text=No+Preview+Available',
                                      })}
                                      className="flex-1 px-2 py-2 text-xs font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      Preview Template
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      {templatePreview && (
                        <div className="mt-4 p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-blue-800 dark:text-blue-200">Preview: {templatePreview.name}</div>
                            <button
                              onClick={() => setTemplatePreview(null)}
                              className="text-blue-800 dark:text-blue-200 text-xs hover:text-blue-900 dark:hover:text-blue-100"
                            >
                              Close
                            </button>
                          </div>
                          {templatePreview.preview_url?.match(/\.(mp4|webm)$/i) ? (
                            <video
                              src={templatePreview.preview_url}
                              controls
                              className="w-full h-64 md:h-72 object-contain rounded-md"
                            />
                          ) : (
                            <img
                              src={templatePreview.preview_url}
                              alt={`Preview for ${templatePreview.name}`}
                              className="w-full h-64 md:h-72 object-cover rounded-md"
                            />
                          )}
                        </div>
                      )}

                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Tip: If you already have a template, you can upload it as JSON using the button above (must include name/video_type/platform/config). Saved templates are available under Custom mode.
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
                        <label htmlFor="file-upload" className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg shadow-md hover:bg-primary-700 cursor-pointer">
                          <Plus className="h-5 w-5 mr-2" />
                          Choose Files
                        </label>
                        <input
                          id="file-upload"
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>
                      
                      {/* Display uploaded files */}
                      {uploadedFiles.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Uploaded Files ({uploadedFiles.length})
                          </h5>
                          <div className="grid grid-cols-2 gap-3">
                            {uploadedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {file.type.startsWith('video/') ? (
                                    <Video className="h-5 w-5 text-red-600 flex-shrink-0" />
                                  ) : (
                                    <ImageIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                  )}
                                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                    {file.name}
                                  </span>
                                </div>
                                <button
                                  onClick={() => removeFile(index)}
                                  className="ml-2 text-red-600 hover:text-red-700 flex-shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                          {brandData && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-blue-900 dark:text-blue-400">
                            <Sparkles className="h-4 w-4" />
                            <span>Pro Tip: Use brand assets for consistent look & feel</span>
                          </div>
                        </div>
                      )}

                      <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-700">
                        <h5 className="text-sm font-semibold text-green-700 dark:text-green-300">Upload your media</h5>
                        <p className="text-xs text-green-700 dark:text-green-200 mt-1">
                          Upload your own images or video clips here. These will be used as the source materials for your final video preview and export.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 6: Preview & Export */}
                  {videoStep === 6 && (
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        Preview & finalize
                      </h4>
                      
                      {/* Video Preview Area */}
                      <div className="p-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border-2 border-dashed border-gray-600">
                        {uploadedFiles.length > 0 ? (
                          <div className="space-y-4">
                            {/* Display uploaded media */}
                            <div className="flex flex-col gap-4">
                              {uploadedFiles.map((file, index) => {
                                const fileUrl = URL.createObjectURL(file);
                                const isVideo = file.type.startsWith('video/');
                                const isFullscreen = fullscreenVideoIndex === index;
                                
                                return (
                                  <div key={index}>
                                    {/* Fullscreen Modal */}
                                    {isFullscreen && isVideo && (
                                      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
                                        <video
                                          ref={(el) => { if (el) videoRefs[index].current = el; }}
                                          src={fileUrl}
                                          controls
                                          autoPlay
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            maxWidth: '100vw',
                                            maxHeight: '100vh',
                                            objectFit: 'contain',
                                          }}
                                          controlsList="nodownload"
                                        />
                                        <button
                                          onClick={() => setFullscreenVideoIndex(null)}
                                          className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg z-50"
                                        >
                                          <X className="h-6 w-6" />
                                        </button>
                                      </div>
                                    )}

                                    {/* Regular Preview */}
                                    <div className="relative rounded-lg overflow-hidden shadow-lg bg-black">
                                      {/* Aspect ratio container based on export format */}
                                      <div 
                                        style={{
                                          aspectRatio: `${FORMAT_RATIOS[selectedExportFormat]?.w || 16} / ${FORMAT_RATIOS[selectedExportFormat]?.h || 9}`,
                                          width: '100%',
                                          maxWidth: '600px',
                                          margin: '0 auto',
                                          backgroundColor: '#000',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          position: 'relative',
                                        }}
                                      >
                                        {isVideo ? (
                                          <>
                                            <video
                                              ref={(el) => { if (el) videoRefs[index].current = el; }}
                                              src={fileUrl}
                                              controls
                                              controlsList="nodownload"
                                              style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                              }}
                                            />
                                            {/* Play Button Overlay */}
                                            <button
                                              onClick={() => {
                                                if (videoRefs[index].current) {
                                                  videoRefs[index].current.play();
                                                }
                                              }}
                                              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-all opacity-0 hover:opacity-100 group/video"
                                            >
                                              <div className="bg-primary-600 hover:bg-primary-700 rounded-full p-6 shadow-lg transform hover:scale-110 transition-transform">
                                                <Play className="h-8 w-8 text-white fill-white" />
                                              </div>
                                            </button>
                                            {/* Fullscreen Button */}
                                            <button
                                              onClick={() => setFullscreenVideoIndex(index)}
                                              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg z-10 transition-all"
                                              title="Fullscreen"
                                            >
                                              <Maximize2 className="h-5 w-5" />
                                            </button>
                                          </>
                                        ) : (
                                          <img
                                            src={fileUrl}
                                            alt={file.name}
                                            style={{
                                              width: '100%',
                                              height: '100%',
                                              objectFit: 'contain',
                                            }}
                                          />
                                        )}
                                      </div>
                                      
                                      {/* Text overlay */}
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4 pointer-events-none">
                                        <div className="text-white">
                                          <p className="font-bold text-lg">{videoHeadline || 'Your Headline'}</p>
                                          <p className="text-sm text-gray-200">{videoText || 'Your supporting text'}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Other uploaded files as thumbnail grid */}
                            {uploadedFiles.length > 1 && (
                              <div className="grid grid-cols-4 gap-2 pt-4">
                                {uploadedFiles.map((file, index) => {
                                  const fileUrl = URL.createObjectURL(file);
                                  const isVideo = file.type.startsWith('video/');
                                  
                                  return (
                                    <div key={index} className="relative rounded-lg overflow-hidden h-20 bg-black/30">
                                      {isVideo ? (
                                        <>
                                          <video src={fileUrl} className="w-full h-full object-cover" />
                                          <Video className="absolute inset-0 m-auto h-4 w-4 text-white" />
                                        </>
                                      ) : (
                                        <img src={fileUrl} alt={file.name} className="w-full h-full object-cover" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-16">
                            <Film className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                            <p className="text-lg font-bold text-white mb-2">
                              {videoHeadline || 'Your Headline'}
                            </p>
                            <p className="text-sm text-gray-300 mb-6">
                              {videoText || 'Your supporting text'}
                            </p>
                            {videoCta && (
                              <button className="px-6 py-2 text-sm font-bold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-all">
                                {videoCta}
                              </button>
                            )}
                            <p className="text-xs text-gray-400 mt-6">
                              No media uploaded. Go back to Step 5 to add images or videos.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Video Info & Format Selection */}
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <span className="font-medium">Template:</span> {videoTemplate || 'None selected'} • <span className="font-medium">Platform:</span> {videoPlatform || 'None'} • <span className="font-medium">Files:</span> {uploadedFiles.length}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                            ✓ Format auto-selected for {videoPlatform || 'your platform'}: <span className="font-semibold">{selectedExportFormat}</span>
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Export Format (Change if needed)
                          </label>
                          <div className="flex gap-2 flex-wrap">
                            {['MP4', 'Square (1:1)', 'Vertical (9:16)', 'Story (4:5)'].map((format) => (
                              <button
                                key={format}
                                onClick={() => setSelectedExportFormat(format)}
                                className={`px-4 py-2 text-xs font-medium border rounded-lg transition-colors ${
                                  selectedExportFormat === format
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                }`}
                              >
                                {format}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Your media will be resized and fit to the selected format without distortion.
                          </p>
                        </div>
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowSaveVideoTemplateModal(true)}
                          className="inline-flex items-center px-4 py-3 text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700"
                        >
                          <Star className="h-4 w-4 mr-2" />
                          Save as Video Template
                        </button>
                        <button
                          onClick={handleSaveVideo}
                          disabled={createAssetMutation.isPending}
                          className="inline-flex items-center px-6 py-3 border border-transparent shadow-md text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-all"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {createAssetMutation.isPending ? 'Saving...' : 'Save as Draft'}
                        </button>
                      </div>
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
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Palette className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Brand Kit & Assets</h3>
                </div>
                <button
                  onClick={() => setShowBrandAssetUpload(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-pink-600 hover:bg-pink-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Add Asset
                </button>
              </div>

              {/* Brand Asset Upload Modal */}
              {showBrandAssetUpload && (
                <div className="mb-6 p-4 bg-pink-50 dark:bg-pink-900/10 border border-pink-200 dark:border-pink-800 rounded-lg">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Asset Type
                      </label>
                      <select
                        value={brandAssetType}
                        onChange={(e) => setBrandAssetType(e.target.value as any)}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
                      >
                        <option value="logo">Logo</option>
                        <option value="color">Brand Color</option>
                        <option value="font">Typography</option>
                        <option value="style_guide">Style Guide</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Asset Name
                      </label>
                      <input
                        type="text"
                        value={brandAssetName}
                        onChange={(e) => setBrandAssetName(e.target.value)}
                        placeholder="e.g., Primary Logo, Brand Blue"
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Upload File
                      </label>
                      <input
                        type="file"
                        onChange={(e) => setBrandAssetFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowBrandAssetUpload(false)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (!brandAssetName || !brandAssetFile) {
                            alert('Please fill in all fields');
                            return;
                          }
                          const formData = new FormData();
                          formData.append('name', brandAssetName);
                          formData.append('asset_type', brandAssetType);
                          formData.append('description', '');
                          formData.append('file', brandAssetFile);
                          uploadBrandAssetMutation.mutate(formData);
                        }}
                        className="flex-1 px-3 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-md text-sm font-medium"
                      >
                        Upload
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {brandAssetsData ? (
                <div className="space-y-6">
                  {/* Logos */}
                  {brandAssetsData.logos.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" /> Logos
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {brandAssetsData.logos.map((logo) => (
                          <div key={logo.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">{logo.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{logo.description}</p>
                            {logo.is_primary && <span className="mt-2 inline-block text-xs px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">Primary</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Colors */}
                  {brandAssetsData.colors.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Palette className="h-4 w-4" /> Brand Colors
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {brandAssetsData.colors.map((color) => (
                          <div key={color.id} className="group">
                            <div
                              className="w-full h-24 rounded-lg mb-2 border shadow-sm group-hover:scale-105 transition-transform"
                              style={{ backgroundColor: color.content.hex || '#ccc' }}
                            />
                            <p className="text-xs font-medium text-gray-900 dark:text-white">{color.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fonts */}
                  {brandAssetsData.fonts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Type className="h-4 w-4" /> Typography
                      </h4>
                      <div className="space-y-3">
                        {brandAssetsData.fonts.map((font) => (
                          <div key={font.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{font.name}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">{font.content.family}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Palette className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">No brand assets added yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Smart Copy Insights Section */}
      {activeSection === 'smart-copy' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI-Powered Insights</h3>
              </div>

              {smartInsightsData ? (
                <div className="space-y-6">
                  {/* Top Intents */}
                  <div className="p-4 bg-cyan-50 dark:bg-cyan-900/10 rounded-lg border border-cyan-200 dark:border-cyan-800">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Top Customer Intents</h4>
                    <div className="space-y-2">
                      {smartInsightsData.top_intents.slice(0, 5).map((intent, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                          <span className="text-sm text-gray-700 dark:text-gray-300">{intent.intent}</span>
                          <span className="text-xs px-2 py-1 bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 rounded-full">{intent.frequency} mentions</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pain Points */}
                  {smartInsightsData.pain_points.length > 0 && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Customer Pain Points</h4>
                      <div className="space-y-2">
                        {smartInsightsData.pain_points.slice(0, 5).map((pain, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                            <span className="text-sm text-gray-700 dark:text-gray-300">{pain.point}</span>
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full">{pain.frequency} instances</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Copy Themes */}
                  {smartInsightsData.suggested_copy_themes && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(smartInsightsData.suggested_copy_themes).map(([theme, suggestions]: [string, any]) => (
                        <div key={theme} className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3 capitalize">{theme.replace(/_/g, ' ')}</h5>
                          <ul className="space-y-2">
                            {suggestions.slice(0, 3).map((suggestion: string, idx: number) => (
                              <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                                <span className="text-purple-600 dark:text-purple-400">•</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                          <button
                            onClick={() => {
                              setShowCopyComposer(true);
                              setActiveSection('copy');
                              setSelectedInsightTheme(suggestions[0]);
                            }}
                            className="mt-3 w-full px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md"
                          >
                            Use Insight →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Analyzing your conversations...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Publishing Manager */}
      {activeSection === 'publish' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Send className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Publishing Manager</h3>
                </div>
                <button
                  onClick={() => {
                    setShowPublishModal(true);
                    setPublishAssetId(assetsData?.assets[0]?.id || null);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Publish Asset
                </button>
              </div>

              {/* Publish Modal */}
              {showPublishModal && (
                <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Asset
                      </label>
                      <select
                        value={publishAssetId || ''}
                        onChange={(e) => setPublishAssetId(parseInt(e.target.value))}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
                      >
                        <option value="">Choose an asset...</option>
                        {assetsData?.assets.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.title} ({asset.asset_type})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Platform
                      </label>
                      <select
                        value={publishPlatform}
                        onChange={(e) => setPublishPlatform(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
                      >
                        <option value="instagram">Instagram</option>
                        <option value="facebook">Facebook</option>
                        <option value="twitter">Twitter/X</option>
                        <option value="tiktok">TikTok</option>
                        <option value="linkedin">LinkedIn</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Schedule For (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduled_time}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPublishModal(false)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (!publishAssetId) {
                            alert('Please select an asset');
                            return;
                          }
                          publishAssetMutation.mutate({
                            asset_id: publishAssetId,
                            platform: publishPlatform,
                            scheduled_for: scheduled_time || null,
                          });
                        }}
                        className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium"
                      >
                        {scheduled_time ? 'Schedule' : 'Publish Now'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {publicationsData && publicationsData.publications.length > 0 ? (
                <div className="space-y-3">
                  {publicationsData.publications.map((pub) => (
                    <div key={pub.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded">
                            <Send className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{pub.platform}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {pub.published_at ? new Date(pub.published_at).toLocaleDateString() : 'Scheduled'}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          pub.status === 'published'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {pub.status}
                        </span>
                      </div>
                      {pub.engagement_metrics && (
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-white dark:bg-gray-800 p-2 rounded">
                            <p className="text-gray-500 dark:text-gray-400">Views</p>
                            <p className="font-medium text-gray-900 dark:text-white">{pub.engagement_metrics.views || 0}</p>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-2 rounded">
                            <p className="text-gray-500 dark:text-gray-400">Engagement</p>
                            <p className="font-medium text-gray-900 dark:text-white">{pub.engagement_metrics.engagement_rate || 0}%</p>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-2 rounded">
                            <p className="text-gray-500 dark:text-gray-400">Clicks</p>
                            <p className="font-medium text-gray-900 dark:text-white">{pub.engagement_metrics.clicks || 0}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Send className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">No published assets yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Analytics Dashboard */}
      {activeSection === 'analytics' && (
        <div className="space-y-4">
          {/* Key Metrics */}
          {dashboardMetricsData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Assets</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardMetricsData.total_assets}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <ImageIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Published</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardMetricsData.published_count}</p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Views</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{(dashboardMetricsData.total_views || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Eye className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">ROI</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardMetricsData.roi.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Performance Details */}
          {dashboardMetricsData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Engagement Metrics</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Clicks</span>
                    <span className="font-medium text-gray-900 dark:text-white">{dashboardMetricsData.total_clicks}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Conversions</span>
                    <span className="font-medium text-gray-900 dark:text-white">{dashboardMetricsData.total_conversions}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Conversion Rate</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {dashboardMetricsData.total_views > 0 
                        ? ((dashboardMetricsData.total_conversions / dashboardMetricsData.total_views) * 100).toFixed(2)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Financial Metrics</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Total Spend</span>
                    <span className="font-medium text-gray-900 dark:text-white">${dashboardMetricsData.total_spend.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Total Revenue</span>
                    <span className="font-medium text-gray-900 dark:text-white">${dashboardMetricsData.total_revenue.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/10 rounded border border-green-200 dark:border-green-800">
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Profit</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      ${(dashboardMetricsData.total_revenue - dashboardMetricsData.total_spend).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Usage Insights */}
          {insightsData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Assets by Type</h4>
                <div className="space-y-2">
                  {insightsData.assets_by_type.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{item.type}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Assets by Platform</h4>
                <div className="space-y-2">
                  {insightsData.assets_by_platform.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{item.platform}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Assets by Status</h4>
                <div className="space-y-2">
                  {insightsData.assets_by_status.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{item.status}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Original Insights Section - Kept for backwards compatibility */}
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
          )}
        </div>
      )}
    </>
  );
}
