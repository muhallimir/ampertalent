import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface BasicInfoStepProps {
  firstName: string
  lastName: string
  location: string
  onUpdate: (data: { firstName?: string; lastName?: string; location?: string }) => void
}

export function BasicInfoStep({ firstName, lastName, location, onUpdate }: BasicInfoStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Tell us about yourself</h2>
        <p className="text-gray-600">We'll use this information to personalize your experience</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="firstName" className="text-gray-700 font-medium">First Name *</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => onUpdate({ firstName: e.target.value })}
              placeholder="Enter your first name"
              className="mt-2 border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
            />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-gray-700 font-medium">Last Name *</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => onUpdate({ lastName: e.target.value })}
              placeholder="Enter your last name"
              className="mt-2 border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="location" className="text-gray-700 font-medium">Location *</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => onUpdate({ location: e.target.value })}
            placeholder="e.g., Austin, TX or Remote"
            className="mt-2 border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
          />
        </div>
      </div>
    </div>
  )
}
