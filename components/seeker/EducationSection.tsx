'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, X, GraduationCap } from 'lucide-react'

export interface EducationEntry {
  id: string
  institution: string
  certifications: string
  startDate: string
  endDate?: string
  notes?: string
}

interface EducationSectionProps {
  education: EducationEntry[]
  onChange: (education: EducationEntry[]) => void
  errors?: Record<string, string>
}

export function EducationSection({ education, onChange, errors }: EducationSectionProps) {
  const addEducation = () => {
    const newEducation: EducationEntry = {
      id: Date.now().toString(),
      institution: '',
      certifications: '',
      startDate: '',
      endDate: '',
      notes: ''
    }
    onChange([...education, newEducation])
  }

  const removeEducation = (id: string) => {
    onChange(education.filter(edu => edu.id !== id))
  }

  const updateEducation = (id: string, field: keyof EducationEntry, value: string) => {
    onChange(education.map(edu => 
      edu.id === id ? { ...edu, [field]: value } : edu
    ))
  }

  const validateDates = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return true
    return new Date(endDate) >= new Date(startDate)
  }

  return (
    <div className="space-y-4">
      {education.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No education entries yet</p>
          <Button
            type="button"
            onClick={addEducation}
            variant="outline"
            className="border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Education
          </Button>
        </div>
      ) : (
        <>
          {education.map((edu, index) => (
            <Card key={edu.id} className="relative">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="flex items-center">
                    <GraduationCap className="h-5 w-5 mr-2" />
                    Education {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEducation(edu.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor={`institution-${edu.id}`}>Institution *</Label>
                  <Input
                    id={`institution-${edu.id}`}
                    placeholder="e.g., University of California, Berkeley"
                    value={edu.institution}
                    onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                    className="mt-1"
                  />
                  {errors?.[`education.${index}.institution`] && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors[`education.${index}.institution`]}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor={`certifications-${edu.id}`}>Certification(s) *</Label>
                  <Input
                    id={`certifications-${edu.id}`}
                    placeholder="e.g., Bachelor of Science in Computer Science"
                    value={edu.certifications}
                    onChange={(e) => updateEducation(edu.id, 'certifications', e.target.value)}
                    className="mt-1"
                  />
                  {errors?.[`education.${index}.certifications`] && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors[`education.${index}.certifications`]}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`startDate-${edu.id}`}>Start Date *</Label>
                    <Input
                      id={`startDate-${edu.id}`}
                      type="date"
                      value={edu.startDate}
                      onChange={(e) => updateEducation(edu.id, 'startDate', e.target.value)}
                      className="mt-1"
                    />
                    {errors?.[`education.${index}.startDate`] && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors[`education.${index}.startDate`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`endDate-${edu.id}`}>End Date</Label>
                    <Input
                      id={`endDate-${edu.id}`}
                      type="date"
                      value={edu.endDate || ''}
                      onChange={(e) => updateEducation(edu.id, 'endDate', e.target.value)}
                      className="mt-1"
                    />
                    {edu.startDate && edu.endDate && !validateDates(edu.startDate, edu.endDate) && (
                      <p className="text-sm text-red-600 mt-1">
                        End date must be after start date
                      </p>
                    )}
                    {errors?.[`education.${index}.endDate`] && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors[`education.${index}.endDate`]}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor={`notes-${edu.id}`}>Notes</Label>
                  <Textarea
                    id={`notes-${edu.id}`}
                    placeholder="Additional details about your education (optional)"
                    value={edu.notes || ''}
                    onChange={(e) => updateEducation(edu.id, 'notes', e.target.value)}
                    rows={3}
                    className="mt-1 resize-none"
                  />
                  {errors?.[`education.${index}.notes`] && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors[`education.${index}.notes`]}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    {(edu.notes || '').length}/500 characters
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            type="button"
            onClick={addEducation}
            variant="outline"
            className="w-full border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white"
            disabled={education.length >= 10}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Education
          </Button>

          {education.length >= 10 && (
            <p className="text-sm text-gray-500 text-center">
              Maximum of 10 education entries allowed
            </p>
          )}
        </>
      )}
    </div>
  )
}