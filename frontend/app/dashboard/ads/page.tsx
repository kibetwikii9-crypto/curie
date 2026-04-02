'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Play, Pause, CheckCircle, XCircle, BarChart3, Video, TestTube } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Campaign {
  id: number
  name: string
  description?: string
  platform: string
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled'
  campaign_type: 'standard' | 'ab_test' | 'video' | 'automated'
  objective: string
  budget?: number
  budget_type: string
  scheduled_at?: string
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

interface DashboardStats {
  total_campaigns: number
  active_campaigns: number
  total_impressions: number
  total_clicks: number
  total_spend: number
  avg_ctr: number
  avg_roas: number
}

export default function AdsDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Load campaigns
      const campaignsResponse = await fetch('/api/ads/campaigns?limit=20')
      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json()
        setCampaigns(campaignsData.campaigns || [])
      }

      // Load analytics overview
      const analyticsResponse = await fetch('/api/ads/analytics/overview')
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json()
        setStats({
          total_campaigns: analyticsData.campaigns?.total || 0,
          active_campaigns: analyticsData.campaigns?.by_status?.running || 0,
          total_impressions: analyticsData.performance?.total_impressions || 0,
          total_clicks: analyticsData.performance?.total_clicks || 0,
          total_spend: analyticsData.performance?.total_spend || 0,
          avg_ctr: analyticsData.performance?.avg_ctr || 0,
          avg_roas: analyticsData.performance?.avg_roas || 0
        })
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500'
      case 'scheduled': return 'bg-blue-500'
      case 'paused': return 'bg-yellow-500'
      case 'completed': return 'bg-gray-500'
      case 'cancelled': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="w-3 h-3" />
      case 'scheduled': return <Play className="w-3 h-3" />
      case 'paused': return <Pause className="w-3 h-3" />
      case 'completed': return <CheckCircle className="w-3 h-3" />
      case 'cancelled': return <XCircle className="w-3 h-3" />
      default: return null
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const formatPercentage = (num: number) => {
    return (num * 100).toFixed(2) + '%'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ads Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your advertising campaigns and track performance</p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/ads/create')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_campaigns}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active_campaigns} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Impressions</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.total_impressions)}</div>
              <p className="text-xs text-muted-foreground">
                Total reach
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clicks</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.total_clicks)}</div>
              <p className="text-xs text-muted-foreground">
                CTR: {formatPercentage(stats.avg_ctr)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.total_spend)}</div>
              <p className="text-xs text-muted-foreground">
                ROAS: {stats.avg_roas.toFixed(2)}x
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="video">Video Projects</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Recent Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Campaigns</CardTitle>
              <CardDescription>Your latest advertising campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating your first campaign.</p>
                  <div className="mt-6">
                    <Button onClick={() => router.push('/dashboard/ads/create')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Campaign
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.slice(0, 5).map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(campaign.status)}`} />
                        <div>
                          <h4 className="font-medium">{campaign.name}</h4>
                          <p className="text-sm text-gray-500">{campaign.platform} • {campaign.objective}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className="flex items-center gap-1">
                          {getStatusIcon(campaign.status)}
                          {campaign.status}
                        </Badge>
                        <Button
                          variant="outline"
                          onClick={() => router.push(`/dashboard/ads/${campaign.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button onClick={() => router.push('/dashboard/ads/create')} className="block hover:opacity-90 transition-opacity">
              <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Create Campaign
                  </CardTitle>
                  <CardDescription>Start a new advertising campaign</CardDescription>
                </CardHeader>
              </Card>
            </button>

            <button onClick={() => router.push('/dashboard/ads/video')} className="block hover:opacity-90 transition-opacity">
              <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    Video Editor
                  </CardTitle>
                  <CardDescription>Create and edit video ads</CardDescription>
                </CardHeader>
              </Card>
            </button>

            <button onClick={() => router.push('/dashboard/ads/ab-tests')} className="block hover:opacity-90 transition-opacity">
              <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TestTube className="w-5 h-5" />
                    A/B Tests
                  </CardTitle>
                  <CardDescription>Test different ad variations</CardDescription>
                </CardHeader>
              </Card>
            </button>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Campaigns</CardTitle>
              <CardDescription>Manage all your advertising campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No campaigns found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(campaign.status)}`} />
                        <div>
                          <h4 className="font-medium">{campaign.name}</h4>
                          <p className="text-sm text-gray-500">
                            {campaign.platform} • {campaign.objective}
                            {campaign.budget && ` • Budget: ${formatCurrency(campaign.budget)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className="flex items-center gap-1">
                          {getStatusIcon(campaign.status)}
                          {campaign.status}
                        </Badge>
                        <Button
                          variant="outline"
                          onClick={() => router.push(`/dashboard/ads/${campaign.id}`)}
                        >
                          Manage
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="video" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Video Projects</CardTitle>
              <CardDescription>Create and manage video advertisements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Video className="mx-auto h-12 w-12 text-blue-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Video Editor is Ready</h3>
                <p className="mt-1 text-sm text-gray-500">Open the dedicated video editor dashboard to create and edit projects.</p>
                <div className="mt-6">
                  <Button onClick={() => router.push('/dashboard/ads/video')}>
                    Open Video Editor
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>Detailed insights into your campaign performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Analytics Dashboard</h3>
                <p className="mt-1 text-sm text-gray-500">Comprehensive analytics will be available here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
