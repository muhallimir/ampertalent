'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Plus } from 'lucide-react'

// Predefined skills for suggestions
const SUGGESTED_SKILLS = [
  // Administrative
  'Administrative Support',
  'Data Entry',
  'Email Management',
  'Calendar Management',
  'Customer Service',
  'Virtual Assistant',
  'Project Management',
  'Document Preparation',
  'Research',
  'Scheduling',

  // Technical
  'Microsoft Office',
  'Google Workspace',
  'Excel',
  'PowerPoint',
  'Word Processing',
  'Spreadsheets',
  'CRM Software',
  'Social Media Management',
  'marketing',
  'Basic HTML/CSS',

  // Creative
  'Graphic Design',
  'Content Writing',
  'Copywriting',
  'Blog Writing',
  'Social Media Content',
  'Photo Editing',
  'Video Editing',
  'Canva',
  'Adobe Creative Suite',
  'Marketing Materials',

  // Communication
  'Written Communication',
  'Phone Support',
  'Live Chat Support',
  'Email Support',
  'Multilingual',
  'Spanish',
  'French',
  'Translation',
  'Proofreading',
  'Editing',

  // Business
  'Bookkeeping',
  'QuickBooks',
  'Invoicing',
  'Payroll',
  'Accounting',
  'Sales Support',
  'Lead Generation',
  'Market Research',
  'Business Development',
  'Event Planning',

  // Specialized
  'Real Estate Support',
  'Healthcare Administration',
  'Legal Support',
  'E-commerce',
  'Online Store Management',
  'Inventory Management',
  'Order Processing',
  'Travel Planning',
  'HR Support',
  'Recruitment'
]

interface SkillsSelectorProps {
  selectedSkills: string[]
  onSkillsChange: (skills: string[]) => void
  maxSkills?: number
}

export function SkillsSelector({
  selectedSkills,
  onSkillsChange,
  maxSkills = 20
}: SkillsSelectorProps) {
  const [customSkill, setCustomSkill] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const addSkill = (skill: string) => {
    const trimmedSkill = skill.trim()
    if (
      trimmedSkill &&
      !selectedSkills.includes(trimmedSkill) &&
      selectedSkills.length < maxSkills
    ) {
      onSkillsChange([...selectedSkills, trimmedSkill])
    }
  }

  const removeSkill = (skillToRemove: string) => {
    onSkillsChange(selectedSkills.filter(skill => skill !== skillToRemove))
  }

  const handleCustomSkillSubmit = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault()
    }
    addSkill(customSkill)
    setCustomSkill('')
  }

  const filteredSuggestions = SUGGESTED_SKILLS.filter(
    skill =>
      !selectedSkills.includes(skill) &&
      skill.toLowerCase().includes(customSkill.toLowerCase())
  ).slice(0, 10)

  return (
    <div className="space-y-4">
      {/* Selected Skills */}
      {selectedSkills.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Selected Skills ({selectedSkills.length}/{maxSkills})</p>
          <div className="flex flex-wrap gap-2">
            {selectedSkills.map((skill) => (
              <div
                key={skill}
                className="flex items-center space-x-1 bg-brand-teal/10 text-brand-teal px-3 py-1 rounded-full text-sm border border-brand-teal/20"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="hover:bg-brand-teal/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Custom Skill */}
      <div>
        <div className="flex space-x-2">
          <Input
            placeholder="Add a skill (e.g., Microsoft Excel, Customer Service)"
            value={customSkill}
            onChange={(e) => {
              setCustomSkill(e.target.value)
              setShowSuggestions(e.target.value.length > 0)
            }}
            onFocus={() => setShowSuggestions(customSkill.length > 0)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleCustomSkillSubmit(e)
              }
            }}
            disabled={selectedSkills.length >= maxSkills}
          />
          <Button
            type="button"
            onClick={handleCustomSkillSubmit}
            disabled={!customSkill.trim() || selectedSkills.length >= maxSkills}
            size="sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Skill Suggestions */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="mt-2 border rounded-md bg-white shadow-sm max-h-48 overflow-y-auto">
            {filteredSuggestions.map((skill) => (
              <button
                key={skill}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b last:border-b-0"
                onClick={() => {
                  addSkill(skill)
                  setCustomSkill('')
                  setShowSuggestions(false)
                }}
              >
                {skill}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Popular Skills */}
      {selectedSkills.length < maxSkills && (
        <div>
          <p className="text-sm font-medium mb-2">Popular Skills</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_SKILLS
              .filter(skill => !selectedSkills.includes(skill))
              .slice(0, 12)
              .map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => addSkill(skill)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
                >
                  {skill}
                </button>
              ))}
          </div>
        </div>
      )}

      {selectedSkills.length >= maxSkills && (
        <p className="text-sm text-amber-600">
          You&apos;ve reached the maximum of {maxSkills} skills. Remove some to add others.
        </p>
      )}
    </div>
  )
}