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
  assets: Array<{ id: number; name: string; type: 'video' | 'image' | 'audio'; url: string }>
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

const persistProject = (project: VideoProject) => {
  if (typeof window === 'undefined') return
  const existing = JSON.parse(localStorage.getItem('videoProjects') || '[]') as VideoProject[]
  const filtered = existing.filter((item) => item.id !== project.id)
  localStorage.setItem('videoProjects', JSON.stringify([...filtered, project]))
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

  const onFileUpload = (files: FileList | null, type: 'video' | 'image' | 'audio') => {
    if (!files) return

    const newAssets = Array.from(files).map((file, index) => ({
      id: Date.now() + index,
      name: file.name,
      type,
      url: URL.createObjectURL(file)
    }))

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

    const savedProject: VideoProject = { ...project, status: 'draft', duration: getTotalDuration(project.scenes) }
    persistProject(savedProject)

    toast({ title: 'Saved', description: 'Video project created and saved to local storage.' })
    router.push('/dashboard/ads/video')
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
            <CardDescription>Sequence and length in seconds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {project.scenes.map((scene) => (
              <div key={scene.id} className="grid grid-cols-12 gap-2 items-center">
                <Input
                  className="col-span-4"
                  value={scene.name}
                  onChange={(e) => updateScene(scene.id, 'name', e.target.value)}
                  aria-label="Scene title"
                />
                <Input
                  type="number"
                  min={1}
                  className="col-span-2"
                  value={scene.duration}
                  onChange={(e) => updateScene(scene.id, 'duration', Number(e.target.value))}
                  aria-label="Scene duration"
                />
                <Input
                  className="col-span-5"
                  value={scene.caption}
                  onChange={(e) => updateScene(scene.id, 'caption', e.target.value)}
                  placeholder="Caption"
                />
                <Button type="button" variant="outline" className="col-span-1" onClick={() => removeScene(scene.id)}>
                  Delete
                </Button>
              </div>
            ))}

            <Button type="button" onClick={addScene} variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Add Scene
            </Button>
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
                <h4 className="text-sm font-medium">Preview</h4>
                <video className="w-full rounded-md" src={previewAssetUrl} controls />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="ghost" onClick={() => router.push('/dashboard/ads/video')}>
            Cancel
          </Button>
          <Button type="submit">
            <Save className="w-4 h-4 mr-2" /> Save Project
          </Button>
        </div>
      </form>
    </div>
  )
}
