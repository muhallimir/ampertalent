import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface GoalsStepProps {
  role: 'seeker' | 'employer' | null
  professionalSummary: string
  onUpdate: (professionalSummary: string) => void
}

export function GoalsStep({ role, professionalSummary, onUpdate }: GoalsStepProps) {
  // Only for seekers
  if (role !== 'seeker') {
    return null
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Professional Summary</h2>
        <p className="text-gray-600">
          Write a paragraph that summarizes your professional skills and goals
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <Label htmlFor="professionalSummary" className="text-gray-700 font-medium">
          Professional Summary
        </Label>
        <p className="text-sm text-gray-600 mt-1 mb-3">
          In your Professional Summary, you may include your career title and years of experience, key remote-related skills like communication and time management, highlight any relevant work experience, and also mention personal traits or soft skills that make you a great candidate.
        </p>
        <Textarea
          id="professionalSummary"
          value={professionalSummary}
          onChange={(e) => onUpdate(e.target.value)}
          placeholder="Example: I'm a marketing professional with 8 years of experience in digital marketing and project management. I'm skilled in communication, time management, and strategic planning. I've worked with cross-functional teams across the tech and startup industries..."
          rows={5}
          className="mt-2 border-gray-300 focus:border-brand-teal focus:ring-brand-teal resize-none"
        />
      </div>
    </div>
  )
}
