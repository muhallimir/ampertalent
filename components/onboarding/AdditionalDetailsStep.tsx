import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SkillsInput } from '@/components/ui/skills-input'

interface AdditionalDetailsStepProps {
  role: 'seeker' | 'employer' | null
  experience?: string
  skills?: string[]
  onUpdate: (data: { experience?: string; skills?: string[] }) => void
}

export function AdditionalDetailsStep({
  role,
  experience,
  skills,
  onUpdate,
}: AdditionalDetailsStepProps) {
  const CLEAR_SELECT_VALUE = '__clear__'
  // Only for seekers
  if (role !== 'seeker') {
    return null
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Your Experience</h2>
        <p className="text-gray-600">Tell us about your professional background</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Label htmlFor="experience" className="text-gray-700 font-medium">
            Years of Experience
          </Label>
          <Select
            value={experience || undefined}
            onValueChange={(value) =>
              onUpdate({ experience: value === CLEAR_SELECT_VALUE ? '' : value })
            }
          >
            <SelectTrigger className="w-full mt-2 border-gray-300 focus:ring-brand-teal focus:border-brand-teal">
              <SelectValue placeholder="Select experience level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0-1">0-1 years (Entry level)</SelectItem>
              <SelectItem value="2-5">2-5 years (Mid level)</SelectItem>
              <SelectItem value="5-10">5-10 years (Senior level)</SelectItem>
              <SelectItem value="10+">10+ years (Expert level)</SelectItem>
              <SelectItem value={CLEAR_SELECT_VALUE}>Clear selection</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="skills" className="text-gray-700 font-medium">
            Key Skills
          </Label>
          <div className="mt-2">
            <SkillsInput
              skills={skills || []}
              onChange={(newSkills) => onUpdate({ skills: newSkills })}
              placeholder="e.g., Administrative Support, Written Communication, Customer Service"
              maxSkills={15}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
