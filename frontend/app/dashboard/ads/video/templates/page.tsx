'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Film, Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { apiFetch } from '@/lib/api'

interface VideoTemplate {
  id: number
  name: string
  description: string
  video_type: string
  platform: string
  duration: string
  scenes: Array<{ id: number; name: string; duration: number; caption: string }>
  thumbnail_url?: string
  can_delete?: boolean
}

const templateBgByType: Record<string, string> = {
  story: 'from-purple-500 to-pink-500',
  reel: 'from-indigo-500 to-cyan-500',
  post: 'from-orange-500 to-red-500',
  custom: 'from-emerald-500 to-teal-500',
}

export default function TemplatesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [templates, setTemplates] = useState<VideoTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingTemplateId, setCreatingTemplateId] = useState<number | null>(null)
  const [deletingTemplateId, setDeletingTemplateId] = useState<number | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await apiFetch('/api/ads/video-templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load templates',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFromTemplate = async (templateId: number) => {
    if (creatingTemplateId !== null) return
    const projectName = `${templates.find(t => t.id === templateId)?.name || 'Project'} - ${new Date().toLocaleDateString()}`
    
    try {
      setCreatingTemplateId(templateId)
      const response = await apiFetch(`/api/ads/video-projects/from-template/${templateId}?project_name=${encodeURIComponent(projectName)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to create project from template')
      }

      const data = await response.json()
      const projectId = data.project?.id
      if (!projectId) {
        throw new Error('Template project was created but no project id was returned')
      }
      router.push(`/dashboard/ads/video/${projectId}`)
    } catch (error) {
      console.error('Error creating project:', error)
      toast({
        title: 'Unable to open template project',
        description: 'Please try again. If the issue persists, choose "Start from Scratch" and save as template later.',
        variant: 'destructive'
      })
    } finally {
      setCreatingTemplateId(null)
    }
  }

  const handleCreateBlank = () => {
    router.push('/dashboard/ads/video/create')
  }

  const handleDeleteTemplate = async (templateId: number) => {
    if (deletingTemplateId !== null) return
    const confirmed = window.confirm('Are you sure you want to delete this template? This action cannot be undone.')
    if (!confirmed) return
    try {
      setDeletingTemplateId(templateId)
      const response = await apiFetch(`/api/ads/video-templates/${templateId}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error('Failed to delete template')
      }
      setTemplates((prev) => prev.filter((t) => t.id !== templateId))
      toast({ title: 'Deleted', description: 'Template removed successfully.' })
    } catch (error) {
      console.error('Error deleting template:', error)
      toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' })
    } finally {
      setDeletingTemplateId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading templates...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center mb-6 gap-4">
        <Button variant="ghost" onClick={() => router.push('/dashboard/ads/video')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Video Projects
        </Button>
        <h1 className="text-3xl font-bold">Choose a Template</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Blank project option */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed" onClick={handleCreateBlank}>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Plus className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Start from Scratch</h3>
            <p className="text-sm text-gray-600 text-center">Create a blank video project with default scenes</p>
          </CardContent>
        </Card>

        {/* Template cards */}
        {templates.map((template) => (
          <Card
            key={template.id}
            className={`hover:shadow-lg transition-shadow overflow-hidden group ${creatingTemplateId !== null ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => {
              if (creatingTemplateId === null) {
                handleCreateFromTemplate(template.id)
              }
            }}
            onKeyDown={(e) => {
              if (creatingTemplateId !== null) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleCreateFromTemplate(template.id)
              }
            }}
            role="button"
            tabIndex={creatingTemplateId !== null ? -1 : 0}
            aria-label={`Use template ${template.name}`}
            aria-disabled={creatingTemplateId !== null}
          >
            <div className="relative h-64">
              {template.thumbnail_url && !template.thumbnail_url.startsWith('blob:') ? (
                <img src={template.thumbnail_url} alt={template.name} className="h-full w-full object-contain bg-black" />
              ) : (
                <div className={`h-full w-full bg-gradient-to-br ${templateBgByType[template.video_type] || 'from-slate-500 to-gray-600'} flex items-center justify-center`}>
                  <Film className="w-10 h-10 text-white/90" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />

              <div className="absolute top-3 right-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-gray-800">
                    {template.duration || '00:30'}
                  </span>
                  {template.can_delete && (
                    <button
                      type="button"
                      className="rounded-full bg-white/90 p-1 text-red-600 hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTemplate(template.id)
                      }}
                      disabled={deletingTemplateId !== null}
                      aria-label="Delete template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h3 className="text-lg font-semibold leading-tight truncate">{template.name}</h3>
                <p className="text-xs text-white/85 mt-1 line-clamp-2">{template.description || 'Ready-to-use video template'}</p>
              </div>
            </div>
            <CardContent className="p-3">
              <p className="text-sm text-gray-600 text-center">
                {creatingTemplateId === template.id ? 'Opening editor...' : 'Click anywhere on this card to use template'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No templates available. Create a blank project to get started.</p>
          <Button onClick={handleCreateBlank}>Create Blank Project</Button>
        </div>
      )}
    </div>
  )
}
