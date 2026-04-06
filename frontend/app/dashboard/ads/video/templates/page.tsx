'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Film, Plus } from 'lucide-react'
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
}

export default function TemplatesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [templates, setTemplates] = useState<VideoTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)

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
    const projectName = `${templates.find(t => t.id === templateId)?.name || 'Project'} - ${new Date().toLocaleDateString()}`
    
    try {
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
      toast({
        title: 'Success',
        description: `Project created from template`,
      })
      await new Promise(resolve => setTimeout(resolve, 500))
      router.push(`/dashboard/ads/video/${data.project?.id}`)
    } catch (error) {
      console.error('Error creating project:', error)
      toast({
        title: 'Error',
        description: 'Failed to create project from template',
        variant: 'destructive'
      })
    }
  }

  const handleCreateBlank = () => {
    router.push('/dashboard/ads/video/create')
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
          <Card key={template.id} className="hover:shadow-lg transition-shadow overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">{template.duration}</CardDescription>
                </div>
                <Film className="w-5 h-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{template.description}</p>
              
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Scenes ({template.scenes?.length || 0}):</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {template.scenes?.map((scene, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span>{scene.name}</span>
                      <span className="text-gray-500">{scene.duration}s</span>
                    </li>
                  )) || <li>No scenes</li>}
                </ul>
              </div>

              <Button 
                onClick={() => handleCreateFromTemplate(template.id)}
                className="w-full"
              >
                Use This Template
              </Button>
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
