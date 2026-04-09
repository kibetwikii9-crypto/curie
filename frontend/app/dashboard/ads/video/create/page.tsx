'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { apiFetch } from '@/lib/api'
import { ArrowLeft, Plus, Save, UploadCloud } from 'lucide-react'

type VideoProject = {
  id: number
  title: string
  description: string
  status: 'draft' | 'rendering' | 'published' | 'failed'
  duration: string
  created_at: string
  updated_at: string
  scenes: Array<{ id: number; name: string; duration: number; caption: string }>
  assets: Array<{ id: number; name: string; type: 'video' | 'image' | 'audio'; url: string; thumbnail?: string }>
}

const defaultProject: Omit<VideoProject, 'id' | 'created_at' | 'updated_at'> = {
  title: '',
  description: '',
  status: 'draft',
  duration: '00:00',
  scenes: [
    { id: 1, name: 'Intro', duration: 5, caption: 'Hook the audience' },
    { id: 2, name: 'Main Message', duration: 15, caption: 'Make your offer' }
  ],
  assets: []
}

const getTotalDuration = (scenes: VideoProject['scenes']) => {
  const total = scenes.reduce((sum, scene) => sum + scene.duration, 0)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const generateVideoThumbnail = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.src = url
    video.muted = true
    video.playsInline = true
    video.currentTime = 0.1
    video.onloadeddata = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 360
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(null)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      } catch {
        resolve(null)
      }
    }
    video.onerror = () => resolve(null)
  })
}

