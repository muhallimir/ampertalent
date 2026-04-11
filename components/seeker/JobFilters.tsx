'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SkillsSelector } from '@/components/common/SkillsSelector'
import { JOB_CATEGORY_LABELS, JOB_TYPES, getCategoryLabel } from '@/lib/job-constants'
import { X, Filter } from 'lucide-react'

interface JobFilters {
  keywords: string
  category: string
  type: string
  payRange: [number, number]
  skills: string[]
  isFlexibleHours?: boolean
}

interface JobFiltersProps {
  filters: JobFilters
  onFiltersChange: (filters: Partial<JobFilters>) => void
  onClear: () => void
}

const JOB_CATEGORIES = JOB_CATEGORY_LABELS

export function JobFilters({ filters, onFiltersChange, onClear }: JobFiltersProps) {
  const [localPayRange, setLocalPayRange] = useState(filters.payRange)

  const handleCategoryChange = (category: string) => {
    onFiltersChange({ category: category === filters.category ? '' : category })
  }

  const handleTypeChange = (type: string) => {
    onFiltersChange({ type: type === filters.type ? '' : type })
  }

  const handleFlexibleHoursChange = (isFlexible: boolean) => {
    onFiltersChange({ 
      isFlexibleHours: filters.isFlexibleHours === isFlexible ? undefined : isFlexible 
    })
  }

  const handlePayRangeChange = (index: number, value: string) => {
    const newRange = [...localPayRange] as [number, number]
    newRange[index] = parseInt(value) || 0
    setLocalPayRange(newRange)
    onFiltersChange({ payRange: newRange })
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.category) count++
    if (filters.type) count++
    if (filters.skills.length > 0) count++
    if (filters.isFlexibleHours !== undefined) count++
    if (filters.payRange[0] > 0 || filters.payRange[1] < 100) count++
    return count
  }

  return (
    <div className="space-y-6">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4" />
          <span className="font-medium">Filters</span>
          {getActiveFiltersCount() > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {getActiveFiltersCount()}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear all
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Job Category */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Category</Label>
          <div className="space-y-2">
            {JOB_CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md border transition-colors ${
                  filters.category === category
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Job Type */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Job Type</Label>
          <div className="space-y-2">
            {JOB_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => handleTypeChange(type.value)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md border transition-colors ${
                  filters.type === type.value
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Flexible Hours */}
          <div className="mt-4">
            <Label className="text-sm font-medium mb-2 block">Schedule</Label>
            <div className="space-y-2">
              <button
                onClick={() => handleFlexibleHoursChange(true)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md border transition-colors ${
                  filters.isFlexibleHours === true
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                Flexible Hours
              </button>
              <button
                onClick={() => handleFlexibleHoursChange(false)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md border transition-colors ${
                  filters.isFlexibleHours === false
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                Fixed Schedule
              </button>
            </div>
          </div>
        </div>

        {/* Pay Range */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Hourly Pay Range</Label>
          <div className="space-y-3">
            <div>
              <Label htmlFor="minPay" className="text-xs text-gray-600">Minimum ($/hour)</Label>
              <Input
                id="minPay"
                type="number"
                placeholder="0"
                value={localPayRange[0] || ''}
                onChange={(e) => handlePayRangeChange(0, e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="maxPay" className="text-xs text-gray-600">Maximum ($/hour)</Label>
              <Input
                id="maxPay"
                type="number"
                placeholder="100"
                value={localPayRange[1] || ''}
                onChange={(e) => handlePayRangeChange(1, e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Skills */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Skills</Label>
          <div className="max-h-64 overflow-y-auto">
            <SkillsSelector
              selectedSkills={filters.skills}
              onSkillsChange={(skills) => onFiltersChange({ skills })}
              maxSkills={10}
            />
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {getActiveFiltersCount() > 0 && (
        <div className="border-t pt-4">
          <div className="flex flex-wrap gap-2">
            {filters.category && (
              <div className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                <span>Category: {getCategoryLabel(filters.category)}</span>
                <button
                  onClick={() => onFiltersChange({ category: '' })}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {filters.type && (
              <div className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                <span>Type: {JOB_TYPES.find(t => t.value === filters.type)?.label}</span>
                <button
                  onClick={() => onFiltersChange({ type: '' })}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {filters.isFlexibleHours !== undefined && (
              <div className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                <span>{filters.isFlexibleHours ? 'Flexible Hours' : 'Fixed Schedule'}</span>
                <button
                  onClick={() => onFiltersChange({ isFlexibleHours: undefined })}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {filters.skills.map((skill) => (
              <div
                key={skill}
                className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
              >
                <span>{skill}</span>
                <button
                  onClick={() => 
                    onFiltersChange({ 
                      skills: filters.skills.filter(s => s !== skill) 
                    })
                  }
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {(filters.payRange[0] > 0 || filters.payRange[1] < 100) && (
              <div className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                <span>
                  Pay: ${filters.payRange[0]}-${filters.payRange[1]}/hr
                </span>
                <button
                  onClick={() => onFiltersChange({ payRange: [0, 100] })}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}