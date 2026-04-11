import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CompleteStepProps {
  role: 'seeker' | 'employer'
  firstName: string
  isLoading?: boolean
  onComplete: () => void
  onSaveAndContinueLater?: () => void
  selectedPackage?: string
  isServiceOnly?: boolean // For service-only flow (no subscription required)
  serviceId?: string | null // Service ID for banner display (e.g., "resume_refresh")
}

export function CompleteStep({
  role,
  firstName,
  isLoading = false,
  onComplete,
  isServiceOnly = false,
  serviceId,
}: CompleteStepProps) {
  const isEmployer = role === 'employer'

  // Get friendly service name for display
  const getServiceName = (id: string | null | undefined): string => {
    if (!id) return 'Premium Service'
    const serviceNames: Record<string, string> = {
      'resume_refresh': 'Resume Refresh',
      'create_new_resume': 'Resume Creation',
      'cover_letter_service': 'Cover Letter',
      'interview_success_training': 'Interview Coaching',
      'the_works': 'The Works Package',
      'career_jumpstart': 'Career Jumpstart',
      'personal_career_strategist': 'Personal Career Strategist',
    }
    return serviceNames[id] || 'Premium Service'
  }

  return (
    <div className="text-center space-y-8">
      <div className="w-24 h-24 bg-gradient-to-br from-brand-teal to-brand-coral rounded-full flex items-center justify-center mx-auto shadow-lg">
        <Sparkles className="h-12 w-12 text-white" />
      </div>

      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Welcome to AmperTalent{firstName ? `, ${firstName}` : ''}!
        </h2>
        <p className="text-lg text-gray-600 mb-6">
          Your account is ready. Let&apos;s get started!
        </p>
        <p className="text-base text-gray-600">
          {isEmployer
            ? "Click below to post your first job and find the perfect candidate!"
            : isServiceOnly
              ? `Click below to continue with your ${getServiceName(serviceId)} purchase!`
              : "Click below to browse job opportunities and start your journey!"}
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <Button
          onClick={onComplete}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-brand-teal to-brand-coral hover:from-brand-teal/90 hover:to-brand-coral/90 text-white disabled:opacity-50 disabled:cursor-not-allowed text-base py-6"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up your account...
            </>
          ) : (
            isEmployer
              ? "Let's Post Your First Job"
              : isServiceOnly
                ? 'Continue to Service Purchase'
                : 'Browse Jobs'
          )}
        </Button>
      </div>
    </div>
  )
}