export default function VideoProjectCreatePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [project, setProject] = useState<VideoProject>({
    ...defaultProject,
    id: Date.now(),
    created_at: new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString().slice(0, 10),
    duration: getTotalDuration(defaultProject.scenes)
  })

  const [previewAssetUrl, setPreviewAssetUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false)

  const updateField = <K extends keyof VideoProject>(key: K, value: VideoProject[K]) => {
    setProject((prev) => ({ ...prev, [key]: value, updated_at: new Date().toISOString().slice(0, 10) }))
  }

  const updateScene = (sceneId: number, field: 'name' | 'duration' | 'caption', value: string | number) => {
    setProject((prev) => {
      const scenes = prev.scenes.map((scene) =>
        scene.id === sceneId
          ? { ...scene, [field]: field === 'duration' ? Number(value) : value }
          : scene
      )
      return { ...prev, scenes, duration: getTotalDuration(scenes), updated_at: new Date().toISOString().slice(0, 10) }
    })
  }

  const addScene = () => {
    setProject((prev) => {
      const nextId = prev.scenes.length > 0 ? Math.max(...prev.scenes.map((s) => s.id)) + 1 : 1
      const scenes = [...prev.scenes, { id: nextId, name: `Scene ${nextId}`, duration: 5, caption: '' }]
      return { ...prev, scenes, duration: getTotalDuration(scenes), updated_at: new Date().toISOString().slice(0, 10) }
    })
  }

  const removeScene = (sceneId: number) => {
    setProject((prev) => {
      const scenes = prev.scenes.filter((scene) => scene.id !== sceneId)
      return { ...prev, scenes, duration: getTotalDuration(scenes), updated_at: new Date().toISOString().slice(0, 10) }
    })
  }

  const onFileUpload = async (files: FileList | null, type: 'video' | 'image' | 'audio') => {
    if (!files) return

    const newAssets = await Promise.all(
      Array.from(files).map(async (file, index) => {
        const url = URL.createObjectURL(file)
        const thumbnail = type === 'video' ? await generateVideoThumbnail(url) : undefined
        return {
          id: Date.now() + index,
          name: file.name,
          type,
          url,
          thumbnail: thumbnail || undefined,
        }
      })
    )

    setProject((prev) => ({ ...prev, assets: [...prev.assets, ...newAssets], updated_at: new Date().toISOString().slice(0, 10) }))
    if (newAssets.length > 0) {
      setPreviewAssetUrl(newAssets[0].url)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!project.title.trim()) {
      toast({ title: 'Validation error', description: 'Project title is required', variant: 'destructive' })
      return
    }

    if (project.assets.length === 0) {
      toast({ title: 'Validation error', description: 'Upload at least one video file to start', variant: 'destructive' })
      return
    }

    const savedProject: VideoProject = { ...project, status: 'draft', duration: getTotalDuration(project.scenes) }
    
    setSaving(true)
    try {
      const response = await apiFetch('/api/ads/video-projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: savedProject.title,
          description: savedProject.description,
          status: savedProject.status,
          duration: savedProject.duration,
          scenes: savedProject.scenes,
          assets: savedProject.assets
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save project')
      }

      const data = await response.json()
      toast({ title: 'Saved', description: 'Video project created successfully.' })
      await new Promise(resolve => setTimeout(resolve, 500))
      router.push(`/dashboard/ads/video/${data.project?.id}`)
    } catch (error) {
      console.error('Error saving project:', error)
      toast({ title: 'Error', description: 'Failed to save video project.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center mb-6 gap-4">
        <Button variant="ghost" onClick={() => router.push('/dashboard/ads/video')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Video Projects
        </Button>
        <h1 className="text-3xl font-bold">Create Video Project</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Settings</CardTitle>
            <CardDescription>Define your video details and target duration.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={project.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Spring sale video"
                  required
                />
              </div>
              <div>
                <Label htmlFor="duration">Target duration</Label>
                <Input id="duration" value={project.duration} disabled />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={project.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the campaign angle..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scenes</CardTitle>
            <CardDescription>Auto-managed scenes, keep it simple</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-600">We will create a default scene structure for you. You can fine-tune timing and captions later in the project editor.</p>
            <div className="rounded-md border border-gray-200 p-3">
              {project.scenes.map((scene) => (
                <div key={scene.id} className="flex items-center justify-between text-sm text-gray-700">
                  <span>{scene.name}</span>
                  <span>{scene.duration}s</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
            <CardDescription>Upload video, image, and audio clips</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <label className="cursor-pointer rounded-md border border-dashed border-gray-300 p-3 text-center">
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => onFileUpload(e.target.files, 'video')}
                  multiple
                />
                <UploadCloud className="mx-auto h-5 w-5 text-gray-500" />
                <p className="text-xs text-gray-500">Upload video</p>
              </label>
              <label className="cursor-pointer rounded-md border border-dashed border-gray-300 p-3 text-center">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onFileUpload(e.target.files, 'image')}
                  multiple
                />
                <UploadCloud className="mx-auto h-5 w-5 text-gray-500" />
                <p className="text-xs text-gray-500">Upload images</p>
              </label>
              <label className="cursor-pointer rounded-md border border-dashed border-gray-300 p-3 text-center">
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => onFileUpload(e.target.files, 'audio')}
                  multiple
                />
                <UploadCloud className="mx-auto h-5 w-5 text-gray-500" />
                <p className="text-xs text-gray-500">Upload audio</p>
              </label>
            </div>

            {project.assets.length === 0 ? (
              <p className="text-sm text-gray-500">No assets uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {project.assets.map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between rounded border border-gray-200 p-2">
                    <span className="text-sm">{asset.name}</span>
                    <Badge>{asset.type}</Badge>
                  </div>
                ))}
              </div>
            )}

            {previewAssetUrl && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Preview</h4>
                  <Button
                    variant="outline"
                    onClick={() => setIsPreviewFullscreen((prev) => !prev)}
                  >
                    {isPreviewFullscreen ? 'Compact' : 'Fullscreen'}
                  </Button>
                </div>
                <video
                  className={`w-full rounded-md ${isPreviewFullscreen ? 'h-[70vh]' : 'max-h-[300px]'}`}
                  src={previewAssetUrl}
                  controls
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="ghost" onClick={() => router.push('/dashboard/ads/video')}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Project'}
          </Button>
        </div>
      </form>
    </div>
  )
}
