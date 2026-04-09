'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileVideo, Plus, Play } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { apiFetch } from '@/lib/api'

interface VideoProject {
  id: number
  name: string
  description?: string
  status: 'draft' | 'rendering' | 'published' | 'failed'
  duration: string
  scenes: Array<any>
  assets: Array<any>
  created_at: string
  updated_at: string
}

const getProjectThumbnail = (project: VideoProject) => {
  const videoAsset = project.assets?.find((asset) => asset?.type === 'video' && asset?.url)
  if (videoAsset?.url && typeof videoAsset.url === 'string' && !videoAsset.url.startsWith('blob:')) return videoAsset.url as string
  const imageAsset = project.assets?.find((asset) => asset?.type === 'image' && asset?.url)
  if (imageAsset?.url && typeof imageAsset.url === 'string' && !imageAsset.url.startsWith('blob:')) return imageAsset.url as string
  return ''
}

export default function VideoDashboard() {
  const [projects, setProjects] = useState<VideoProject[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const response = await apiFetch('/api/ads/video-projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load video projects',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error loading projects:', error)
      toast({
        title: 'Error',
        description: 'Failed to load video projects',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusClass = (status: VideoProject['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-700'
      case 'rendering':
        return 'bg-blue-100 text-blue-700'
      case 'published':
        return 'bg-green-100 text-green-700'
      case 'failed':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const onCreate = () => {
    router.push('/dashboard/ads/video/templates')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Video Projects</h1>
          <p className="text-gray-600 mt-1">Build, render, and publish ad videos from one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.push('/dashboard/ads')}>
            Back to Ads
          </Button>
          <Button onClick={onCreate}>
            <Plus className="w-4 h-4 mr-2" />
            New Video Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Projects</CardTitle>
            <CardDescription>All active video projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Rendering</CardTitle>
            <CardDescription>Currently in render queue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.filter(p => p.status === 'rendering').length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Published</CardTitle>
            <CardDescription>Released campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.filter(p => p.status === 'published').length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Drafts</CardTitle>
            <CardDescription>Work in progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.filter(p => p.status === 'draft').length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Video Project Library</CardTitle>
          <CardDescription>Manage project timeline, assets, and rendering</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {projects.length === 0 ? (
            <div className="text-center text-gray-500">
              <FileVideo className="mx-auto h-12 w-12" />
              <p className="mt-3">No video projects yet. Start by creating a new one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => {
                const thumbnail = getProjectThumbnail(project)
                return (
                  <div key={project.id} className="rounded-lg border border-gray-200 overflow-hidden bg-white group">
                    <div className="relative h-64 bg-gray-100">
                      {thumbnail ? (
                        thumbnail.includes('blob:') ? (
                          <video className="h-full w-full object-cover" src={thumbnail} muted />
                        ) : (
                          <img src={thumbnail} alt={project.name} className="h-full w-full object-cover" />
                        )
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <FileVideo className="h-8 w-8 text-gray-500" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
                      <div className="absolute top-3 right-3">
                        <span className="rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-gray-800">
                          {project.duration}
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <h3 className="text-lg font-semibold leading-tight truncate">{project.name}</h3>
                        <p className="text-xs text-white/85 mt-1">
                          {project.status} • {new Date(project.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="p-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusClass(project.status)}>{project.status}</Badge>
                        <Button variant="outline" onClick={() => router.push(`/dashboard/ads/video/${project.id}`)}>
                          <Play className="w-4 h-4 mr-1" />
                          Open
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
