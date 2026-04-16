'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Trash2, UploadCloud, Save, Share2, Film, CheckCircle2 } from 'lucide-react'

type VideoAsset = { id: number; name: string; type: 'video' | 'image' | 'audio'; url: string; thumbnail?: string }

type VideoScene = { id: number; name: string; duration: number; caption: string }

type VideoProject = {
  id: number
  name: string
  description: string
  status: 'draft' | 'rendering' | 'published' | 'failed'
  duration: string
  created_at: string
  updated_at: string
  scenes: VideoScene[]
  assets: VideoAsset[]
}

const MAX_ASSET_SIZE_BYTES = 500 * 1024 * 1024

const getTotalDuration = (scenes: VideoScene[]) => {
  const total = scenes.reduce((sum, scene) => sum + scene.duration, 0)
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`
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

export default function VideoProjectDetailPage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const { toast } = useToast()
  const [project, setProject] = useState<VideoProject | null>(null)
  const [previewAsset, setPreviewAsset] = useState<VideoAsset | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [previewDuration, setPreviewDuration] = useState<string | null>(null)

  useEffect(() => {
    loadProject()
  }, [params.id])

  const loadProject = async () => {
    try {
      const response = await apiFetch(`/api/ads/video-projects/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        const loadedProject: VideoProject = {
          id: data.id,
          name: data.name,
          description: data.description || '',
          status: data.status,
          duration: data.duration,
          created_at: data.created_at,
          updated_at: data.updated_at,
          scenes: data.scenes || [],
          assets: data.assets || []
        }
        setProject(loadedProject)
        setIsDirty(false)
        
        // Set preview to first video asset or first asset
        const firstVideo = loadedProject.assets.find((asset) => asset.type === 'video')
        if (firstVideo) {
          setPreviewAsset(firstVideo)
        } else if (loadedProject.assets.length > 0) {
          setPreviewAsset(loadedProject.assets[0])
        }
      } else {
        toast({ title: 'Not found', description: 'Video project does not exist', variant: 'destructive' })
        router.push('/dashboard/ads/video')
      }
    } catch (error) {
      console.error('Error loading project:', error)
      toast({ title: 'Error', description: 'Failed to load video project', variant: 'destructive' })
      router.push('/dashboard/ads/video')
    }
  }

  const statusClass = useMemo(() => {
    if (!project) return 'bg-gray-100 text-gray-700'
    switch (project.status) {
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
  }, [project])

  const displayedDuration = previewDuration || project?.duration || '00:00'

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-600">Loading project...</div>
      </div>
    )
  }

  const updateScene = (sceneId: number, field: keyof VideoScene, value: string | number) => {
    const scenes = project.scenes.map((scene) =>
      scene.id === sceneId ? { ...scene, [field]: field === 'duration' ? Number(value) : value } : scene
    )
    const update = { ...project, scenes, duration: getTotalDuration(scenes) }
    setProject(update)
    setIsDirty(true)
  }

  const updateField = (field: keyof VideoProject, value: string) => {
    const updated = { ...project, [field]: value }
    setProject(updated)
    setIsDirty(true)
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

  const onFileUpload = async (files: FileList | null, type: 'video' | 'image' | 'audio') => {
    if (!files) return

    try {
      const uploadPromises = Array.from(files).map(async (file, idx) => {
        if (file.size > MAX_ASSET_SIZE_BYTES) {
          throw new Error(`${file.name} is too large. Maximum file size is 500 MB.`)
        }

        // Upload file to backend
        const formData = new FormData()
        formData.append('file', file)

        const response = await apiFetch(`/api/ads/video-projects/upload-asset?asset_type=${type}`, {
          method: 'POST',
          body: formData,
        })

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

        const uploadedAsset = await response.json()

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
        const updated = { ...project, assets: [...project.assets, ...newAssets] }
        setProject(updated)
        setPreviewAsset(newAssets[0])
        setIsDirty(true)
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
      toast({ title: 'Upload failed', description: 'Failed to upload asset files', variant: 'destructive' })
    }
  }

  const isPlayableVideo = (asset: VideoAsset | null) =>
    !!asset && asset.type === 'video' && !!asset.url

  const getPreviewImage = (asset: VideoAsset | null) => {
    if (!asset) return null
    if (asset.thumbnail) return asset.thumbnail
    if (asset.type === 'image' && asset.url && !asset.url.startsWith('blob:')) return asset.url
    return null
  }

  const setStatus = async (status: VideoProject['status']) => {
    const updated = { ...project, status }
    setProject(updated)
    
    try {
      const response = await apiFetch(`/api/ads/video-projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updated.name,
          description: updated.description,
          status: updated.status,
          duration: updated.duration,
          scenes: updated.scenes,
          assets: updated.assets
        }),
      })
      
      if (!response.ok) {
        let errorMessage = 'Failed to update status'
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
      
      toast({ title: `Status changed to ${status}`, description: 'Project status was updated.' })
    } catch (error) {
      console.error('Error updating status:', error)
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to update status', variant: 'destructive' })
    }
  }

  const onDelete = async () => {
    const confirmed = window.confirm('Are you sure you want to delete this project? This action cannot be undone.')
    if (!confirmed) return

    try {
      const response = await apiFetch(`/api/ads/video-projects/${project.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        toast({ title: 'Deleted', description: 'Project removed from your library.' })
        router.push('/dashboard/ads/video')
      } else {
        let errorMessage = 'Failed to delete project'
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
    } catch (error) {
      console.error('Error deleting project:', error)
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete project', variant: 'destructive' })
    }
  }

  const saveAsTemplate = async () => {
    if (savingTemplate) return
    const templateName = prompt('Template name:', `${project.name} Template`)
    if (!templateName) return

    try {
      setSavingTemplate(true)
      const response = await apiFetch(`/api/ads/video-projects/${project.id}/save-as-template?template_name=${encodeURIComponent(templateName)}`, {
        method: 'POST',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Saved as template: "${templateName}". Other users can now use this template.`,
        })
      } else {
        let errorMessage = 'Failed to save template'
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
    } catch (error) {
      console.error('Error saving template:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save as template',
        variant: 'destructive',
      })
    } finally {
      setSavingTemplate(false)
    }
  }

  const saveProject = async () => {
    if (saving) return
    setSaving(true)
    try {
      const response = await apiFetch(`/api/ads/video-projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: project.name,
          description: project.description,
          status: project.status,
          duration: displayedDuration,
          scenes: project.scenes,
          assets: project.assets,
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

      toast({ title: 'Saved', description: 'Project updates saved successfully.' })
      setIsDirty(false)
      await loadProject()
    } catch (error) {
      console.error('Error saving project:', error)
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to save changes', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-4 pb-10 max-w-7xl">
      <div className="pt-6 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs uppercase tracking-wide text-gray-500">Edit video project</p>
              <Badge className={statusClass}>{project.status}</Badge>
              {isDirty && (
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  Unsaved changes
                </span>
              )}
            </div>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 truncate">{project.name}</h1>
            <p className="mt-1 text-sm text-gray-600">
              Duration <span className="font-medium text-gray-900">{displayedDuration}</span> • {project.assets.length} assets
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" className="h-9 px-3" onClick={() => router.push('/dashboard/ads/video')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button variant="outline" className="h-9 px-3" onClick={() => setStatus('published')}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Publish
            </Button>
            <Button variant="outline" className="h-9 px-3" onClick={saveAsTemplate} disabled={savingTemplate}>
              <Share2 className="w-4 h-4 mr-2" />
              {savingTemplate ? 'Saving...' : 'Save template'}
            </Button>
            <Button variant="outline" className="h-9 px-3 text-red-600 border-red-300 hover:bg-red-50" onClick={onDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project basics</CardTitle>
              <CardDescription>Update the name and description shown in your library.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-xs text-gray-500">
                  Project Name
                </Label>
                <input
                  id="name"
                  value={project.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="mt-1 w-full bg-transparent text-lg font-semibold text-gray-900 outline-none border-0 p-0"
                  placeholder="Project name"
                />
                <div className="mt-2 h-px w-full bg-gray-100" />
              </div>

              <div>
                <Label className="text-xs text-gray-500">Duration</Label>
                <div className="mt-1 text-sm font-medium text-gray-900">{displayedDuration}</div>
              </div>

              <div>
                <Label htmlFor="description" className="text-xs text-gray-500">
                  Description
                </Label>
                <textarea
                  id="description"
                  value={project.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  onInput={(e) => {
                    const el = e.currentTarget
                    el.style.height = 'auto'
                    el.style.height = `${el.scrollHeight}px`
                  }}
                  rows={1}
                  className="mt-1 w-full bg-transparent text-sm text-gray-800 outline-none border-0 p-0 resize-none overflow-hidden leading-6"
                  placeholder="Add a short description…"
                />
                <div className="mt-2 h-px w-full bg-gray-100" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assets</CardTitle>
              <CardDescription>Upload media, then select an asset to preview.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="cursor-pointer rounded-md border border-dashed border-gray-300 p-3 text-center hover:bg-gray-50 transition-colors">
                  <input type="file" accept="video/*" hidden onChange={(e) => onFileUpload(e.target.files, 'video')} multiple />
                  <UploadCloud className="mx-auto h-5 w-5 text-gray-500" />
                  <p className="text-xs text-gray-600 mt-1">Upload video</p>
                </label>
                <label className="cursor-pointer rounded-md border border-dashed border-gray-300 p-3 text-center hover:bg-gray-50 transition-colors">
                  <input type="file" accept="image/*" hidden onChange={(e) => onFileUpload(e.target.files, 'image')} multiple />
                  <UploadCloud className="mx-auto h-5 w-5 text-gray-500" />
                  <p className="text-xs text-gray-600 mt-1">Upload images</p>
                </label>
                <label className="cursor-pointer rounded-md border border-dashed border-gray-300 p-3 text-center hover:bg-gray-50 transition-colors">
                  <input type="file" accept="audio/*" hidden onChange={(e) => onFileUpload(e.target.files, 'audio')} multiple />
                  <UploadCloud className="mx-auto h-5 w-5 text-gray-500" />
                  <p className="text-xs text-gray-600 mt-1">Upload audio</p>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">Each file must be 500 MB or smaller. Large files can take longer to upload.</p>

              {project.assets.length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-300 p-6 text-sm text-gray-600">
                  No assets yet. Upload at least one file to start previewing.
                </div>
              ) : (
                <div className="grid gap-2">
                  {project.assets.map((asset) => {
                    const selected = previewAsset?.id === asset.id
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        className={[
                          'w-full text-left rounded-md border p-2 flex items-center gap-3 transition-colors',
                          selected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50',
                        ].join(' ')}
                        onClick={() => setPreviewAsset(asset)}
                      >
                        <div className="h-10 w-16 rounded bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                          {asset.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={asset.thumbnail} alt="" className="h-full w-full object-cover" />
                          ) : asset.type === 'image' && asset.url && !asset.url.startsWith('blob:') ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={asset.url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Film className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 truncate">{asset.name}</span>
                            <Badge className="shrink-0">{asset.type}</Badge>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 truncate">{asset.url?.startsWith('blob:') ? 'Local file (temporary)' : 'Stored asset'}</p>
                        </div>
                        <span className="text-xs text-gray-500">{selected ? 'Previewing' : 'Preview'}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs text-gray-500">
              Save updates this project. You can keep previewing right away.
            </p>
            <Button
              variant="default"
              onClick={saveProject}
              disabled={saving}
              className="h-10"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>What you’ll render/publish.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {previewAsset ? (
                isPlayableVideo(previewAsset) ? (
                  <div className="w-full aspect-video rounded-md bg-black overflow-hidden">
                    <video
                      className="w-full h-full object-contain"
                      src={previewAsset.url}
                      controls
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={(e) => {
                        const secs = Math.max(0, Math.floor(e.currentTarget.duration || 0))
                        if (!secs) return
                        const mm = Math.floor(secs / 60).toString().padStart(2, '0')
                        const ss = (secs % 60).toString().padStart(2, '0')
                        const formatted = `${mm}:${ss}`
                        setPreviewDuration(formatted)
                        if (project.duration !== formatted) {
                          setProject({ ...project, duration: formatted })
                        }
                      }}
                    />
                  </div>
                ) : getPreviewImage(previewAsset) ? (
                  <div className="w-full aspect-video rounded-md bg-black overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getPreviewImage(previewAsset)!}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-gray-300 h-[200px] flex items-center justify-center text-gray-500">
                    <Film className="w-5 h-5 mr-2" /> Preview unavailable
                  </div>
                )
              ) : (
                <div className="rounded-md border border-dashed border-gray-300 h-[200px] flex items-center justify-center text-gray-500">
                  <Film className="w-5 h-5 mr-2" /> Select an asset to preview
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  )
}
