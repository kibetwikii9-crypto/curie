'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart3, FileVideo, Plus, Play, Film, SlidersHorizontal } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface VideoProject {
  id: number
  title: string
  status: 'draft' | 'rendering' | 'published' | 'failed'
  duration: string
  created_at: string
  updated_at: string
}

const initialProjects: VideoProject[] = [
  {
    id: 1,
    title: 'Spring Collection Launch',
    status: 'draft',
    duration: '00:30',
    created_at: '2026-03-22',
    updated_at: '2026-03-24'
  },
  {
    id: 2,
    title: 'Customer Testimonial',
    status: 'rendering',
    duration: '01:10',
    created_at: '2026-03-20',
    updated_at: '2026-03-23'
  },
  {
    id: 3,
    title: 'New Product Demo',
    status: 'published',
    duration: '00:45',
    created_at: '2026-03-10',
    updated_at: '2026-03-15'
  }
]

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

export default function VideoProjectsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [projects, setProjects] = useState<VideoProject[]>(initialProjects)

  const onCreate = () => {
    toast({ title: 'Create Video Project', description: 'Video project flow coming soon.' })
    router.push('/dashboard/ads/video/create')
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Video Projects</h1>
          <p className="text-gray-600 mt-1">Build, render, and publish ad videos from one place.</p>
        </div>
        <Button onClick={onCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New Video Project
        </Button>
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
            <div className="space-y-3">
              {projects.map((project) => (
                <div key={project.id} className="rounded-md border border-gray-200 p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{project.title}</h3>
                    <p className="text-sm text-gray-500">Duration: {project.duration} • Updated {project.updated_at}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusClass(project.status)}>{project.status}</Badge>
                    <Button variant="outline" onClick={() => router.push(`/dashboard/ads/video/${project.id}`)}>
                      <Play className="w-4 h-4 mr-1" />
                      Open
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 mt-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Template Library</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p><strong>Product Launch</strong> – quick ad template</p>
            <p><strong>Testimonial</strong> – customer story script</p>
            <p><strong>Flash Sale</strong> – fast conversion story</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>Video clips, images, music library, and voiceover.</p>
            <p>Drag & drop timeline assembly coming soon.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p><strong>Views</strong>, <strong>engagement</strong>, <strong>CTR</strong>.</p>
            <p>Publish to social networks and track results.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
