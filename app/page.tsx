'use client'

import {useState} from 'react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Textarea} from '@/components/ui/textarea'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {Checkbox} from '@/components/ui/checkbox'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Separator} from '@/components/ui/separator'
import {Badge} from '@/components/ui/badge'
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
import {AlertTriangle, Copy, Download, FileText, HelpCircle, Loader2, Sparkles, Trash2} from 'lucide-react'
import {useToast} from '@/hooks/use-toast'
import ReactMarkdown from 'react-markdown'
import {ApiKeyWarning} from '@/components/api-key-warning'
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip'

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
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const { toast } = useToast()

  // Validation logic for each field
  const validateInput = (key: keyof WorksheetInputs, value: any) => {
    let error = ''
    if (key === 'curriculum' && !value) error = 'Curriculum is required.'
    if (key === 'subject' && !value) error = 'Subject is required.'
    if (key === 'grade' && !value) error = 'Grade/Year is required.'
    if (key === 'topic' && !value) error = 'Topic is required.'
    if (key === 'duration' && !value) error = 'Duration is required.'
    if (key === 'n_support' && (value < 1 || value > 10)) error = 'Support questions must be between 1 and 10.'
    if (key === 'n_core' && (value < 1 || value > 15)) error = 'Core questions must be between 1 and 15.'
    if (key === 'n_extension' && (value < 1 || value > 10)) error = 'Extension questions must be between 1 and 10.'
    if (key === 'max_pages' && (value < 1 || value > 10)) error = 'Max pages must be between 1 and 10.'
    setErrors(prev => ({...prev, [key]: error}))
  }

  // Validate all required fields before generating worksheet
  const validateAll = () => {
    let valid = true
    const newErrors: { [key: string]: string } = {}
    if (!inputs.curriculum) {
      newErrors.curriculum = 'Curriculum is required.';
      valid = false
    }
    if (!inputs.subject) {
      newErrors.subject = 'Subject is required.';
      valid = false
    }
    if (!inputs.grade) {
      newErrors.grade = 'Grade/Year is required.';
      valid = false
    }
    if (!inputs.topic) {
      newErrors.topic = 'Topic is required.';
      valid = false
    }
    if (!inputs.duration) {
      newErrors.duration = 'Duration is required.';
      valid = false
    }
    if (inputs.n_support < 1 || inputs.n_support > 10) {
      newErrors.n_support = 'Support questions must be between 1 and 10.';
      valid = false
    }
    if (inputs.n_core < 1 || inputs.n_core > 15) {
      newErrors.n_core = 'Core questions must be between 1 and 15.';
      valid = false
    }
    if (inputs.n_extension < 1 || inputs.n_extension > 10) {
      newErrors.n_extension = 'Extension questions must be between 1 and 10.';
      valid = false
    }
    if (inputs.max_pages < 1 || inputs.max_pages > 10) {
      newErrors.max_pages = 'Max pages must be between 1 and 10.';
      valid = false
    }
    setErrors(newErrors)
    return valid
  }

  // Update input and validate
  const updateInput = (key: keyof WorksheetInputs, value: any) => {
    setInputs(prev => ({ ...prev, [key]: value }))
    validateInput(key, value)
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
    if (!validateAll()) {
      toast({
        title: 'Invalid input',
        description: 'Please fix the errors in the form before generating.',
        variant: 'destructive'
      })
      return
    }
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
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
            {/* Header */}
            <header className="mb-8 text-center">
              <div className="inline-flex items-center justify-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Sparkles className="h-6 w-6 text-primary"/>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Class Worksheet Maker</h1>
              </div>
              <p className="text-lg text-muted-foreground">Create printable differentiated worksheets with answer keys
                for teachers.</p>
            </header>

            {/* API Key Warning */}
            <div className="mb-8 max-w-2xl mx-auto">
              <ApiKeyWarning/>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Form Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary"/>
                    Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="curriculum">Curriculum</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer"/>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Specify the curriculum or standards, e.g., "Common Core".</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="curriculum"
                        value={inputs.curriculum}
                        onChange={(e) => updateInput('curriculum', e.target.value)}
                        placeholder="e.g., Australian Curriculum v9.0"
                      />
                      {errors.curriculum && <p className="text-xs text-destructive mt-1">{errors.curriculum}</p>}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="subject">Subject</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer"/>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>The subject area, e.g., "Mathematics", "Science".</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="subject"
                        value={inputs.subject}
                        onChange={(e) => updateInput('subject', e.target.value)}
                        placeholder="e.g., Mathematics"
                      />
                      {errors.subject && <p className="text-xs text-destructive mt-1">{errors.subject}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="grade">Grade/Year</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer"/>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>The grade or year level, e.g., "Year 5", "Grade 3".</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="grade"
                        value={inputs.grade}
                        onChange={(e) => updateInput('grade', e.target.value)}
                        placeholder="e.g., Year 5"
                      />
                      {errors.grade && <p className="text-xs text-destructive mt-1">{errors.grade}</p>}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="duration">Duration</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer"/>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Lesson length, e.g., "45 minutes" or "1.5 hours".</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="duration"
                        value={inputs.duration}
                        onChange={(e) => updateInput('duration', e.target.value)}
                        placeholder="e.g., 45 minutes"
                      />
                      {errors.duration && <p className="text-xs text-destructive mt-1">{errors.duration}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="topic">Topic</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer"/>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>The main topic for the worksheet, e.g., "Fractions".</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="topic"
                      value={inputs.topic}
                      onChange={(e) => updateInput('topic', e.target.value)}
                      placeholder="e.g., Fractions"
                    />
                    {errors.topic && <p className="text-xs text-destructive mt-1">{errors.topic}</p>}
                  </div>
                </div>

                  <Separator/>

                  {/* Learning Objectives */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Learning Objectives</h3>
                    <div className="space-y-3">
                      {inputs.objectives.map((objective, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className="flex-1 space-y-2">
                              <Label htmlFor={`objective-${index}`}>Objective {index + 1}</Label>
                              <Input
                                  id={`objective-${index}`}
                                  value={objective}
                                  onChange={(e) => updateObjective(index, e.target.value)}
                                  placeholder={`e.g., Understand equivalent fractions`}
                              />
                            </div>
                            {inputs.objectives.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeObjective(index)}
                                    className="mt-auto"
                                    aria-label="Remove objective"
                                >
                                  <Trash2 className="h-4 w-4"/>
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
                          >
                            Add Objective
                          </Button>
                      )}
                    </div>
                  </div>

                  <Separator/>

                  {/* Differentiation Levels */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-medium text-muted-foreground">Differentiation Levels</h3>
                    <div className="space-y-4">
                      {/* Support Level */}
                      <div
                          className="space-y-3 p-4 border rounded-lg bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900/20">
                        <Label htmlFor="support" className="font-semibold text-green-700 dark:text-green-400">Support
                          Level</Label>
                        <Textarea
                            id="support"
                            value={inputs.support_level_desc}
                            onChange={(e) => updateInput('support_level_desc', e.target.value)}
                            placeholder="Describe supports for students who need extra help..."
                            rows={2}
                        />
                        <div className="flex items-center gap-3">
                          <Label htmlFor="n_support" className="text-sm">Questions:</Label>
                          <Input
                              id="n_support"
                              type="number"
                              min="1"
                              max="10"
                              value={inputs.n_support}
                              onChange={(e) => updateInput('n_support', parseInt(e.target.value) || 1)}
                              className="w-20"
                          />
                          {errors.n_support && <p className="text-xs text-destructive mt-1">{errors.n_support}</p>}
                        </div>
                      </div>
                      {/* Core Level */}
                      <div
                          className="space-y-3 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/20">
                        <Label htmlFor="core" className="font-semibold text-blue-700 dark:text-blue-400">Core
                          Level</Label>
                        <Textarea
                            id="core"
                            value={inputs.core_level_desc}
                            onChange={(e) => updateInput('core_level_desc', e.target.value)}
                            placeholder="Describe tasks for the majority of students..."
                            rows={2}
                        />
                        <div className="flex items-center gap-3">
                          <Label htmlFor="n_core" className="text-sm">Questions:</Label>
                          <Input
                              id="n_core"
                              type="number"
                              min="1"
                              max="15"
                              value={inputs.n_core}
                              onChange={(e) => updateInput('n_core', parseInt(e.target.value) || 1)}
                              className="w-20"
                          />
                          {errors.n_core && <p className="text-xs text-destructive mt-1">{errors.n_core}</p>}
                        </div>
                      </div>
                      {/* Extension Level */}
                      <div
                          className="space-y-3 p-4 border rounded-lg bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-900/20">
                        <Label htmlFor="extension" className="font-semibold text-purple-700 dark:text-purple-400">Extension
                          Level</Label>
                        <Textarea
                            id="extension"
                            value={inputs.extension_level_desc}
                            onChange={(e) => updateInput('extension_level_desc', e.target.value)}
                            placeholder="Describe challenges for advanced students..."
                            rows={2}
                        />
                        <div className="flex items-center gap-3">
                          <Label htmlFor="n_extension" className="text-sm">Questions:</Label>
                          <Input
                              id="n_extension"
                              type="number"
                              min="1"
                              max="10"
                              value={inputs.n_extension}
                              onChange={(e) => updateInput('n_extension', parseInt(e.target.value) || 1)}
                              className="w-20"
                          />
                          {errors.n_extension && <p className="text-xs text-destructive mt-1">{errors.n_extension}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator/>

                  {/* Additional Settings */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Additional Settings</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="constraints">Constraints & Accommodations</Label>
                        <Textarea
                            id="constraints"
                            value={inputs.constraints}
                            onChange={(e) => updateInput('constraints', e.target.value)}
                            placeholder="e.g., reading age 8-9; EAL students; no calculators"
                            rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="materials">Materials</Label>
                        <Input
                            id="materials"
                            value={inputs.materials}
                            onChange={(e) => updateInput('materials', e.target.value)}
                            placeholder="e.g., ruler, grid paper, calculator"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="page_size">Page Size</Label>
                          <Select value={inputs.page_size}
                                  onValueChange={(value: 'A4' | 'Letter') => updateInput('page_size', value)}>
                            <SelectTrigger id="page_size">
                              <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A4">A4</SelectItem>
                              <SelectItem value="Letter">Letter</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="max_pages">Max Pages</Label>
                          <Input
                              id="max_pages"
                              type="number"
                              min="1"
                              max="10"
                              value={inputs.max_pages}
                              onChange={(e) => updateInput('max_pages', parseInt(e.target.value) || 1)}
                          />
                          {errors.max_pages && <p className="text-xs text-destructive mt-1">{errors.max_pages}</p>}
                        </div>
                      </div>
                      <div className="space-y-4 pt-2">
                        <div className="flex items-start gap-3">
                          <Checkbox
                              id="teacher_notes"
                              checked={inputs.include_teacher_notes}
                              onCheckedChange={(checked) => updateInput('include_teacher_notes', !!checked)}
                          />
                          <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="teacher_notes">Include Teacher Notes</Label>
                            <p className="text-sm text-muted-foreground">
                              Generate a separate section with answers, tips, and guidance.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Checkbox
                              id="rubric"
                              checked={inputs.include_rubric}
                              onCheckedChange={(checked) => updateInput('include_rubric', !!checked)}
                          />
                          <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="rubric">Include Rubric</Label>
                            <p className="text-sm text-muted-foreground">
                              Generate a simple marking rubric for assessment.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                      onClick={generateWorksheet}
                      disabled={isGenerating}
                      className="w-full"
                      size="lg"
                  >
                    {isGenerating ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                    <Sparkles className="mr-2 h-5 w-5" />
                    )}
                    Generate Worksheet
                  </Button>
                </CardContent>
              </Card>

              {/* Preview Section */}
              <Card className="sticky top-8">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Preview</CardTitle>
                    {markdown && (
                        <div className="flex items-center gap-2">
                          {estimatedPages > inputs.max_pages && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3"/>
                                {estimatedPages} pages
                              </Badge>
                          )}
                          {estimatedPages <= inputs.max_pages && estimatedPages > 0 && (
                              <Badge variant="secondary">
                                ~{estimatedPages} pages
                              </Badge>
                          )}
                        </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!markdown ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <div className="p-4 bg-secondary rounded-full w-fit mx-auto mb-4">
                          <FileText className="h-8 w-8"/>
                        </div>
                        <p className="font-medium mb-2">No worksheet generated yet</p>
                        <p className="text-sm">Fill out the form and click "Generate" to see a preview.</p>
                      </div>
                  ) : (
                      <>
                        {estimatedPages > inputs.max_pages && (
                            <Alert variant="destructive" className="mb-4">
                              <AlertTriangle className="h-4 w-4"/>
                              <AlertTitle>Page Limit Exceeded</AlertTitle>
                              <AlertDescription>
                                The generated content might exceed your {inputs.max_pages}-page limit.
                              </AlertDescription>
                            </Alert>
                        )}

                        <div className="flex gap-2 mb-4">
                          <Button onClick={copyMarkdown} variant="outline" size="sm">
                            <Copy className="h-4 w-4 mr-2"/>
                            Copy
                          </Button>
                          <Button onClick={downloadMarkdown} variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2"/>
                            Download
                          </Button>
                          <Button
                              onClick={exportPDF}
                              disabled={isExporting}
                              size="sm"
                          >
                            {isExporting ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                            ) : (
                                <FileText className="h-4 w-4 mr-2"/>
                            )}
                            Export PDF
                          </Button>
                        </div>

                        <div
                            className="prose prose-sm dark:prose-invert max-w-none bg-background p-4 rounded-lg border max-h-[calc(100vh-20rem)] overflow-y-auto">
                          <ReactMarkdown>{markdown}</ReactMarkdown>
                        </div>
                      </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </TooltipProvider>
  )
}
