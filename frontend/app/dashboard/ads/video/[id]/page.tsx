'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Play, Trash2, UploadCloud, Save } from 'lucide-react'

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

const loadProjects = (): VideoProject[] => {
  if (typeof window === 'undefined') return []
  try {
    const value = localStorage.getItem('videoProjects')
    return value ? (JSON.parse(value) as VideoProject[]) : []
  } catch {
    return []
  }
}

const saveProjects = (projects: VideoProject[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem('videoProjects', JSON.stringify(projects))
}

export default function VideoProjectDetailPage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const { toast } = useToast()
  const [project, setProject] = useState<VideoProject | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    const projectId = Number(params.id)
    const projects = loadProjects()
    const found = projects.find((item) => item.id === projectId)

    if (!found) {
      toast({ title: 'Not found', description: 'Video project does not exist', variant: 'destructive' })
      router.push('/dashboard/ads/video')
      return
    }

    setProject(found)
    if (found.assets.length > 0) {
      setPreview(found.assets[0].url)
    }
  }, [params.id, router, toast])

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

  const updateScene = (sceneId: number, field: keyof VideoScene, value: string | number) => {
    const scenes = project.scenes.map((scene) =>
      scene.id === sceneId ? { ...scene, [field]: field === 'duration' ? Number(value) : value } : scene
    )
    const update = { ...project, scenes, duration: getTotalDuration(scenes), updated_at: new Date().toISOString().slice(0, 10) }
    setProject(update)
    saveProjects([...loadProjects().filter((p) => p.id !== project.id), update])
  }

  const updateField = (field: keyof VideoProject, value: string) => {
    const updated = { ...project, [field]: value, updated_at: new Date().toISOString().slice(0, 10) }
    setProject(updated)
    saveProjects([...loadProjects().filter((p) => p.id !== project.id), updated])
  }

  const onFileUpload = (files: FileList | null, type: 'video' | 'image' | 'audio') => {
    if (!files) return

    const assets = Array.from(files).map((file, idx) => ({
      id: Date.now() + idx,
      name: file.name,
      type,
      url: URL.createObjectURL(file)
    }))

    const updated = { ...project, assets: [...project.assets, ...assets], updated_at: new Date().toISOString().slice(0, 10) }
    setProject(updated)
    setPreview(assets[0].url)
    saveProjects([...loadProjects().filter((p) => p.id !== project.id), updated])
  }

  const setStatus = (status: VideoProject['status']) => {
    const updated = { ...project, status, updated_at: new Date().toISOString().slice(0, 10) }
    setProject(updated)
    saveProjects([...loadProjects().filter((p) => p.id !== project.id), updated])
    toast({ title: `Status changed to ${status}`, description: 'Project status was updated.' })
  }

  const onDelete = () => {
    const remaining = loadProjects().filter((item) => item.id !== project.id)
    saveProjects(remaining)
    toast({ title: 'Deleted', description: 'Project removed from your library.' })
    router.push('/dashboard/ads/video')
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Video Project</h1>
          <p className="text-gray-600">{project.title}</p>
        </div>

        <div className="flex gap-2 items-center">
          <Badge className={statusClass}>{project.status}</Badge>
          <Button variant="ghost" onClick={() => router.push('/dashboard/ads/video')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
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
                  <Button variant="outline" className="col-span-1" onClick={() => {
                    const scenes = project.scenes.filter((s) => s.id !== scene.id)
                    const updated = { ...project, scenes, duration: getTotalDuration(scenes), updated_at: new Date().toISOString().slice(0, 10) }
                    setProject(updated)
                    saveProjects([...loadProjects().filter((p) => p.id !== project.id), updated])
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
            <CardTitle>Render Actions</CardTitle>
            <CardDescription>Control project state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => setStatus('rendering')}>
              <Play className="w-4 h-4 mr-2" /> Start Rendering
            </Button>
            <Button onClick={() => setStatus('published')} variant="outline">
              Publish
            </Button>
            <Button onClick={() => setStatus('failed')} variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
              Mark failed
            </Button>
            <Button onClick={onDelete} variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" /> Delete Project
            </Button>
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
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No assets yet.</p>
          )}

          {preview && (
            <div className="mt-3">
              <label className="text-sm font-semibold">Preview</label>
              <video className="w-full rounded-md" src={preview} controls />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={() => {
          saveProjects([...loadProjects().filter((p) => p.id !== project.id), project])
          toast({ title: 'Saved', description: 'Project updates saved locally.' })
        }}>
          <Save className="w-4 h-4 mr-2" /> Save
        </Button>
      </div>
    </div>
  )
}
