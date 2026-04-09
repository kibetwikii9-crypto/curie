'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Play, Trash2, UploadCloud, Save, Share2 } from 'lucide-react'

type VideoAsset = { id: number; name: string; type: 'video' | 'image' | 'audio'; url: string }

type VideoScene = { id: number; name: string; duration: number; caption: string }

type VideoProject = {
  id: number
  title: string
  description: string
  status: 'draft' | 'rendering' | 'published' | 'failed'
  duration: string
  created_at: string
  updated_at: string
  scenes: VideoScene[]
  assets: VideoAsset[]
}

const getTotalDuration = (scenes: VideoScene[]) => {
  const total = scenes.reduce((sum, scene) => sum + scene.duration, 0)
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`
}

export default function VideoProjectDetailPage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const { toast } = useToast()
  const [project, setProject] = useState<VideoProject | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false)

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
          title: data.name,
          description: data.description || '',
          status: data.status,
          duration: data.duration,
          created_at: data.created_at,
          updated_at: data.updated_at,
          scenes: data.scenes || [],
          assets: data.assets || []
        }
        setProject(loadedProject)
        
        // Set preview to first video asset or first asset
        const firstVideo = loadedProject.assets.find((asset) => asset.type === 'video')
        if (firstVideo) {
          setPreview(firstVideo.url)
        } else if (loadedProject.assets.length > 0) {
          setPreview(loadedProject.assets[0].url)
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

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-600">Loading project...</div>
      </div>
    )
  }

  const updateScene = async (sceneId: number, field: keyof VideoScene, value: string | number) => {
    const scenes = project.scenes.map((scene) =>
      scene.id === sceneId ? { ...scene, [field]: field === 'duration' ? Number(value) : value } : scene
    )
    const update = { ...project, scenes, duration: getTotalDuration(scenes) }
    setProject(update)
    
    try {
      await apiFetch(`/api/ads/video-projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: update.title,
          description: update.description,
          status: update.status,
          duration: update.duration,
          scenes: update.scenes,
          assets: update.assets
        }),
      })
    } catch (error) {
      console.error('Error saving project:', error)
      toast({ title: 'Error', description: 'Failed to save changes', variant: 'destructive' })
    }
  }

  const updateField = async (field: keyof VideoProject, value: string) => {
    const updated = { ...project, [field]: value }
    setProject(updated)
    
    try {
      await apiFetch(`/api/ads/video-projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updated.title,
          description: updated.description,
          status: updated.status,
          duration: updated.duration,
          scenes: updated.scenes,
          assets: updated.assets
        }),
      })
    } catch (error) {
      console.error('Error saving project:', error)
      toast({ title: 'Error', description: 'Failed to save changes', variant: 'destructive' })
    }
  }

  const onFileUpload = async (files: FileList | null, type: 'video' | 'image' | 'audio') => {
    if (!files) return

    const assets = Array.from(files).map((file, idx) => ({
      id: Date.now() + idx,
      name: file.name,
      type,
      url: URL.createObjectURL(file)
    }))

    const updated = { ...project, assets: [...project.assets, ...assets] }
    setProject(updated)
    setPreview(assets[0].url)
    
    try {
      await apiFetch(`/api/ads/video-projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updated.title,
          description: updated.description,
          status: updated.status,
          duration: updated.duration,
          scenes: updated.scenes,
          assets: updated.assets
        }),
      })
    } catch (error) {
      console.error('Error saving project:', error)
      toast({ title: 'Error', description: 'Failed to save changes', variant: 'destructive' })
    }
  }

  const setStatus = async (status: VideoProject['status']) => {
    const updated = { ...project, status }
    setProject(updated)
    
    try {
      await apiFetch(`/api/ads/video-projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updated.title,
          description: updated.description,
          status: updated.status,
          duration: updated.duration,
          scenes: updated.scenes,
          assets: updated.assets
        }),
      })
      toast({ title: `Status changed to ${status}`, description: 'Project status was updated.' })
    } catch (error) {
      console.error('Error updating status:', error)
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
    }
  }

  const onDelete = async () => {
    try {
      const response = await apiFetch(`/api/ads/video-projects/${project.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        toast({ title: 'Deleted', description: 'Project removed from your library.' })
        router.push('/dashboard/ads/video')
      } else {
        throw new Error('Failed to delete')
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      toast({ title: 'Error', description: 'Failed to delete project', variant: 'destructive' })
    }
  }

  const saveAsTemplate = async () => {
    const templateName = prompt('Template name:', `${project.title} Template`)
    if (!templateName) return

    try {
      const response = await apiFetch(`/api/ads/video-projects/${project.id}/save-as-template?template_name=${encodeURIComponent(templateName)}`, {
        method: 'POST',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Saved as template: "${templateName}". Other users can now use this template.`,
        })
      } else {
        throw new Error('Failed to save template')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      toast({
        title: 'Error',
        description: 'Failed to save as template',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border border-gray-200 rounded-lg p-3 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-gray-500">Edit Video Project</p>
            <h1 className="text-xl font-bold text-gray-900 truncate">{project.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={statusClass}>{project.status}</Badge>
            <Button size="sm" variant="ghost" onClick={() => router.push('/dashboard/ads/video')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button size="sm" onClick={() => setStatus('rendering')}>
              <Play className="w-4 h-4 mr-1" /> Render
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStatus('published')}>
              Publish
            </Button>
            <Button size="sm" variant="outline" onClick={saveAsTemplate}>
              <Share2 className="w-4 h-4 mr-1" /> Template
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStatus('failed')} className="text-red-600 border-red-300 hover:bg-red-50">
              Failed
            </Button>
            <Button size="sm" variant="outline" onClick={onDelete} className="text-red-600 border-red-300 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Project Basics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={project.title} onChange={(e) => updateField('title', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={project.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <Label>Duration</Label>
              <Input value={project.duration} disabled />
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Scene timeline</h4>
              {project.scenes.map((scene) => (
                <div key={scene.id} className="grid grid-cols-12 gap-2 items-center">
                  <Input
                    className="col-span-5"
                    value={scene.name}
                    onChange={(e) => updateScene(scene.id, 'name', e.target.value)}
                  />
                  <Input
                    className="col-span-3"
                    type="number"
                    min={1}
                    value={scene.duration}
                    onChange={(e) => updateScene(scene.id, 'duration', Number(e.target.value))}
                  />
                  <Input
                    className="col-span-3"
                    value={scene.caption}
                    onChange={(e) => updateScene(scene.id, 'caption', e.target.value)}
                  />
                  <Button variant="outline" className="col-span-1" onClick={async () => {
                    const scenes = project.scenes.filter((s) => s.id !== scene.id)
                    const updated = { ...project, scenes, duration: getTotalDuration(scenes) }
                    setProject(updated)
                    
                    try {
                      await apiFetch(`/api/ads/video-projects/${project.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: updated.title,
                          description: updated.description,
                          status: updated.status,
                          duration: updated.duration,
                          scenes: updated.scenes,
                          assets: updated.assets
                        }),
                      })
                    } catch (error) {
                      console.error('Error saving project:', error)
                      toast({ title: 'Error', description: 'Failed to save changes', variant: 'destructive' })
                    }
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Summary</CardTitle>
            <CardDescription>Quick overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p><strong>Status:</strong> {project.status}</p>
            <p><strong>Scenes:</strong> {project.scenes.length}</p>
            <p><strong>Assets:</strong> {project.assets.length}</p>
            <p><strong>Duration:</strong> {project.duration}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Assets</CardTitle>
          <CardDescription>Add video, image, audio clips for timeline</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <label className="cursor-pointer rounded-md border border-dashed border-gray-300 p-3 text-center">
              <input type="file" accept="video/*" hidden onChange={(e) => onFileUpload(e.target.files, 'video')} multiple />
              <UploadCloud className="mx-auto h-5 w-5" />
              <p className="text-xs">Upload video</p>
            </label>
            <label className="cursor-pointer rounded-md border border-dashed border-gray-300 p-3 text-center">
              <input type="file" accept="image/*" hidden onChange={(e) => onFileUpload(e.target.files, 'image')} multiple />
              <UploadCloud className="mx-auto h-5 w-5" />
              <p className="text-xs">Upload images</p>
            </label>
            <label className="cursor-pointer rounded-md border border-dashed border-gray-300 p-3 text-center">
              <input type="file" accept="audio/*" hidden onChange={(e) => onFileUpload(e.target.files, 'audio')} multiple />
              <UploadCloud className="mx-auto h-5 w-5" />
              <p className="text-xs">Upload audio</p>
            </label>
          </div>

          {project.assets.length > 0 ? (
            <div className="grid gap-2">
              {project.assets.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between rounded border border-gray-200 p-2">
                  <span className="text-sm">{asset.name}</span>
                  <Badge>{asset.type}</Badge>
                  {asset.type === 'video' && (
                    <Button variant="ghost" onClick={() => setPreview(asset.url)}>
                      View
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No assets yet. Upload at least one video file to preview.</p>
          )}

          {preview ? (
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">Preview</label>
                <Button variant="outline" onClick={() => setIsPreviewFullscreen((prev) => !prev)}>
                  {isPreviewFullscreen ? 'Compact' : 'Fullscreen'}
                </Button>
              </div>
              <video
                className={`w-full rounded-md ${isPreviewFullscreen ? 'h-[70vh]' : 'max-h-[300px]'}`}
                src={preview}
                controls
                autoPlay
              />
            </div>
          ) : (
            <p className="text-sm text-gray-500">Select a video asset to preview.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={async () => {
          setSaving(true)
          try {
            const response = await apiFetch(`/api/ads/video-projects/${project.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: project.title,
                description: project.description,
                status: project.status,
                duration: project.duration,
                scenes: project.scenes,
                assets: project.assets
              }),
            })
            
            if (!response.ok) {
              throw new Error('Failed to save project')
            }

            toast({ title: 'Saved', description: 'Project updates saved successfully.' })
            // Redirect to project library so saved project is visible immediately
            await new Promise(resolve => setTimeout(resolve, 500))
            router.push('/dashboard/ads/video')
          } catch (error) {
            console.error('Error saving project:', error)
            toast({ title: 'Error', description: 'Failed to save changes', variant: 'destructive' })
            setSaving(false)
          }
        }} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
