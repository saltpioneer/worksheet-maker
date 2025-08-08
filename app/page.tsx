'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Copy, Download, FileText, Loader2, AlertTriangle, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import ReactMarkdown from 'react-markdown'
import { ApiKeyWarning } from '@/components/api-key-warning'

interface WorksheetInputs {
  curriculum: string
  subject: string
  grade: string
  topic: string
  objectives: string[]
  duration: string
  support_level_desc: string
  core_level_desc: string
  extension_level_desc: string
  n_support: number
  n_core: number
  n_extension: number
  constraints: string
  materials: string
  include_teacher_notes: boolean
  include_rubric: boolean
  page_size: 'A4' | 'Letter'
  max_pages: number
}

const defaultInputs: WorksheetInputs = {
  curriculum: 'Australian Curriculum v9.0',
  subject: 'Mathematics',
  grade: 'Year 5',
  topic: 'Fractions',
  objectives: ['Understand equivalent fractions', 'Add and subtract fractions with same denominator'],
  duration: '45 minutes',
  support_level_desc: 'Visual aids, sentence starters, worked examples',
  core_level_desc: 'Standard difficulty with some scaffolding',
  extension_level_desc: 'Complex reasoning and application tasks',
  n_support: 4,
  n_core: 6,
  n_extension: 3,
  constraints: 'Reading age 10-11, some EAL students',
  materials: 'Fraction strips, calculator',
  include_teacher_notes: true,
  include_rubric: true,
  page_size: 'A4',
  max_pages: 4
}

