'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ShoppingBag,
  Package,
  FileText,
  MessageSquare,
  CreditCard,
  BarChart3,
  Plus,
  Box,
  Download,
  Globe,
  Lock,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  Shield,
  Edit,
  Trash2,
  Eye,
  X,
  File,
  FileVideo,
  FileAudio,
  Key,
  ExternalLink as LinkIcon,
  Zap,
  Tag,
  Calendar,
  Users,
  Layers,
  ArrowRight,
  Info,
  AlertCircle,
  Smartphone,
  Send,
  UserCheck,
  GitBranch,
  Target,
  Percent,
  Image as ImageIcon,
  Play,
  Headphones,
  Receipt,
  TrendingDown,
  Filter,
  RefreshCw,
  ShieldCheck,
  FileCheck,
  Coins,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SalesProductsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('products');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check if user has access (Admin or Business Owner only)
    if (user && user.role !== 'admin' && user.role !== 'business_owner') {
      router.push('/dashboard');
    }
  }, [user, isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || (user && user.role !== 'admin' && user.role !== 'business_owner')) {
    return null;
  }

  const tabs = [
    { id: 'products', name: 'Products', icon: Package },
    { id: 'digital-assets', name: 'Digital Assets', icon: Download },
    { id: 'services', name: 'Services', icon: Globe },
    { id: 'bundles', name: 'Bundles', icon: Layers },
    { id: 'conversational-sales', name: 'Conversational Sales & Automation', icon: MessageSquare },
    { id: 'orders', name: 'Orders', icon: ShoppingCart },
    { id: 'sales-analytics', name: 'Sales Analytics', icon: BarChart3 },
    { id: 'payments', name: 'Payments & Billing', icon: CreditCard },
  ];

  // Sample product data (read-only preview)
  const sampleProducts = [
    {
      id: 'PROD-001',
      name: 'Premium Consultation Package',
      type: 'service',
      category: 'Consulting',
      price: '$299.00',
      channels: ['telegram', 'whatsapp'],
      status: 'active',
      aiReady: true,
      linkedIntents: ['consultation', 'pricing'],
    },
    {
      id: 'PROD-002',
      name: 'Digital Marketing Guide',
      type: 'digital',
      category: 'Education',
      price: '$49.00',
      channels: ['telegram', 'website'],
      status: 'active',
      aiReady: true,
      linkedIntents: ['education', 'resources'],
    },
    {
      id: 'PROD-003',
      name: 'Physical Product Sample',
      type: 'physical',
      category: 'Retail',
      price: '$99.00',
      channels: ['telegram'],
      status: 'draft',
      aiReady: false,
      linkedIntents: [],
    },
    {
      id: 'PROD-004',
      name: 'Monthly Subscription',
      type: 'subscription',
      category: 'Services',
      price: '$29.00/mo',
      channels: ['telegram', 'whatsapp', 'website'],
      status: 'active',
      aiReady: true,
      linkedIntents: ['subscription', 'pricing'],
    },
  ];

  const sampleDigitalAssets = [
    {
      id: 'ASSET-001',
      name: 'Product Guide PDF',
      type: 'pdf',
      size: '2.4 MB',
      linkedProduct: 'PROD-002',
      deliveryMethod: 'secure_link',
      accessRules: 'single_download',
      status: 'active',
    },
    {
      id: 'ASSET-002',
      name: 'Tutorial Video',
      type: 'video',
      size: '45.2 MB',
      linkedProduct: 'PROD-001',
      deliveryMethod: 'streaming',
      accessRules: 'time_limited',
      status: 'active',
    },
    {
      id: 'ASSET-003',
      name: 'License Key Bundle',
      type: 'license',
      size: 'N/A',
      linkedProduct: 'PROD-004',
      deliveryMethod: 'email',
      accessRules: 'one_time',
      status: 'active',
    },
  ];

  const sampleServices = [
    {
      id: 'SRV-001',
      name: '1-on-1 Strategy Session',
      description: 'Personalized business strategy consultation',
      duration: '60 minutes',
      pricingModel: 'fixed',
      price: '$199.00',
      channels: ['telegram', 'whatsapp'],
      aiReady: true,
    },
    {
      id: 'SRV-002',
      name: 'Technical Support Package',
      description: 'Priority technical support and troubleshooting',
      duration: 'Ongoing',
      pricingModel: 'subscription',
      price: '$49.00/mo',
      channels: ['telegram'],
      aiReady: true,
    },
  ];

  const sampleBundles = [
    {
      id: 'BUNDLE-001',
      name: 'Complete Business Starter',
      products: ['PROD-001', 'PROD-002', 'SRV-001'],
      bundlePrice: '$399.00',
      savings: '$48.00',
      aiRecommendation: true,
      crossSell: ['PROD-004'],
    },
  ];

  const getProductTypeBadge = (type: string) => {
    const badges = {
      physical: { label: 'Physical', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' },
      digital: { label: 'Digital', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400' },
      service: { label: 'Service', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' },
      subscription: { label: 'Subscription', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' },
    };
    return badges[type as keyof typeof badges] || badges.physical;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { label: 'Active', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400', icon: CheckCircle2 },
      draft: { label: 'Draft', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400', icon: Clock },
      archived: { label: 'Archived', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400', icon: XCircle },
    };
    return badges[status as keyof typeof badges] || badges.draft;
  };

  const getAssetTypeIcon = (type: string) => {
    const icons = {
      pdf: FileText,
      video: FileVideo,
      audio: FileAudio,
      license: Key,
      link: LinkIcon,
    };
    return icons[type as keyof typeof icons] || File;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Sales & Products
            </h1>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800">
              Coming Soon
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage products, digital assets, and conversational sales flows across all connected channels.
          </p>
        </div>
      </div>

      {/* Sales Overview Preview */}
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Sales Overview
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 italic">
              Preview
            </span>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: 'Total Products', value: '—', icon: Package, tooltip: 'Available once the Sales & Products module is activated' },
              { name: 'Active Listings', value: '—', icon: ShoppingBag, tooltip: 'Available once the Sales & Products module is activated' },
              { name: 'Orders', value: '—', icon: ShoppingCart, tooltip: 'Available once the Sales & Products module is activated' },
              { name: 'Revenue', value: '—', icon: DollarSign, tooltip: 'Available once the Sales & Products module is activated' },
            ].map((stat) => (
              <div
                key={stat.name}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 opacity-75"
                title={stat.tooltip}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <stat.icon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-4 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        {stat.name}
                      </dt>
                      <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-1 px-4" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Product Catalog
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Manage physical products, digital products, services, and subscriptions
                  </p>
                </div>
                <button
                  disabled
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-50"
                  title="Coming Soon"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </button>
              </div>

              {/* Product List */}
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Channels
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        AI Ready
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sampleProducts.map((product) => {
                      const typeBadge = getProductTypeBadge(product.type);
                      const statusBadge = getStatusBadge(product.status);
                      const StatusIcon = statusBadge.icon;
                      return (
                        <tr
                          key={product.id}
                          className="opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => setSelectedProduct(product.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {product.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {product.id}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={cn('px-2 py-1 text-xs font-medium rounded-full', typeBadge.color)}>
                              {typeBadge.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {product.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {product.price}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              {product.channels.map((channel) => (
                                <span
                                  key={channel}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize"
                                >
                                  {channel}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={cn('px-2 py-1 inline-flex items-center text-xs font-medium rounded-full', statusBadge.color)}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {product.aiReady ? (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-400">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Ready
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                disabled
                                className="text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
                                title="Coming Soon"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                disabled
                                className="text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
                                title="Coming Soon"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                disabled
                                className="text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
                                title="Coming Soon"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Digital Assets Tab */}
          {activeTab === 'digital-assets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Digital Asset Management
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Manage PDFs, videos, audio files, license keys, and secure links
                  </p>
                </div>
                <button
                  disabled
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-50"
                  title="Coming Soon"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Asset
                </button>
              </div>

              {sampleDigitalAssets.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                    <Download className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    No digital assets yet
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                    Digital assets will be automatically delivered to customers after purchase once this module is activated.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Asset
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Size
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Linked Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Delivery Method
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Access Rules
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {sampleDigitalAssets.map((asset) => {
                        const AssetIcon = getAssetTypeIcon(asset.type);
                        return (
                          <tr key={asset.id} className="opacity-75">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <AssetIcon className="h-5 w-5 text-gray-400 mr-3" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {asset.name}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {asset.id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 uppercase">
                                {asset.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {asset.size}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {asset.linkedProduct}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                              {asset.deliveryMethod.replace('_', ' ')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                              {asset.accessRules.replace('_', ' ')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 inline-flex items-center text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {asset.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Services Catalog
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Manage one-time services, consultations, and bookable services
                  </p>
                </div>
                <button
                  disabled
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-50"
                  title="Coming Soon"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {sampleServices.map((service) => (
                  <div
                    key={service.id}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 opacity-75"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            {service.name}
                          </h4>
                          {service.aiReady && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-400">
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI Ready
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          {service.description}
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                            <span className="ml-2 text-gray-900 dark:text-white font-medium">
                              {service.duration}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Pricing:</span>
                            <span className="ml-2 text-gray-900 dark:text-white font-medium capitalize">
                              {service.pricingModel}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Price:</span>
                            <span className="ml-2 text-gray-900 dark:text-white font-medium">
                              {service.price}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Channels:</span>
                            <div className="flex gap-1 mt-1">
                              {service.channels.map((channel) => (
                                <span
                                  key={channel}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 capitalize"
                                >
                                  {channel}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bundles Tab */}
          {activeTab === 'bundles' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Product Bundles
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Create bundles with multiple products, cross-sell and upsell opportunities
                  </p>
                </div>
                <button
                  disabled
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-50"
                  title="Coming Soon"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Bundle
                </button>
              </div>

              {sampleBundles.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                    <Layers className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    No bundles yet
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                    Create product bundles to offer customers combined packages at special prices.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sampleBundles.map((bundle) => (
                    <div
                      key={bundle.id}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 border border-gray-200 dark:border-gray-600 opacity-75"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-base font-medium text-gray-900 dark:text-white">
                              {bundle.name}
                            </h4>
                            {bundle.aiRecommendation && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-400">
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI Recommended
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Bundle ID: {bundle.id}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {bundle.bundlePrice}
                          </div>
                          <div className="text-xs text-green-600 dark:text-green-400">
                            Save {bundle.savings}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Included Products
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {bundle.products.map((productId) => (
                            <span
                              key={productId}
                              className="inline-flex items-center px-2 py-1 rounded text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                            >
                              {productId}
                            </span>
                          ))}
                        </div>
                        {bundle.crossSell && bundle.crossSell.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                              Cross-Sell Opportunities
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {bundle.crossSell.map((productId) => (
                                <span
                                  key={productId}
                                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400"
                                >
                                  <ArrowRight className="h-3 w-3 mr-1" />
                                  {productId}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Conversational Sales & Automation Tab */}
          {activeTab === 'conversational-sales' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                  Conversational Sales & Automation
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Visualize how products will be recommended by AI, sold through conversations, and automated via sales rules
                </p>
              </div>

              {/* AI Product Recommendation Mapping */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-medium text-gray-900 dark:text-white">
                      AI Product Recommendation Mapping
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400 italic">Preview</span>
                  </div>
                  
                  <div className="space-y-4">
                    {sampleProducts.filter(p => p.aiReady).map((product) => (
                      <div
                        key={product.id}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 opacity-75"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-400">
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI Recommendable
                              </span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {product.name}
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                  Linked Intents:
                                </span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {product.linkedIntents.map((intent) => (
                                    <span
                                      key={intent}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400"
                                    >
                                      <Zap className="h-3 w-3 mr-1" />
                                      {intent}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                  Trigger Phrases (Preview):
                                </span>
                                <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                                  "What's the price?", "Tell me about...", "I need..."
                                </p>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                  Confidence Level:
                                </span>
                                <div className="mt-1 flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div className="bg-primary-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">85%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Flow Visualization */}
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex items-center gap-2 text-xs">
                            <div className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                              <MessageSquare className="h-3 w-3" />
                              Intent
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <div className="flex items-center gap-1 px-2 py-1 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400">
                              <Package className="h-3 w-3" />
                              Product
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <div className="flex items-center gap-1 px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                              <Send className="h-3 w-3" />
                              Response
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Channel-Aware Product Presentation */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-medium text-gray-900 dark:text-white">
                      Channel-Aware Product Presentation
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400 italic">Preview</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[
                      { name: 'WhatsApp', icon: MessageSquare, supportsCards: true, supportsMedia: true },
                      { name: 'Telegram', icon: Send, supportsCards: true, supportsMedia: true },
                      { name: 'Instagram DM', icon: ImageIcon, supportsCards: false, supportsMedia: true },
                      { name: 'Facebook Messenger', icon: MessageSquare, supportsCards: true, supportsMedia: true },
                      { name: 'Website Chat', icon: Globe, supportsCards: true, supportsMedia: true },
                    ].map((channel) => (
                      <div
                        key={channel.name}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 opacity-75"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <channel.icon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {channel.name}
                          </span>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="bg-white dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-600">
                            <div className="font-medium text-gray-900 dark:text-white mb-1">
                              Premium Consultation
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 mb-2">
                              $299.00
                            </div>
                            {channel.supportsCards && (
                              <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 mb-2">
                                <Package className="h-3 w-3" />
                                <span>Rich card layout</span>
                              </div>
                            )}
                            {channel.supportsMedia && (
                              <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 mb-2">
                                <ImageIcon className="h-3 w-3" />
                                <span>Media attachments</span>
                              </div>
                            )}
                            <div className="flex gap-1 mt-2">
                              <button
                                disabled
                                className="flex-1 px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded cursor-not-allowed opacity-50"
                                title="Coming Soon"
                              >
                                Learn More
                              </button>
                              <button
                                disabled
                                className="flex-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded cursor-not-allowed opacity-50"
                                title="Coming Soon"
                              >
                                Buy Now
                              </button>
                            </div>
                          </div>
                          {!channel.supportsCards && (
                            <p className="text-gray-500 dark:text-gray-400 italic">
                              Text-only fallback mode
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Conversational Sales Flows */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-medium text-gray-900 dark:text-white">
                      Conversational Sales Flows
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400 italic">Preview</span>
                  </div>
                  
                  <div className="space-y-6">
                    {[
                      {
                        title: 'Price Inquiry → Product Suggestion',
                        steps: [
                          { label: 'User asks for price', icon: MessageSquare, color: 'blue' },
                          { label: 'AI detects intent', icon: Sparkles, color: 'purple' },
                          { label: 'Product recommendation', icon: Package, color: 'green' },
                          { label: 'Purchase option', icon: ShoppingCart, color: 'yellow' },
                        ],
                      },
                      {
                        title: 'Product Comparison → Recommendation',
                        steps: [
                          { label: 'User compares products', icon: Layers, color: 'blue' },
                          { label: 'AI analyzes preferences', icon: Sparkles, color: 'purple' },
                          { label: 'Best match suggested', icon: Target, color: 'green' },
                          { label: 'Detailed comparison', icon: BarChart3, color: 'yellow' },
                        ],
                      },
                      {
                        title: 'Upsell / Cross-Sell Suggestion',
                        steps: [
                          { label: 'Product viewed', icon: Eye, color: 'blue' },
                          { label: 'AI identifies opportunity', icon: Sparkles, color: 'purple' },
                          { label: 'Related product shown', icon: ArrowRight, color: 'green' },
                          { label: 'Bundle offer', icon: Layers, color: 'yellow' },
                        ],
                      },
                      {
                        title: 'Out-of-Scope → Human Handoff',
                        steps: [
                          { label: 'Complex question', icon: AlertCircle, color: 'blue' },
                          { label: 'Low AI confidence', icon: AlertCircle, color: 'yellow' },
                          { label: 'Escalation triggered', icon: UserCheck, color: 'orange' },
                          { label: 'Human agent notified', icon: Users, color: 'green' },
                        ],
                      },
                    ].map((flow, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 opacity-75"
                      >
                        <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                          {flow.title}
                        </h5>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                          {flow.steps.map((step, stepIdx) => {
                            const colorClasses = {
                              blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
                              purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
                              green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
                              yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
                              orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
                            };
                            return (
                              <div key={stepIdx} className="flex items-center gap-2 min-w-0">
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colorClasses[step.color as keyof typeof colorClasses]}`}>
                                  <step.icon className="h-4 w-4 flex-shrink-0" />
                                  <span className="text-xs font-medium whitespace-nowrap">{step.label}</span>
                                </div>
                                {stepIdx < flow.steps.length - 1 && (
                                  <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sales Automation Rules */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-medium text-gray-900 dark:text-white">
                      Sales Automation Rules
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400 italic">Visibility Only</span>
                  </div>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                          Managed from AI Rules & Automation
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                          Sales automation rules are configured in the AI Rules & Automation module (Coming Soon)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        rule: 'If user asks for price → show product',
                        icon: DollarSign,
                        status: 'locked',
                      },
                      {
                        rule: 'If product viewed but not purchased → follow-up',
                        icon: Eye,
                        status: 'locked',
                      },
                      {
                        rule: 'If high-intent detected → notify human agent',
                        icon: AlertCircle,
                        status: 'locked',
                      },
                      {
                        rule: 'If digital product purchased → auto-delivery',
                        icon: Download,
                        status: 'future',
                      },
                    ].map((automation, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 opacity-75"
                      >
                        <div className="flex-shrink-0">
                          <automation.icon className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 dark:text-white">
                            {automation.rule}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <Lock className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Human Handoff Integration */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-medium text-gray-900 dark:text-white">
                      Human Handoff Integration
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400 italic">Preview</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 opacity-75">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                            AI Confidence Drop Indicator
                          </h5>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            When AI confidence falls below threshold, handoff is automatically triggered
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">45% confidence</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 opacity-75">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                        Escalation Triggers
                      </h5>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {[
                          'Complex pricing inquiry',
                          'Product customization request',
                          'Payment issue',
                          'Technical support needed',
                        ].map((trigger, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <CheckCircle2 className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">{trigger}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 opacity-75">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <UserCheck className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                            Agent Notification Preview
                          </h5>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Human agents receive notifications when conversations are escalated
                          </p>
                          <div className="bg-white dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-600">
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-medium">New handoff:</span> Conversation #1234 requires human assistance
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 opacity-75">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                        Conversation Ownership Transfer (Visual Only)
                      </h5>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-400">AI Assistant</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                          <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-xs font-medium text-green-700 dark:text-green-400">Human Agent</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">
                        Full conversation context is transferred to the assigned agent
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Orders
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Track orders, deliveries, and customer transactions
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-50"
                    title="Coming Soon"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </button>
                  <button
                    disabled
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-50"
                    title="Coming Soon"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Orders Table */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Order ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Product / Service
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Channel
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {[
                        {
                          id: 'ORD-001',
                          product: 'Premium Consultation Package',
                          customer: 'user@example.com',
                          channel: 'telegram',
                          status: 'completed',
                          timestamp: '2024-01-15 14:30',
                          amount: '$299.00',
                        },
                        {
                          id: 'ORD-002',
                          product: 'Digital Marketing Guide',
                          customer: '+1234567890',
                          channel: 'whatsapp',
                          status: 'pending',
                          timestamp: '2024-01-15 16:45',
                          amount: '$49.00',
                        },
                        {
                          id: 'ORD-003',
                          product: 'Product Bundle',
                          customer: 'user2@example.com',
                          channel: 'website',
                          status: 'failed',
                          timestamp: '2024-01-14 10:20',
                          amount: '$199.00',
                        },
                        {
                          id: 'ORD-004',
                          product: 'Monthly Subscription',
                          customer: '+0987654321',
                          channel: 'telegram',
                          status: 'refunded',
                          timestamp: '2024-01-13 09:15',
                          amount: '$29.00',
                        },
                      ].map((order) => {
                        const statusConfig = {
                          pending: { label: 'Pending', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400', icon: Clock },
                          completed: { label: 'Completed', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400', icon: CheckCircle2 },
                          failed: { label: 'Failed', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400', icon: XCircle },
                          refunded: { label: 'Refunded', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400', icon: RefreshCw },
                        };
                        const status = statusConfig[order.status as keyof typeof statusConfig];
                        const StatusIcon = status.icon;
                        return (
                          <tr key={order.id} className="opacity-75 hover:opacity-100 transition-opacity">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {order.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {order.product}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {order.amount}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {order.customer}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                                {order.channel}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={cn('px-2 py-1 inline-flex items-center text-xs font-medium rounded-full', status.color)}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {order.timestamp}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                disabled
                                className="text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
                                title="Coming Soon"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 text-center border-t border-gray-200 dark:border-gray-600">
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    Orders will appear here once the Sales & Products module is activated.
                  </p>
                </div>
              </div>

              {/* Order Detail Preview */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-5 sm:p-6">
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                    Order Detail Preview
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 opacity-75">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Products Included
                        </label>
                        <div className="mt-2 space-y-1">
                          <div className="text-sm text-gray-900 dark:text-white">Premium Consultation Package</div>
                          <div className="text-sm text-gray-900 dark:text-white">Digital Marketing Guide</div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Delivery Method
                        </label>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
                          Digital / Service / Physical (configured per product)
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Payment Status
                        </label>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
                          Payment status will be displayed here once activated
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Automation Status
                        </label>
                        <div className="mt-2 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-900 dark:text-white">Auto-processed</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          AI Involvement
                        </label>
                        <div className="mt-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary-500" />
                          <span className="text-sm text-gray-900 dark:text-white">AI-assisted sale</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sales Analytics Tab */}
          {activeTab === 'sales-analytics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Sales Analytics
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    High-level sales performance summary (Detailed reports available in Analytics & Reports)
                  </p>
                </div>
                <button
                  disabled
                  className="text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
                  title="Coming Soon"
                >
                  View detailed reports in Analytics & Reports →
                </button>
              </div>

              {/* Analytics Summary Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { name: 'Revenue', value: '—', icon: DollarSign, change: '+12%', tooltip: 'Available in future phases' },
                  { name: 'Conversion Rate', value: '—', icon: TrendingUp, change: '+5%', tooltip: 'Available in future phases' },
                  { name: 'Top Product', value: '—', icon: Package, change: 'N/A', tooltip: 'Available in future phases' },
                  { name: 'Channel Performance', value: '—', icon: Globe, change: 'N/A', tooltip: 'Available in future phases' },
                ].map((stat) => (
                  <div
                    key={stat.name}
                    className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700 opacity-75"
                    title={stat.tooltip}
                  >
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <stat.icon className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                              {stat.name}
                            </dt>
                            <dd className="flex items-baseline">
                              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                                {stat.value}
                              </div>
                              {stat.change !== 'N/A' && (
                                <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                                  <TrendingUp className="h-4 w-4" />
                                  {stat.change}
                                </div>
                              )}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chart Placeholders */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="px-4 py-5 sm:p-6">
                    <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                      Revenue Trend
                    </h4>
                    <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-xs text-gray-400 dark:text-gray-500">Chart placeholder</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="px-4 py-5 sm:p-6">
                    <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                      Top-Performing Products
                    </h4>
                    <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="text-center">
                        <TrendingUp className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-xs text-gray-400 dark:text-gray-500">Chart placeholder</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="px-4 py-5 sm:p-6">
                    <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                      Channel Performance
                    </h4>
                    <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="text-center">
                        <Globe className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-xs text-gray-400 dark:text-gray-500">Chart placeholder</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="px-4 py-5 sm:p-6">
                    <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                      Funnel Drop-offs
                    </h4>
                    <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="text-center">
                        <TrendingDown className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-xs text-gray-400 dark:text-gray-500">Chart placeholder</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Intent → Purchase Correlation */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-5 sm:p-6">
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                    Intent → Purchase Correlation
                  </h4>
                  <div className="space-y-3">
                    {[
                      { intent: 'pricing_inquiry', conversionRate: '—', purchases: '—' },
                      { intent: 'product_comparison', conversionRate: '—', purchases: '—' },
                      { intent: 'feature_request', conversionRate: '—', purchases: '—' },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 opacity-75"
                      >
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                            {item.intent.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Conversion: </span>
                            <span className="text-gray-900 dark:text-white font-medium">{item.conversionRate}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Purchases: </span>
                            <span className="text-gray-900 dark:text-white font-medium">{item.purchases}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 italic">
                    Intent-to-purchase correlation data will be available once the module is activated
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payments & Billing Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Payments & Billing Readiness
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Configure payment gateways, currencies, and billing settings (Coming Soon)
                </p>
              </div>

              {/* Payment Gateway Placeholders */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-5 sm:p-6">
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                    Supported Payment Gateways
                  </h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      { name: 'Stripe', icon: CreditCard, region: 'Global' },
                      { name: 'PayPal', icon: Wallet, region: 'Global' },
                      { name: 'Flutterwave', icon: Coins, region: 'Africa' },
                      { name: 'Paystack', icon: CreditCard, region: 'Africa' },
                      { name: 'M-Pesa', icon: Smartphone, region: 'East Africa' },
                      { name: 'Airtel Money', icon: Smartphone, region: 'Africa & Asia' },
                      { name: 'Crypto', icon: Coins, region: 'Global', future: true },
                    ].map((gateway) => (
                      <div
                        key={gateway.name}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 opacity-75"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <gateway.icon className="h-5 w-5 text-gray-400" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {gateway.name}
                                </span>
                                {gateway.future && (
                                  <span className="px-1.5 py-0.5 text-xs rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
                                    Future
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {gateway.region}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Status:</span>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            Not Connected
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Currency & Tax Readiness */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-5 sm:p-6">
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                    Currency & Tax Configuration
                  </h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 opacity-75">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Currency Support
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Multi-currency support will be available once activated
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {['USD', 'EUR', 'GBP', 'KES', 'NGN', 'ZAR'].map((currency) => (
                          <span
                            key={currency}
                            className="px-2 py-0.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400"
                          >
                            {currency}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 opacity-75">
                      <div className="flex items-center gap-2 mb-2">
                        <Receipt className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Tax & Invoice Readiness
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Automated tax calculation and invoice generation
                      </p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">VAT/GST support</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">Invoice templates</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">Receipt generation</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance & Security */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-5 sm:p-6">
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                    Compliance & Security
                  </h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[
                      {
                        title: 'Secure Payment Handling',
                        icon: ShieldCheck,
                        items: ['PCI DSS compliance', 'Encrypted transactions', 'Tokenized storage'],
                      },
                      {
                        title: 'Role-Based Access Control',
                        icon: Users,
                        items: ['Admin-only payment config', 'Audit trail access', 'Transaction visibility'],
                      },
                      {
                        title: 'Audit Logs',
                        icon: FileCheck,
                        items: ['All transactions logged', 'Immutable records', 'Compliance reporting'],
                      },
                      {
                        title: 'Data Retention',
                        icon: Clock,
                        items: ['Transaction history', 'Configurable retention', 'GDPR compliant'],
                      },
                    ].map((section, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 opacity-75"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <section.icon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {section.title}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {section.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex items-center gap-2 text-xs">
                              <CheckCircle2 className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-400">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                          Data Encryption Standards
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                          All payment data is encrypted using industry-standard protocols. Full encryption details will be available once the module is activated.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Panel (Slide-over) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedProduct(null)} />
          <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
            <div className="w-screen max-w-2xl">
              <div className="h-full flex flex-col bg-white dark:bg-gray-800 shadow-xl">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                      Product Details
                    </h2>
                    <button
                      onClick={() => setSelectedProduct(null)}
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {(() => {
                    const product = sampleProducts.find((p) => p.id === selectedProduct);
                    if (!product) return null;
                    const typeBadge = getProductTypeBadge(product.type);
                    const statusBadge = getStatusBadge(product.status);
                    const StatusIcon = statusBadge.icon;
                    return (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className={cn('px-2 py-1 text-xs font-medium rounded-full', typeBadge.color)}>
                              {typeBadge.label}
                            </span>
                            <span className={cn('px-2 py-1 inline-flex items-center text-xs font-medium rounded-full', statusBadge.color)}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusBadge.label}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Product ID
                            </label>
                            <p className="mt-1 text-sm text-gray-900 dark:text-white">
                              {product.id}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Category
                            </label>
                            <p className="mt-1 text-sm text-gray-900 dark:text-white">
                              {product.category}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Price
                            </label>
                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                              {product.price}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Pricing Structure
                            </label>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 italic">
                              Single price (Tiered pricing available in future)
                            </p>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                            Description
                          </label>
                          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                            Product description will be displayed here once the module is activated.
                          </p>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                            Channel Visibility
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {product.channels.map((channel) => (
                              <span
                                key={channel}
                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize"
                              >
                                {channel}
                              </span>
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
                            Channel visibility rules will be configurable once the module is activated.
                          </p>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                            Linked Intents
                          </label>
                          {product.linkedIntents.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {product.linkedIntents.map((intent) => (
                                <span
                                  key={intent}
                                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400"
                                >
                                  <Zap className="h-3 w-3 mr-1" />
                                  {intent}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                              No intents linked. Link intents from AI Rules module once activated.
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                            Linked Digital Assets
                          </label>
                          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                            Digital assets linked to this product will be displayed here once the module is activated.
                          </p>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                            Sales Automation Readiness
                          </label>
                          <div className="flex items-center gap-2">
                            {product.aiReady ? (
                              <>
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                <span className="text-sm text-gray-900 dark:text-white">
                                  Ready for AI-powered sales automation
                                </span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-5 w-5 text-yellow-500" />
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  Configuration required for AI automation
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                            Lifecycle Status
                          </label>
                          <div className="flex items-center gap-2">
                            <StatusIcon className={cn('h-5 w-5', statusBadge.color)} />
                            <span className={cn('text-sm font-medium', statusBadge.color)}>
                              {statusBadge.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setSelectedProduct(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Close
                    </button>
                    <button
                      disabled
                      className="px-4 py-2 text-sm font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md cursor-not-allowed opacity-50"
                      title="Coming Soon"
                    >
                      Edit Product
                    </button>
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
