'use client'

import { useState, KeyboardEvent } from 'react'
import { X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface SkillsInputProps {
  skills: string[]
  onChange: (skills: string[]) => void
  placeholder?: string
  maxSkills?: number
  className?: string
}

export function SkillsInput({ 
  skills, 
  onChange, 
  placeholder = "Add a skill...", 
  maxSkills = 20,
  className = ""
}: SkillsInputProps) {
  const [inputValue, setInputValue] = useState('')

  const addSkill = (skill: string) => {
    const trimmedSkill = skill.trim()
    if (trimmedSkill && !skills.includes(trimmedSkill) && skills.length < maxSkills) {
      onChange([...skills, trimmedSkill])
      setInputValue('')
    }
  }

  const removeSkill = (skillToRemove: string) => {
    onChange(skills.filter(skill => skill !== skillToRemove))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSkill(inputValue)
    } else if (e.key === 'Backspace' && inputValue === '' && skills.length > 0) {
      // Remove last skill if input is empty and backspace is pressed
      removeSkill(skills[skills.length - 1])
    }
  }

  const handleAddClick = () => {
    addSkill(inputValue)
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Skills Tags Display */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="bg-brand-teal-light text-brand-teal border-brand-teal/20 hover:bg-brand-teal-light/80 transition-colors px-3 py-1 text-sm"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="ml-2 hover:text-brand-teal-dark transition-colors"
                aria-label={`Remove ${skill}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={skills.length >= maxSkills ? `Maximum ${maxSkills} skills` : placeholder}
          disabled={skills.length >= maxSkills}
          className="flex-1 border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
        />
        <Button
          type="button"
          onClick={handleAddClick}
          disabled={!inputValue.trim() || skills.length >= maxSkills}
          size="sm"
          className="border-brand-teal text-white hover:bg-brand-teal hover:text-white transition-colors"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Helper Text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>Press Enter or click + to add a skill. Click X to remove.</p>
        {skills.length > 0 && (
          <p>{skills.length} of {maxSkills} skills added</p>
        )}
      </div>
    </div>
  )
}