export default function WorksheetMaker() {
  const [inputs, setInputs] = useState<WorksheetInputs>(defaultInputs)
  const [markdown, setMarkdown] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [estimatedPages, setEstimatedPages] = useState(0)
  const { toast } = useToast()

  const updateInput = (key: keyof WorksheetInputs, value: any) => {
    setInputs(prev => ({ ...prev, [key]: value }))
  }

  const updateObjective = (index: number, value: string) => {
    const newObjectives = [...inputs.objectives]
    newObjectives[index] = value
    setInputs(prev => ({ ...prev, objectives: newObjectives }))
  }

  const addObjective = () => {
    if (inputs.objectives.length < 3) {
      setInputs(prev => ({ ...prev, objectives: [...prev.objectives, ''] }))
    }
  }

  const removeObjective = (index: number) => {
    if (inputs.objectives.length > 1) {
      const newObjectives = inputs.objectives.filter((_, i) => i !== index)
      setInputs(prev => ({ ...prev, objectives: newObjectives }))
    }
  }

  const estimatePages = (text: string) => {
    // Rough estimation: ~500 words per page
    const wordCount = text.split(/\s+/).length
    return Math.ceil(wordCount / 500)
  }

  const generateWorksheet = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to generate worksheet')
      }

      const data = await response.json()
      setMarkdown(data.markdown)
      setEstimatedPages(estimatePages(data.markdown))
      
      toast({
        title: 'Worksheet generated!',
        description: 'Your worksheet is ready for preview and export.'
      })
    } catch (error) {
      let errorMessage = 'Please try again.'
  
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage = 'Google AI API key is not configured. Please check your environment variables.'
        } else if (error.message.includes('quota')) {
          errorMessage = 'API quota exceeded. Please try again later.'
        } else if (error.message.includes('safety')) {
          errorMessage = 'Content was blocked by safety filters. Please try different inputs.'
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        title: 'Generation failed',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown)
      toast({
        title: 'Copied!',
        description: 'Markdown copied to clipboard.'
      })
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Please try again.',
        variant: 'destructive'
      })
    }
  }

  const downloadMarkdown = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${inputs.subject}-${inputs.topic}-worksheet.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: 'Downloaded!',
      description: 'Markdown file saved to your device.'
    })
  }

  const exportPDF = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          markdown, 
          pageSize: inputs.page_size,
          filename: `${inputs.subject}-${inputs.topic}-worksheet`
        })
      })

      if (!response.ok) {
        throw new Error('Failed to export PDF')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${inputs.subject}-${inputs.topic}-worksheet.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({
        title: 'PDF exported!',
        description: 'PDF file saved to your device.'
      })
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Sparkles className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Class Worksheet Maker for Teachers</h1>
          </div>
          <p className="text-slate-600 text-lg">Create printable differentiated worksheets with answer keys for teachers</p>
        </div>

        {/* API Key Warning */}
        <div className="mb-8">
          <ApiKeyWarning />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <Card className="shadow-sm border-0 bg-white/80 backdrop-blur">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <FileText className="h-5 w-5 text-blue-600" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="curriculum" className="text-sm font-medium">Curriculum</Label>
                      <Input
                        id="curriculum"
                        value={inputs.curriculum}
                        onChange={(e) => updateInput('curriculum', e.target.value)}
                        placeholder="e.g., Australian Curriculum v9.0"
                        className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-sm font-medium">Subject</Label>
                      <Input
                        id="subject"
                        value={inputs.subject}
                        onChange={(e) => updateInput('subject', e.target.value)}
                        placeholder="e.g., Mathematics"
                        className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="grade" className="text-sm font-medium">Grade/Year</Label>
                      <Input
                        id="grade"
                        value={inputs.grade}
                        onChange={(e) => updateInput('grade', e.target.value)}
                        placeholder="e.g., Year 5"
                        className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration" className="text-sm font-medium">Duration</Label>
                      <Input
                        id="duration"
                        value={inputs.duration}
                        onChange={(e) => updateInput('duration', e.target.value)}
                        placeholder="e.g., 45 minutes"
                        className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="topic" className="text-sm font-medium">Topic</Label>
                    <Input
                      id="topic"
                      value={inputs.topic}
                      onChange={(e) => updateInput('topic', e.target.value)}
                      placeholder="e.g., Fractions"
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-200" />

              {/* Learning Objectives */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Learning Objectives</h3>
                <div className="space-y-3">
                  {inputs.objectives.map((objective, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-1 space-y-2">
                        <Label className="text-sm font-medium">Objective {index + 1}</Label>
                        <Input
                          value={objective}
                          onChange={(e) => updateObjective(index, e.target.value)}
                          placeholder={`Learning objective ${index + 1}`}
                          className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      {inputs.objectives.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeObjective(index)}
                          className="mt-7 border-slate-200 hover:bg-slate-50"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  {inputs.objectives.length < 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addObjective}
                      className="border-slate-200 hover:bg-slate-50"
                    >
                      Add Objective
                    </Button>
                  )}
                </div>
              </div>

              <Separator className="bg-slate-200" />

              {/* Differentiation Levels */}
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Differentiation Levels</h3>
                
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="support" className="text-sm font-medium text-green-700">Support Level</Label>
                    <Textarea
                      id="support"
                      value={inputs.support_level_desc}
                      onChange={(e) => updateInput('support_level_desc', e.target.value)}
                      placeholder="Visual aids, sentence starters, worked examples"
                      rows={2}
                      className="border-slate-200 focus:border-green-500 focus:ring-green-500"
                    />
                    <div className="flex items-center gap-3">
                      <Label htmlFor="n_support" className="text-sm font-medium">Questions:</Label>
                      <Input
                        id="n_support"
                        type="number"
                        min="1"
                        max="10"
                        value={inputs.n_support}
                        onChange={(e) => updateInput('n_support', parseInt(e.target.value) || 1)}
                        className="w-20 border-slate-200 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="core" className="text-sm font-medium text-blue-700">Core Level</Label>
                    <Textarea
                      id="core"
                      value={inputs.core_level_desc}
                      onChange={(e) => updateInput('core_level_desc', e.target.value)}
                      placeholder="Standard difficulty with some scaffolding"
                      rows={2}
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-3">
                      <Label htmlFor="n_core" className="text-sm font-medium">Questions:</Label>
                      <Input
                        id="n_core"
                        type="number"
                        min="1"
                        max="15"
                        value={inputs.n_core}
                        onChange={(e) => updateInput('n_core', parseInt(e.target.value) || 1)}
                        className="w-20 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="extension" className="text-sm font-medium text-purple-700">Extension Level</Label>
                    <Textarea
                      id="extension"
                      value={inputs.extension_level_desc}
                      onChange={(e) => updateInput('extension_level_desc', e.target.value)}
                      placeholder="Complex reasoning and application tasks"
                      rows={2}
                      className="border-slate-200 focus:border-purple-500 focus:ring-purple-500"
                    />
                    <div className="flex items-center gap-3">
                      <Label htmlFor="n_extension" className="text-sm font-medium">Questions:</Label>
                      <Input
                        id="n_extension"
                        type="number"
                        min="1"
                        max="10"
                        value={inputs.n_extension}
                        onChange={(e) => updateInput('n_extension', parseInt(e.target.value) || 1)}
                        className="w-20 border-slate-200 focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-200" />

              {/* Additional Settings */}
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Additional Settings</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="constraints" className="text-sm font-medium">Constraints & Accommodations</Label>
                    <Textarea
                      id="constraints"
                      value={inputs.constraints}
                      onChange={(e) => updateInput('constraints', e.target.value)}
                      placeholder="e.g., reading age 8-9; EAL students; no calculators"
                      rows={2}
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="materials" className="text-sm font-medium">Materials</Label>
                    <Input
                      id="materials"
                      value={inputs.materials}
                      onChange={(e) => updateInput('materials', e.target.value)}
                      placeholder="e.g., ruler, grid paper, calculator"
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="page_size" className="text-sm font-medium">Page Size</Label>
                      <Select value={inputs.page_size} onValueChange={(value: 'A4' | 'Letter') => updateInput('page_size', value)}>
                        <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A4">A4</SelectItem>
                          <SelectItem value="Letter">Letter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_pages" className="text-sm font-medium">Max Pages</Label>
                      <Input
                        id="max_pages"
                        type="number"
                        min="1"
                        max="10"
                        value={inputs.max_pages}
                        onChange={(e) => updateInput('max_pages', parseInt(e.target.value) || 1)}
                        className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="teacher_notes"
                        checked={inputs.include_teacher_notes}
                        onCheckedChange={(checked) => updateInput('include_teacher_notes', checked)}
                        className="border-slate-300"
                      />
                      <Label htmlFor="teacher_notes" className="text-sm font-medium">Include Teacher Notes</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="rubric"
                        checked={inputs.include_rubric}
                        onCheckedChange={(checked) => updateInput('include_rubric', checked)}
                        className="border-slate-300"
                      />
                      <Label htmlFor="rubric" className="text-sm font-medium">Include Rubric</Label>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                onClick={generateWorksheet} 
                disabled={isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Worksheet...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Worksheet
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Preview Section */}
          <Card className="shadow-sm border-0 bg-white/80 backdrop-blur">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Preview</CardTitle>
                {markdown && (
                  <div className="flex items-center gap-2">
                    {estimatedPages > inputs.max_pages && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {estimatedPages} pages (exceeds {inputs.max_pages})
                      </Badge>
                    )}
                    {estimatedPages <= inputs.max_pages && estimatedPages > 0 && (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                        ~{estimatedPages} pages
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!markdown ? (
                <div className="text-center py-16 text-slate-500">
                  <div className="p-4 bg-slate-100 rounded-full w-fit mx-auto mb-4">
                    <FileText className="h-8 w-8 opacity-50" />
                  </div>
                  <p className="text-lg font-medium mb-2">No worksheet generated yet</p>
                  <p className="text-sm">Fill out the form and click "Generate Worksheet" to see the preview</p>
                </div>
              ) : (
                <>
                  {estimatedPages > inputs.max_pages && (
                    <Alert className="mb-6 border-orange-200 bg-orange-50">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        This worksheet may exceed your {inputs.max_pages} page limit. Consider reducing question counts or content.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex gap-2 mb-6">
                    <Button onClick={copyMarkdown} variant="outline" size="sm" className="border-slate-200 hover:bg-slate-50">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button onClick={downloadMarkdown} variant="outline" size="sm" className="border-slate-200 hover:bg-slate-50">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button 
                      onClick={exportPDF} 
                      disabled={isExporting}
                      size="sm"
                      className="bg-slate-900 hover:bg-slate-800 text-white"
                    >
                      {isExporting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      Export PDF
                    </Button>
                  </div>
                  
                  <div className="prose prose-sm max-w-none bg-white p-8 rounded-lg border border-slate-200 max-h-[800px] overflow-y-auto">
                    <ReactMarkdown>{markdown}</ReactMarkdown>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
