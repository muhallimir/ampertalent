import { Users, Building2, CheckCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

interface RoleStepProps {
  selectedRole: 'seeker' | 'employer' | null
  onRoleSelect: (role: 'seeker' | 'employer') => void
}

export function RoleStep({ selectedRole, onRoleSelect }: RoleStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Hire My Mom!</h2>
        <p className="text-gray-600">Let's get you set up. First, tell us what brings you here:</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Seeker Card */}
        <Card
          className={`border-2 cursor-pointer transition-all shadow-sm hover:shadow-md ${
            selectedRole === 'seeker'
              ? 'border-brand-teal bg-brand-teal-light/30 shadow-md'
              : 'border-gray-200 hover:border-brand-teal/50 bg-white'
          }`}
          onClick={() => onRoleSelect('seeker')}
        >
          <CardHeader className="text-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-all ${
                selectedRole === 'seeker'
                  ? 'bg-brand-teal text-white'
                  : 'bg-brand-teal-light text-brand-teal'
              }`}
            >
              <Users className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl text-gray-900">I'm Looking for Work</CardTitle>
            <CardDescription className="text-gray-600">
              Find remote job opportunities that fit your lifestyle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4 text-brand-teal flex-shrink-0" />
                <span className="text-gray-700">Browse vetted job listings</span>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4 text-brand-teal flex-shrink-0" />
                <span className="text-gray-700">Apply to family-friendly employers</span>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4 text-brand-teal flex-shrink-0" />
                <span className="text-gray-700">Get resume feedback</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Employer Card */}
        <Card
          className={`border-2 cursor-pointer transition-all shadow-sm hover:shadow-md ${
            selectedRole === 'employer'
              ? 'border-brand-coral bg-brand-coral-light/30 shadow-md'
              : 'border-gray-200 hover:border-brand-coral/50 bg-white'
          }`}
          onClick={() => onRoleSelect('employer')}
        >
          <CardHeader className="text-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-all ${
                selectedRole === 'employer'
                  ? 'bg-brand-coral text-white'
                  : 'bg-brand-coral-light text-brand-coral'
              }`}
            >
              <Building2 className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl text-gray-900">I'm Hiring</CardTitle>
            <CardDescription className="text-gray-600">
              Find qualified remote professionals for your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4 text-brand-coral flex-shrink-0" />
                <span className="text-gray-700">Post job openings</span>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4 text-brand-coral flex-shrink-0" />
                <span className="text-gray-700">Access pre-screened candidates</span>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4 text-brand-coral flex-shrink-0" />
                <span className="text-gray-700">Get concierge support</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
