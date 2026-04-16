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
import { apiFetch, API_BASE_URL } from '@/lib/api'
import { ArrowLeft, Plus, Save, UploadCloud } from 'lucide-react'

type VideoProject = {
  id: number
  name: string
  description: string
  status: 'draft' | 'rendering' | 'published' | 'failed'
  duration: string
  created_at: string
  updated_at: string
  scenes: Array<{ id: number; name: string; duration: number; caption: string }>
  assets: Array<{ id: number; name: string; type: 'video' | 'image' | 'audio'; url: string; thumbnail?: string }>
}

const MAX_ASSET_SIZE_BYTES = 500 * 1024 * 1024

const defaultProject: Omit<VideoProject, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
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

const resolveAssetUrl = (url: string) => {
  if (url.startsWith('/uploads')) {
    return `${API_BASE_URL.replace(/\/$/, '')}${url}`
  }
  return url
}

const generateVideoThumbnail = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.src = url
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'

    const cleanup = () => {
      video.removeAttribute('src')
      video.load()
    }

    const generate = () => {
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
      } finally {
        cleanup()
      }
    }

    video.addEventListener('loadeddata', () => generate(), { once: true })
    video.addEventListener('error', () => {
      resolve(null)
      cleanup()
    }, { once: true })

    video.currentTime = 0.1
  })
}

const generateImageThumbnail = (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.src = reader.result as string
      image.onload = () => {
        const maxWidth = 320
        const maxHeight = 180
        let width = image.width
        let height = image.height
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(null)
        ctx.drawImage(image, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      }
      image.onerror = () => resolve(null)
    }
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
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

  const [previewAsset, setPreviewAsset] = useState<VideoProject['assets'][number] | null>(null)
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
      const uploadPromises = Array.from(files).map(async (file, index) => {
        if (file.size > MAX_ASSET_SIZE_BYTES) {
          throw new Error(`${file.name} is too large. Maximum file size is 500 MB.`)
        }

        const tempUrl = URL.createObjectURL(file)
        let thumbnail: string | undefined
        if (type === 'video') {
          thumbnail = (await generateVideoThumbnail(tempUrl)) || undefined
        } else if (type === 'image') {
          thumbnail = (await generateImageThumbnail(file)) || undefined
        }
        URL.revokeObjectURL(tempUrl)

        // Upload file to backend with timeout
        const formData = new FormData()
        formData.append('file', file)

        // Create AbortController for timeout (10 minutes)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 600000) // 10 minute timeout

        try {
          const response = await apiFetch(`/api/ads/video-projects/upload-asset?asset_type=${type}`, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          if (!response.ok) {
            let errorMessage = `Upload failed: ${response.statusText}`
            try {
              const contentType = response.headers.get('content-type')
              if (contentType?.includes('application/json')) {
                const errorData = await response.json()
                errorMessage = errorData.detail || errorData.message || errorMessage
              } else {
                const textData = await response.text()
                // Extract first line or first 100 chars if it's plain text
                if (textData && !textData.includes('<')) {
                  errorMessage = textData.substring(0, 100)
                }
              }
            } catch (parseErr) {
              // If we can't parse error details, use status message
              errorMessage = `Upload failed: ${response.statusText}`
            }
            throw new Error(errorMessage)
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
            throw new Error(`${file.name}: Upload timed out`)
          }
          throw error
        }
      })

      // Use allSettled to allow partial success
      const results = await Promise.allSettled(uploadPromises)
      
      const newAssets: typeof project.assets = []
      const failedFiles: string[] = []

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          newAssets.push(result.value)
        } else {
          const fileName = Array.from(files)[index].name
          failedFiles.push(`${fileName}: ${result.reason?.message || 'Unknown error'}`)
        }
      })

      if (newAssets.length > 0) {
        setProject((prev) => ({ ...prev, assets: [...prev.assets, ...newAssets], updated_at: new Date().toISOString().slice(0, 10) }))
        setPreviewAsset(newAssets[0])
      }

      // Show appropriate toast message
      if (failedFiles.length === 0) {
        toast({ title: 'Success', description: `${newAssets.length} file(s) uploaded successfully` })
      } else if (newAssets.length > 0) {
        toast({
          title: 'Partial upload',
          description: `${newAssets.length} succeeded, ${failedFiles.length} failed:\n${failedFiles.slice(0, 3).join('\n')}${failedFiles.length > 3 ? '\n...' : ''}`,
          variant: 'destructive'
        })
      } else {
        toast({
          title: 'Upload failed',
          description: `All files failed:\n${failedFiles.slice(0, 3).join('\n')}${failedFiles.length > 3 ? '\n...' : ''}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Failed to upload asset files', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!project.name.trim()) {
      toast({ title: 'Validation error', description: 'Project name is required', variant: 'destructive' })
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
          name: savedProject.name,
          description: savedProject.description,
          status: savedProject.status,
          duration: savedProject.duration,
          scenes: savedProject.scenes,
          assets: savedProject.assets
        }),
      })

      if (!response.ok) {
        let errorMessage = 'Failed to save project'
        try {
          const contentType = response.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            const errorData = await response.json()
            errorMessage = errorData.detail || errorData.message || errorMessage
          } else {
            const textData = await response.text()
            if (textData && !textData.includes('<')) {
              errorMessage = textData.substring(0, 100)
            }
          }
        } catch (parseErr) {
          // Use default error message
        }
        throw new Error(errorMessage)
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
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={project.name}
                  onChange={(e) => updateField('name', e.target.value)}
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

            <div>
              <Label htmlFor="duration">Duration (MM:SS)</Label>
              <Input
                id="duration"
                value={project.duration}
                onChange={(e) => updateField('duration', e.target.value)}
                placeholder="00:30"
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
            <p className="text-xs text-gray-500 mt-2">Video files must be 500 MB or smaller. Larger files may fail to upload or take longer.</p>

            {project.assets.length === 0 ? (
              <p className="text-sm text-gray-500">No assets yet. This is okay—you can add media later.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {project.assets.map((asset) => {
                  const isSelected = previewAsset?.id === asset.id
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => setPreviewAsset(asset)}
                      className={[
                        'group flex items-center gap-3 rounded border p-2 text-left transition-colors',
                        isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50',
                      ].join(' ')}
                    >
                      <div className="h-12 w-20 overflow-hidden rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                        {asset.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={resolveAssetUrl(asset.thumbnail)} alt={asset.name} className="h-full w-full object-contain" />
                        ) : asset.type === 'image' && asset.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={resolveAssetUrl(asset.url)} alt={asset.name} className="h-full w-full object-contain" />
                        ) : (
                          <UploadCloud className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-gray-900">{asset.name}</span>
                          <Badge className="shrink-0">{asset.type}</Badge>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{asset.url?.startsWith('blob:') ? 'Local file' : 'Stored asset'}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {previewAsset && (
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
                {previewAsset.type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveAssetUrl(previewAsset.thumbnail || previewAsset.url)}
                    alt={previewAsset.name}
                    className={`w-full rounded-md ${isPreviewFullscreen ? 'h-[70vh]' : 'max-h-[300px]'} object-contain bg-black`}
                  />
                ) : previewAsset.type === 'video' ? (
                  <div className={`w-full ${isPreviewFullscreen ? 'h-[70vh]' : 'max-h-[300px]'} rounded-md bg-black overflow-hidden`}>
                    <video
                      className="w-full h-full object-contain"
                      src={resolveAssetUrl(previewAsset.url)}
                      controls
                    />
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                    Audio preview is not available.
                  </div>
                )}
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
