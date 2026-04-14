'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileVideo, Plus } from 'lucide-react'
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
  const thumb = project.assets?.find((asset) => asset?.thumbnail)?.thumbnail
  if (typeof thumb === 'string' && thumb) return thumb
  const videoAsset = project.assets?.find((asset) => asset?.type === 'video' && asset?.url)
  if (videoAsset?.url && typeof videoAsset.url === 'string' && !videoAsset.url.startsWith('blob:')) return videoAsset.url as string
  const imageAsset = project.assets?.find((asset) => asset?.type === 'image' && asset?.url)
  if (imageAsset?.url && typeof imageAsset.url === 'string' && !imageAsset.url.startsWith('blob:')) return imageAsset.url as string
  return ''
}

const getProjectVideo = (project: VideoProject) => {
  const videoAsset = project.assets?.find((asset) => asset?.type === 'video' && typeof asset?.url === 'string')
  if (videoAsset?.url && !videoAsset.url.startsWith('blob:')) return videoAsset.url as string
  return null
}

export default function VideoDashboard() {
  const [projects, setProjects] = useState<VideoProject[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<'all' | 'rendering' | 'published' | 'draft'>('all')
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

  const filteredProjects = projects.filter((project) => {
    if (activeFilter === 'all') return true
    return project.status === activeFilter
  })

  const countByStatus = {
    all: projects.length,
    rendering: projects.filter((p) => p.status === 'rendering').length,
    published: projects.filter((p) => p.status === 'published').length,
    draft: projects.filter((p) => p.status === 'draft').length,
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

      <Card className="mb-6">
        <CardContent className="pt-5 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Project view</p>
            <p className="text-xs text-gray-500">Choose one category to quickly focus your list.</p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="project-filter" className="text-sm text-gray-600">Show</label>
            <select
              id="project-filter"
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as 'all' | 'rendering' | 'published' | 'draft')}
            >
              <option value="all">Projects ({countByStatus.all})</option>
              <option value="rendering">Rendering ({countByStatus.rendering})</option>
              <option value="published">Published ({countByStatus.published})</option>
              <option value="draft">Drafts ({countByStatus.draft})</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Video Project Library</CardTitle>
          <CardDescription>Manage project timeline, assets, and rendering</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredProjects.length === 0 ? (
            <div className="text-center text-gray-500">
              <FileVideo className="mx-auto h-12 w-12" />
              <p className="mt-3">
                {projects.length === 0
                  ? 'No video projects yet. Start by creating a new one.'
                  : 'No projects match this filter yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map((project) => {
                const thumbnail = getProjectThumbnail(project)
                const videoUrl = getProjectVideo(project)
                return (
                  <div
                    key={project.id}
                    className="rounded-lg border border-gray-200 overflow-hidden bg-white group cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => router.push(`/dashboard/ads/video/${project.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        router.push(`/dashboard/ads/video/${project.id}`)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open video project ${project.name}`}
                  >
                    <div className="relative aspect-video bg-black">
                      {videoUrl ? (
                        <video className="h-full w-full object-contain" src={videoUrl} controls playsInline preload="metadata" />
                      ) : thumbnail ? (
                        <img src={thumbnail} alt={project.name} className="h-full w-full object-contain" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <FileVideo className="h-8 w-8 text-gray-500" />
                        </div>
                      )}

                      <div className="absolute top-3 right-3">
                        <span className="rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-gray-800">
                          {project.duration}
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white pointer-events-none">
                        <h3 className="text-lg font-semibold leading-tight truncate">{project.name}</h3>
                        <p className="text-xs text-white/85 mt-1">
                          {project.status} • {new Date(project.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="p-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusClass(project.status)}>{project.status}</Badge>
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
