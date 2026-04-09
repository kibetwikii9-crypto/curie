'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Edit, Play, Pause, Trash2, BarChart3, Users, Target, DollarSign } from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface Campaign {
  id: string
  name: string
  description: string
  platform: string
  campaign_type: string
  objective: string
  status: string
  target_audience: {
    age_range: string
    gender: string
    interests: string[]
    location: string
  }
  budget: number | null
  budget_type: string
  scheduled_at: string | null
  created_at: string
  updated_at: string
}

interface CampaignStats {
  impressions: number
  clicks: number
  conversions: number
  spend: number
  ctr: number
  cpc: number
  cpm: number
  roas: number
}

export default function CampaignDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const campaignId = params.id as string

  useEffect(() => {
    fetchCampaign()
    fetchStats()
  }, [campaignId])

  const fetchCampaign = async () => {
    try {
      const response = await apiFetch(`/api/ads/campaigns/${campaignId}`)
      if (response.ok) {
        const data = await response.json()
        setCampaign(data)
      } else {
        throw new Error('Failed to fetch campaign')
      }
    } catch (error) {
      console.error('Error fetching campaign:', error)
      toast({
        title: 'Error',
        description: 'Failed to load campaign details',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await apiFetch(`/api/ads/campaigns/${campaignId}/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const updateCampaignStatus = async (status: string) => {
    setActionLoading(true)
    try {
      const response = await apiFetch(`/api/ads/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        const updatedPayload = await response.json()
        setCampaign((prev) => prev ? { ...prev, ...updatedPayload.campaign } : prev)
        toast({
          title: 'Success',
          description: `Campaign ${status.toLowerCase()} successfully`
        })
      } else {
        throw new Error('Failed to update campaign status')
      }
    } catch (error) {
      console.error('Error updating campaign status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update campaign status',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'bg-green-100 text-green-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const getPlatformLabel = (platform: string) => {
    const platforms: { [key: string]: string } = {
      facebook: 'Facebook',
      instagram: 'Instagram',
      whatsapp: 'WhatsApp',
      telegram: 'Telegram',
      webchat: 'Web Chat',
      email: 'Email'
    }
    return platforms[platform] || platform
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading campaign details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Campaign Not Found</h1>
          <Button onClick={() => router.push('/dashboard/ads')}>
            Back to Ads Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/ads')}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Ads
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
            <p className="text-gray-600 mt-2">{campaign.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(campaign.status)}>
            {campaign.status}
          </Badge>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/ads/${campaignId}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Impressions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.impressions.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Target className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Clicks</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.clicks.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">CTR</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.ctr.toFixed(2)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Spend</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.spend.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaign Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Campaign Actions</CardTitle>
          <CardDescription>Control your campaign status and settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {campaign.status !== 'running' && (
              <Button
                onClick={() => updateCampaignStatus('running')}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Campaign
              </Button>
            )}

            {campaign.status === 'running' && (
              <Button
                onClick={() => updateCampaignStatus('paused')}
                disabled={actionLoading}
                variant="outline"
                className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause Campaign
              </Button>
            )}

            {campaign.status !== 'cancelled' && (
              <Button
                onClick={() => updateCampaignStatus('cancelled')}
                disabled={actionLoading}
                variant="outline"
                className="border-red-500 text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Stop Campaign
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Details */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="targeting">Targeting</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-600">Platform</label>
                  <p className="text-lg font-semibold">{getPlatformLabel(campaign.platform)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Campaign Type</label>
                  <p className="text-lg font-semibold capitalize">{campaign.campaign_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Objective</label>
                  <p className="text-lg font-semibold capitalize">{campaign.objective}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Budget</label>
                  <p className="text-lg font-semibold">
                    {campaign.budget ? `$${campaign.budget.toFixed(2)}` : 'Unlimited'} ({campaign.budget_type})
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Created</label>
                  <p className="text-lg font-semibold">{new Date(campaign.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Last Updated</label>
                  <p className="text-lg font-semibold">{new Date(campaign.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="targeting">
          <Card>
            <CardHeader>
              <CardTitle>Target Audience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-600">Age Range</label>
                  <p className="text-lg font-semibold">{campaign.target_audience?.age_range || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Gender</label>
                  <p className="text-lg font-semibold capitalize">{campaign.target_audience?.gender || 'all'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Location</label>
                  <p className="text-lg font-semibold">{campaign.target_audience?.location || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Interests</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(campaign.target_audience?.interests || []).length > 0 ? (
                      (campaign.target_audience?.interests || []).map((interest, index) => (
                        <Badge key={index}>{interest}</Badge>
                      ))
                    ) : (
                      <p className="text-gray-500">No specific interests targeted</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Cost per Click (CPC)</label>
                      <p className="text-2xl font-bold text-gray-900">${stats.cpc.toFixed(2)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Cost per Mille (CPM)</label>
                      <p className="text-2xl font-bold text-gray-900">${stats.cpm.toFixed(2)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Return on Ad Spend (ROAS)</label>
                      <p className="text-2xl font-bold text-gray-900">{stats.roas.toFixed(2)}x</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-2 block">Conversions</label>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <Progress value={(stats.conversions / Math.max(stats.clicks, 1)) * 100} className="h-3" />
                      </div>
                      <span className="text-lg font-semibold">{stats.conversions}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Performance data will appear once the campaign has impressions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}