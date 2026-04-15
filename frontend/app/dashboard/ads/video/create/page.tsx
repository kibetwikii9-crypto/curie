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
  const [uploading, setUploading] = useState(false)
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false)

  const updateField = <K extends keyof VideoProject>(key: K, value: VideoProject[K]) => {
    setProject((prev) => ({ ...prev, [key]: value, updated_at: new Date().toISOString().slice(0, 10) }))
  }

  const onFileUpload = async (files: FileList | null, type: 'video' | 'image' | 'audio') => {
    if (!files) return

    setUploading(true)
    try {
      const newAssets = await Promise.all(
        Array.from(files).map(async (file, index) => {
          // Upload file to backend with timeout
          const formData = new FormData()
          formData.append('file', file)

          // Create AbortController for timeout
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

          try {
            const response = await apiFetch(`/api/ads/video-projects/upload-asset?asset_type=${type}`, {
              method: 'POST',
              body: formData,
              signal: controller.signal,
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
              const errorData = await response.text()
              throw new Error(`Upload failed: ${response.statusText} - ${errorData}`)
            }

            let uploadedAsset
            try {
              uploadedAsset = await response.json()
            } catch (e) {
              throw new Error('Failed to parse upload response')
            }

            // Generate thumbnail for videos
            let thumbnail: string | undefined
            if (type === 'video') {
              const tempUrl = URL.createObjectURL(file)
              const thumbResult = await generateVideoThumbnail(tempUrl)
              thumbnail = thumbResult || undefined
              URL.revokeObjectURL(tempUrl)
            }

            return {
              id: uploadedAsset.id,
              name: uploadedAsset.name,
              type: uploadedAsset.type,
              url: uploadedAsset.url,
              thumbnail: thumbnail,
            }
          } catch (error) {
            clearTimeout(timeoutId)
            if (error instanceof Error && error.name === 'AbortError') {
              throw new Error('Upload timed out. Please try again.')
            }
            throw error
          }
        })
      )

      setProject((prev) => ({ ...prev, assets: [...prev.assets, ...newAssets], updated_at: new Date().toISOString().slice(0, 10) }))
      if (newAssets.length > 0) {
        setPreviewAssetUrl(newAssets[0].url)
      }
      toast({ title: 'Success', description: `${newAssets.length} file(s) uploaded successfully` })
    } catch (error) {
      console.error('Upload error:', error)
      toast({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Failed to upload asset files', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!project.title.trim()) {
      toast({ title: 'Validation error', description: 'Project title is required', variant: 'destructive' })
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
      const projectId = data.project?.id
      if (!projectId) {
        throw new Error('Project was created but no project id was returned')
      }
      router.push(`/dashboard/ads/video/${projectId}`)
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
            <CardTitle>Assets</CardTitle>
            <CardDescription>Upload media files (optional, can add later)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <label className="cursor-pointer rounded-md border border-dashed border-gray-300 p-3 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => onFileUpload(e.target.files, 'video')}
                  multiple
                  disabled={uploading}
                />
                <UploadCloud className="mx-auto h-5 w-5 text-gray-500" />
                <p className="text-xs text-gray-500 mt-1">{uploading ? 'Uploading...' : 'Upload video'}</p>
              </label>
              <label className="cursor-pointer rounded-md border border-dashed border-gray-300 p-3 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onFileUpload(e.target.files, 'image')}
                  multiple
                  disabled={uploading}
                />
                <UploadCloud className="mx-auto h-5 w-5 text-gray-500" />
                <p className="text-xs text-gray-500 mt-1">{uploading ? 'Uploading...' : 'Upload images'}</p>
              </label>
              <label className="cursor-pointer rounded-md border border-dashed border-gray-300 p-3 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => onFileUpload(e.target.files, 'audio')}
                  multiple
                  disabled={uploading}
                />
                <UploadCloud className="mx-auto h-5 w-5 text-gray-500" />
                <p className="text-xs text-gray-500 mt-1">{uploading ? 'Uploading...' : 'Upload audio'}</p>
              </label>
            </div>

            {project.assets.length === 0 ? (
              <p className="text-sm text-gray-500">No assets yet. This is okay—you can add media later.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {project.assets.map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between rounded border border-gray-200 p-2">
                    <span className="text-sm truncate">{asset.name}</span>
                    <Badge className="bg-blue-100 text-blue-800">{asset.type}</Badge>
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
                    className="px-3 py-1 text-sm"
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
          <Button type="submit" disabled={saving || uploading}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Project'}
          </Button>
        </div>
      </form>
    </div>
  )
}
