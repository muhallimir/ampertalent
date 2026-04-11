'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RichTextEditor } from '@/components/common/RichTextEditor'

interface CoverLetterTemplate {
  id: string
  title: string
  content: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

interface CoverLetterTemplateFormProps {
  initialData?: CoverLetterTemplate | null
  onSubmit: (data: { title: string; content: string; isDefault?: boolean }) => void
  onCancel: () => void
}

export function CoverLetterTemplateForm({
  initialData,
  onSubmit,
  onCancel
}: CoverLetterTemplateFormProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [useRichEditor, setUseRichEditor] = useState(true)

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title)
      setContent(initialData.content)
      setIsDefault(initialData.isDefault)
    } else {
      setTitle('')
      setContent('')
      setIsDefault(false)
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim() || !content.trim()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        isDefault
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleContentChange = (value: string) => {
    setContent(value)
  }

  const getDefaultTemplate = () => {
    return `Dear Hiring Manager,

I am writing to express my strong interest in the [Position Title] position at [Company Name]. With my background in [Your Field/Industry] and [Number] years of experience in [Relevant Skills/Areas], I am confident that I would be a valuable addition to your team.

In my previous role as [Previous Position] at [Previous Company], I successfully [Key Achievement 1]. Additionally, I [Key Achievement 2], which resulted in [Specific Result/Impact]. These experiences have equipped me with the skills necessary to excel in this position.

What particularly attracts me to [Company Name] is [Specific Reason - Company Values/Mission/Recent News]. I am excited about the opportunity to contribute to [Specific Project/Goal/Team] and help drive [Company Objective].

I would welcome the opportunity to discuss how my experience and enthusiasm can contribute to your team's success. Thank you for considering my application. I look forward to hearing from you.

Sincerely,
[Your Name]`
  }

  const insertTemplate = () => {
    setContent(getDefaultTemplate())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Template Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., General Application, Tech Position, Marketing Role"
          maxLength={200}
          required
        />
        <p className="text-sm text-gray-500">
          {title.length}/200 characters
        </p>
      </div>

      {/* Editor Toggle */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="useRichEditor"
          checked={useRichEditor}
          onCheckedChange={(checked) => setUseRichEditor(checked as boolean)}
        />
        <Label htmlFor="useRichEditor" className="text-sm">
          Use rich text editor (recommended)
        </Label>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="content">Cover Letter Content *</Label>
          {!initialData && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={insertTemplate}
            >
              Insert Sample Template
            </Button>
          )}
        </div>
        
        {useRichEditor ? (
          <div className="border rounded-md">
            <RichTextEditor
              value={content}
              onChange={handleContentChange}
              placeholder="Write your cover letter template here. Use placeholders like [Company Name], [Position Title], etc. that you can customize for each application."
              height={300}
              maxLength={10000}
            />
          </div>
        ) : (
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your cover letter template here. Use placeholders like [Company Name], [Position Title], etc. that you can customize for each application."
            rows={15}
            maxLength={10000}
            required
            className="resize-none"
          />
        )}
        
        <p className="text-sm text-gray-500">
          {content.length}/10,000 characters
        </p>
      </div>

      {/* Default Template Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isDefault"
          checked={isDefault}
          onCheckedChange={(checked) => setIsDefault(checked as boolean)}
        />
        <Label htmlFor="isDefault" className="text-sm">
          Set as default template
        </Label>
      </div>

      {/* Template Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Template Tips:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use placeholders like [Company Name], [Position Title], [Your Name] for easy customization</li>
          <li>• Keep it professional but personalized</li>
          <li>• Highlight your most relevant skills and experiences</li>
          <li>• Research the company to make your letter more specific</li>
          <li>• Keep it concise - aim for 3-4 paragraphs</li>
        </ul>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !title.trim() || !content.trim()}
        >
          {isSubmitting ? 'Saving...' : (initialData ? 'Update Template' : 'Create Template')}
        </Button>
      </div>
    </form>
  )
}