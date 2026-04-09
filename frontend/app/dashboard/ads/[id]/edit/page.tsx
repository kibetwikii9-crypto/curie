'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Save } from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface Campaign {
  id: string
  name: string
  description: string
  platform: string
  campaign_type: string
  objective: string
  target_audience: {
    age_range: string
    gender: string
    interests: string[]
    location: string
  }
  budget: number | null
  budget_type: string
  scheduled_at: string | null
}

interface CampaignFormData {
  name: string
  description: string
  platform: string
  campaign_type: string
  objective: string
  target_audience: {
    age_range: string
    gender: string
    interests: string[]
    location: string
  }
  budget: string
  budget_type: string
  scheduled_at: string
}

const PLATFORMS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'webchat', label: 'Web Chat' },
  { value: 'email', label: 'Email' }
]

const CAMPAIGN_TYPES = [
  { value: 'standard', label: 'Standard Campaign' },
  { value: 'ab_test', label: 'A/B Test Campaign' },
  { value: 'video', label: 'Video Campaign' },
  { value: 'automated', label: 'Automated Campaign' }
]

const OBJECTIVES = [
  { value: 'awareness', label: 'Brand Awareness' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'traffic', label: 'Website Traffic' },
  { value: 'leads', label: 'Lead Generation' },
  { value: 'sales', label: 'Sales' },
  { value: 'conversions', label: 'Conversions' }
]

export default function EditCampaignPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    platform: '',
    campaign_type: 'standard',
    objective: '',
    target_audience: {
      age_range: '18-65',
      gender: 'all',
      interests: [],
      location: ''
    },
    budget: '',
    budget_type: 'daily',
    scheduled_at: ''
  })

  const campaignId = params.id as string

  useEffect(() => {
    fetchCampaign()
  }, [campaignId])

  const fetchCampaign = async () => {
    try {
      const response = await apiFetch(`/api/ads/campaigns/${campaignId}`)
      if (response.ok) {
        const campaign: Campaign = await response.json()
        setFormData({
          name: campaign.name,
          description: campaign.description,
          platform: campaign.platform,
          campaign_type: campaign.campaign_type,
          objective: campaign.objective,
          target_audience: campaign.target_audience,
          budget: campaign.budget ? campaign.budget.toString() : '',
          budget_type: campaign.budget_type,
          scheduled_at: campaign.scheduled_at ? new Date(campaign.scheduled_at).toISOString().slice(0, 16) : ''
        })
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
      router.push('/dashboard/ads')
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = <K extends keyof CampaignFormData>(field: K, value: CampaignFormData[K]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updateTargetAudience = <K extends keyof CampaignFormData['target_audience']>(
    field: K,
    value: CampaignFormData['target_audience'][K]
  ) => {
    setFormData(prev => ({
      ...prev,
      target_audience: {
        ...prev.target_audience,
        [field]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.platform || !formData.objective) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        platform: formData.platform,
        campaign_type: formData.campaign_type,
        objective: formData.objective,
        target_audience: formData.target_audience,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        budget_type: formData.budget_type,
        scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null
      }

      const response = await apiFetch(`/api/ads/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Campaign updated successfully'
        })
        router.push(`/dashboard/ads/${campaignId}`)
      } else {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to update campaign')
      }
    } catch (error) {
      console.error('Error updating campaign:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update campaign',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading campaign...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push(`/dashboard/ads/${campaignId}`)}
          className="mr-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Campaign
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Campaign</h1>
          <p className="text-gray-600 mt-2">Update your campaign settings</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <CardDescription>Modify the information for your campaign</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Summer Sale 2024"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform">Platform *</Label>
                <select
                  id="platform"
                  className="w-full rounded border border-gray-300 px-3 py-2"
                  value={formData.platform}
                  onChange={(e) => updateFormData('platform', e.target.value)}
                >
                  <option value="">Select platform</option>
                  {PLATFORMS.map((platform) => (
                    <option key={platform.value} value={platform.value}>
                      {platform.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your campaign goals and strategy..."
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="campaign_type">Campaign Type</Label>
                <select
                  id="campaign_type"
                  className="w-full rounded border border-gray-300 px-3 py-2"
                  value={formData.campaign_type}
                  onChange={(e) => updateFormData('campaign_type', e.target.value)}
                >
                  {CAMPAIGN_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective">Objective *</Label>
                <select
                  id="objective"
                  className="w-full rounded border border-gray-300 px-3 py-2"
                  value={formData.objective}
                  onChange={(e) => updateFormData('objective', e.target.value)}
                >
                  <option value="">Select objective</option>
                  {OBJECTIVES.map((objective) => (
                    <option key={objective.value} value={objective.value}>
                      {objective.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Target Location *</Label>
              <Input
                id="location"
                placeholder="e.g., United States, New York, London"
                value={formData.target_audience.location}
                onChange={(e) => updateTargetAudience('location', e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="0.00"
                  value={formData.budget}
                  onChange={(e) => updateFormData('budget', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget_type">Budget Type</Label>
                <select
                  id="budget_type"
                  className="w-full rounded border border-gray-300 px-3 py-2"
                  value={formData.budget_type}
                  onChange={(e) => updateFormData('budget_type', e.target.value)}
                >
                  <option value="daily">Daily Budget</option>
                  <option value="lifetime">Lifetime Budget</option>
                  <option value="unlimited">Unlimited</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled_at">Schedule Start (Optional)</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => updateFormData('scheduled_at', e.target.value)}
              />
              <p className="text-sm text-gray-500">Leave empty to start immediately</p>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/dashboard/ads/${campaignId}`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}