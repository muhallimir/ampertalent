'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import Image from 'next/image'
import {
  Users,
  ArrowRight,
  ArrowLeft,
  User,
  Briefcase,
  Target,
  Sparkles,
  CreditCard,
  Mail,
  X,
  RefreshCw,
  LogOut
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getDashboardPath } from '@/lib/middleware-onboarding'
import {
  RoleStep,
  BasicInfoStep,
  PackageCompanyStep,
  AdditionalDetailsStep,
  GoalsStep,
  CompleteStep,
} from '@/components/onboarding'
import {
  getMarketingPreselect,
  clearMarketingPreselect,
  processMarketingSkuFromUrl,
  MarketingPreselect,
  isServicePreselect,
} from '@/lib/marketing-preselect'
import { handleUserLogout } from '@/lib/auth-utils'

interface OnboardingData {
  role: 'seeker' | 'employer' | null
  firstName: string
  lastName: string
  location: string
  selectedPackage?: string
  pendingSignupId?: string
  experience?: string
  skills?: string[]
  companyName?: string
  companySize?: string
  professionalSummary?: string
}

interface UserInvitation {
  id: string
  email: string
  role: 'seeker' | 'employer' | 'admin' | 'team_member'
  fullName: string | null
  invitedByName: string | undefined
  expiresAt: string
  acceptedAt: string | null
}

// Steps for Seeker onboarding flow
const SEEKER_STEPS = [
  { id: 'role', title: 'Choose Your Role', icon: Users },
  { id: 'profile', title: 'Basic Information', icon: User },
  { id: 'details', title: 'Additional Details', icon: Briefcase },
  { id: 'goals', title: 'Professional Summary', icon: Target },
  { id: 'package', title: 'Select Package', icon: CreditCard },
  { id: 'complete', title: 'Welcome!', icon: Sparkles },
]

// Steps for Service-Only Seeker onboarding flow (no package selection)
// Used when user arrives via a service SKU link - they don't need a subscription
const SERVICE_ONLY_SEEKER_STEPS = [
  { id: 'role', title: 'Choose Your Role', icon: Users },
  { id: 'profile', title: 'Basic Information', icon: User },
  { id: 'details', title: 'Additional Details', icon: Briefcase },
  { id: 'goals', title: 'Professional Summary', icon: Target },
  { id: 'complete', title: 'Welcome!', icon: Sparkles },
]

// Steps for Employer onboarding flow
const EMPLOYER_STEPS = [
  { id: 'role', title: 'Choose Your Role', icon: Users },
  { id: 'profile', title: 'Basic Information', icon: User },
  { id: 'details', title: 'About Your Company', icon: Briefcase },
  { id: 'complete', title: 'Welcome!', icon: Sparkles },
]

// Helper function to get step ID from index
function getStepId(stepIndex: number, role: 'seeker' | 'employer' | null): string {
  const steps = role === 'employer' ? EMPLOYER_STEPS : SEEKER_STEPS
  return steps[stepIndex]?.id || ''
}

// Helper function to determine target step for Seekers
function getSeekerTargetStep(data: {
  role?: string | null
  firstName?: string
  lastName?: string
  selectedPlan?: string
  location?: string
  professionalSummary?: string
}): number {
  if (!data.role) return 0 // 'role'
  if (!data.firstName || !data.lastName) return 1 // 'profile'
  if (!data.location) return 2 // 'details'
  if (!data.professionalSummary) return 3 // 'goals'
  if (!data.selectedPlan) return 4 // 'package'
  return 5 // 'complete'
}

// Helper function to determine target step for Employers
function getEmployerTargetStep(data: {
  role?: string | null
  firstName?: string
  lastName?: string
  location?: string
  companyName?: string
}): number {
  if (!data.role) return 0 // 'role'
  if (!data.firstName || !data.lastName || !data.location) return 1 // 'profile'
  if (!data.companyName) return 2 // 'details'
  return 3 // 'complete'
}

// Helper function to validate if seeker can proceed from current step
function canSeekerProceed(stepId: string, data: OnboardingData): boolean {
  switch (stepId) {
    case 'role':
      return data.role !== null
    case 'profile':
      return !!(data.firstName && data.lastName && data.location)
    case 'details':
      return true // Optional for seekers
    case 'goals':
      return (data.professionalSummary || '').length > 0
    case 'package':
      return true // Optional - can skip package selection
    case 'complete':
      return true
    default:
      return true
  }
}

// Helper function to validate if employer can proceed from current step
function canEmployerProceed(stepId: string, data: OnboardingData): boolean {
  switch (stepId) {
    case 'role':
      return data.role !== null
    case 'profile':
      return !!(data.firstName && data.lastName && data.location)
    case 'details':
      return !!data.companyName
    case 'complete':
      return true
    default:
      return true
  }
}

export default function OnboardingPage() {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [hasClearedCache, setHasClearedCache] = useState(false)
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false)
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    role: null,
    firstName: '',
    lastName: '',
    location: '',
    professionalSummary: '',
  })
  const [userInvitation, setUserInvitation] = useState<UserInvitation | null>(null)
  const [invitationChecked, setInvitationChecked] = useState(false)
  const [hasAutoRestored, setHasAutoRestored] = useState(false)
  // Marketing preselection from WordPress site (via cookie)
  const [marketingPreselect, setMarketingPreselect] = useState<MarketingPreselect | null>(null)
  const [marketingPreselectChecked, setMarketingPreselectChecked] = useState(false)
  // Service-only flow: User came via a service SKU link and doesn't need a subscription
  // They skip the package step and go directly to service purchase after onboarding
  const [isServiceOnlyFlow, setIsServiceOnlyFlow] = useState(false)
  // Post-onboarding service redirect (for service SKU flows)
  // postOnboardingServiceSku: The SKU to store in localStorage for redirect (e.g., "2228720")
  // postOnboardingServiceId: The service ID for displaying banner info (e.g., "resume_refresh")
  const [postOnboardingServiceSku, setPostOnboardingServiceSku] = useState<string | null>(null)
  const [postOnboardingServiceId, setPostOnboardingServiceId] = useState<string | null>(null)

  // Get the appropriate steps based on user role and flow type
  const STEPS = onboardingData.role === 'employer'
    ? EMPLOYER_STEPS
    : (isServiceOnlyFlow ? SERVICE_ONLY_SEEKER_STEPS : SEEKER_STEPS)

  // Get step ID from index - uses the correct STEPS array based on flow type
  const getCurrentStepId = (stepIndex: number): string => {
    return STEPS[stepIndex]?.id || ''
  }

  const handleLogout = async () => {
    await handleUserLogout(signOut, {
      redirectUrl: '/sign-in',
      onError: (error) => {
        console.error('❌ ONBOARDING: Error signing out:', error)
        router.push('/sign-in')
      }
    })
  }

  useEffect(() => {
    if (!user) {
      router.push('/sign-in')
      return
    }

    // Check for marketing preselection cookie (from WordPress site)
    // Also check URL params as fallback (in case user bookmarked sign-up URL with SKU)
    const checkMarketingPreselect = () => {
      // First try cookie
      let preselect = getMarketingPreselect()

      // Fallback: check if there's an SKU in the URL (edge case: direct onboarding URL with SKU)
      if (!preselect && typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        const sku = urlParams.get('sku')
        if (sku) {
          console.log('📦 ONBOARDING: Found SKU in URL, processing:', sku)
          const urlPreselect = processMarketingSkuFromUrl(urlParams)
          if (urlPreselect) {
            console.log('📦 ONBOARDING: Marketing preselection saved from URL:', urlPreselect)
            preselect = urlPreselect
          }
        }
      }

      if (preselect) {
        console.log('📦 ONBOARDING: Marketing preselection found:', preselect)
        setMarketingPreselect(preselect)
      }
      setMarketingPreselectChecked(true)
    }

    checkMarketingPreselect()

    // Check for user invitation
    const checkUserInvitation = async () => {
      try {
        const response = await fetch('/api/user/invitation')
        if (response.ok) {
          const { invitation } = await response.json()
          if (invitation) {
            console.log('📧 ONBOARDING: User invitation found:', invitation)
            setUserInvitation(invitation)
            // DON'T set the role here - let the draft restore handle it
            // We'll use the invitation role only if there's NO draft
          }
        }
      } catch (error) {
        console.error('Error checking user invitation:', error)
      } finally {
        setInvitationChecked(true)
      }
    }

    checkUserInvitation()

    // Check for resume parameters
    const urlParams = new URLSearchParams(window.location.search)
    const resumeId = urlParams.get('resume')
    const sessionToken = urlParams.get('token')

    console.log('🔍 ONBOARDING: URL parameters check:', {
      fullUrl: window.location.href,
      search: window.location.search,
      resumeId,
      sessionToken,
      allParams: Object.fromEntries(urlParams.entries())
    })

    // Check for existing pending signups when no resume parameters are found
    const checkForExistingPendingSignup = async () => {
      // Don't auto-restore if we've already done it once
      if (hasAutoRestored) {
        console.log('⏭️ ONBOARDING: Skipping auto-restore, already done once')
        return false
      }

      // PRIORITY: Service SKU preselection takes precedence over drafts
      // Read cookie directly since React state might not be updated yet
      const currentPreselect = getMarketingPreselect()
      if (currentPreselect && isServicePreselect(currentPreselect)) {
        console.log('📦 ONBOARDING: Service SKU detected - PRIORITY over drafts, using service-only flow', currentPreselect)
        // For service SKUs: skip package selection, go directly to service purchase after onboarding
        setOnboardingData(prev => ({
          ...prev,
          role: 'seeker',
          // No selectedPackage - user doesn't need a subscription for service purchase
        }))
        // Enable service-only flow (skips package step)
        setIsServiceOnlyFlow(true)
        // Store service info for post-onboarding redirect
        setPostOnboardingServiceSku(currentPreselect.sku)
        setPostOnboardingServiceId(currentPreselect.planId)
        // Also update the state for UI
        setMarketingPreselect(currentPreselect)
        setCurrentStep(1) // Skip to basic info since role is set
        setHasAutoRestored(true)
        setIsCheckingStatus(false)
        return true // We've set the data, skip draft restoration
      }

      try {
        console.log('🔍 ONBOARDING: Checking for existing pending signups for user:', user.id)

        const response = await fetch('/api/onboarding/pending-signup/latest')

        if (response.ok) {
          const { pendingSignup } = await response.json()

          if (pendingSignup) {
            console.log('✅ ONBOARDING: Found existing pending signup, loading data:', pendingSignup)

            // Parse the onboarding data
            const parsedData = typeof pendingSignup.onboardingData === 'string'
              ? JSON.parse(pendingSignup.onboardingData)
              : pendingSignup.onboardingData

            console.log('📋 ONBOARDING: Parsed onboarding data:', parsedData)

            // Restore onboarding state
            const restoredData = {
              role: parsedData.role || null,
              firstName: parsedData.firstName || '',
              lastName: parsedData.lastName || '',
              location: parsedData.location || '',
              selectedPackage: pendingSignup.selectedPlan,
              experience: parsedData.experience || '',
              skills: parsedData.skills || [],
              companyName: parsedData.companyName || '',
              companySize: parsedData.companySize || '',
              professionalSummary: parsedData.professionalSummary || ''
            }

            console.log('🔄 ONBOARDING: Setting restored data:', restoredData)
            setOnboardingData(restoredData)

            // Determine target step based on user role
            const targetStep = parsedData.role === 'employer'
              ? getEmployerTargetStep({
                role: parsedData.role,
                firstName: parsedData.firstName,
                lastName: parsedData.lastName,
                location: parsedData.location,
                companyName: parsedData.companyName,
              })
              : getSeekerTargetStep({
                role: parsedData.role,
                firstName: parsedData.firstName,
                lastName: parsedData.lastName,
                selectedPlan: pendingSignup.selectedPlan,
                location: parsedData.location,
                professionalSummary: parsedData.professionalSummary,
              })

            console.log('📍 ONBOARDING: Setting current step to:', targetStep)
            setCurrentStep(targetStep)

            // Mark that we've done the auto-restore, so we don't do it again
            setHasAutoRestored(true)

            console.log('✅ ONBOARDING: Restored data from existing pending signup')
            setIsCheckingStatus(false)
            return true // Indicate that we found and restored data
          }
        }

        console.log('ℹ️ ONBOARDING: No existing pending signup found')

        // Priority 1: Marketing preselection from WordPress site (via cookie)
        // NOTE: Service preselect is already handled at the top of this function (takes priority over drafts)
        // This handles regular subscription/package preselection when no draft exists
        // Use currentPreselect (read from cookie at start of function) since React state might not be updated
        if (currentPreselect && !isServicePreselect(currentPreselect)) {
          console.log('📦 ONBOARDING: No draft found, using marketing preselection:', currentPreselect)
          // Regular subscription/package preselection
          setOnboardingData(prev => ({
            ...prev,
            role: currentPreselect.userType,
            selectedPackage: currentPreselect.userType === 'seeker' ? currentPreselect.planId : undefined,
          }))
          setMarketingPreselect(currentPreselect) // Update state for UI
          setCurrentStep(1) // Skip to basic info since role is set
          setHasAutoRestored(true)
          return false // Return false so we continue checking status, but we've set the data
        }

        // Priority 2: User invitation with seeker/employer role
        if (userInvitation && (userInvitation.role === 'seeker' || userInvitation.role === 'employer')) {
          console.log('📧 ONBOARDING: No draft found, but using invitation role:', userInvitation.role)
          setOnboardingData(prev => ({
            ...prev,
            role: userInvitation.role as 'seeker' | 'employer'
          }))
          setCurrentStep(1) // Skip to basic info since role is set
          setHasAutoRestored(true) // Mark as restored so we don't overwrite
        }

        return false // Indicate that no data was found

      } catch (error) {
        console.error('❌ ONBOARDING: Error checking for existing pending signup:', error)
        return false // Indicate that no data was found due to error
      }
    }

    // Check if user has already completed onboarding
    // This is a fallback check in case middleware didn't catch it
    const checkOnboardingStatus = async () => {
      try {
        console.log('🔍 CLIENT: Checking onboarding status for user:', user?.id)
        console.log('🔍 CLIENT: Has cleared cache already:', hasClearedCache)

        // If we've already cleared cache, just proceed with onboarding form
        if (hasClearedCache) {
          console.log('📝 CLIENT: Cache already cleared, proceeding with onboarding form')
          setIsCheckingStatus(false)
          return
        }

        // First check database for onboarding status
        const response = await fetch('/api/onboarding/status')

        if (response.ok) {
          const { completed, role, shouldClearCache } = await response.json()

          console.log('📋 CLIENT: Onboarding API response:', { completed, role, shouldClearCache })

          // Clear caches if instructed by server, but only once
          if (shouldClearCache) {
            console.log('🧹 CLIENT: Clearing all caches as instructed by server')
            setHasClearedCache(true)

            // Clear localStorage
            if (typeof window !== 'undefined') {
              localStorage.removeItem('onboardingCompleted')
              localStorage.removeItem('userRole')
              localStorage.removeItem('onboardingData')
              console.log('✅ CLIENT: localStorage cleared')
            }

            // Metadata cleared from localStorage above
            console.log('✅ CLIENT: Cache cleared')

            // After clearing cache, proceed with onboarding form
            console.log('📝 CLIENT: Cache cleared, proceeding with onboarding form')
            setIsCheckingStatus(false)
            return
          }

          if (completed && role) {
            // User has completed onboarding in database, redirect to appropriate dashboard
            const dashboardPath = getDashboardPath(role)
            console.log('🔄 CLIENT: Redirecting completed user to:', dashboardPath)
            // Use window.location for a hard navigation to ensure redirect completes
            // This is more reliable than router.replace() after payment flows
            // because router.replace() can be interrupted by React re-renders
            window.location.href = dashboardPath
            return
          }
        }

        // If we reach here, user genuinely needs onboarding
        console.log('📝 CLIENT: User needs onboarding, proceeding with form')
        setIsCheckingStatus(false)
      } catch (error) {
        console.error('❌ CLIENT: Error checking onboarding status:', error)
        // Continue with onboarding if there's an error
        setIsCheckingStatus(false)
      }
    }

    // Main flow logic
    const initializeOnboarding = async () => {
      if (resumeId && sessionToken) {
        console.log('✅ ONBOARDING: Resume parameters found, loading preserved data')
        // Load preserved onboarding data
        loadPreservedOnboardingData(resumeId, sessionToken)
        return
      }

      console.log('⚠️ ONBOARDING: No resume parameters found, checking for existing pending signups')
      // Check for existing pending signups for this user
      const foundExistingData = await checkForExistingPendingSignup()

      // Only proceed with normal onboarding status check if no existing data was found
      if (!foundExistingData) {
        console.log('🔄 ONBOARDING: No existing data found, proceeding with normal onboarding status check')
        checkOnboardingStatus()
      }
    }

    // Only run initialization if we haven't already auto-restored
    // Wait for both invitation and marketing preselect checks to complete
    if (!hasAutoRestored && invitationChecked && marketingPreselectChecked) {
      initializeOnboarding()
    }
    // NOTE: marketingPreselect is intentionally NOT in the dependency array to prevent infinite loops.
    // We use marketingPreselectChecked as the flag to know when to run, and the value is read from state
    // inside checkForExistingPendingSignup when the flag is true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, hasClearedCache, hasAutoRestored, invitationChecked, marketingPreselectChecked])

  // Separate useEffect for pre-filling user data from Clerk
  // ONLY runs if there's NO draft data (first time user)
  useEffect(() => {
    // Wait for auto-restore to complete first
    if (!hasAutoRestored || !invitationChecked) {
      return
    }

    // Only pre-fill if we don't have firstName already (meaning no draft was loaded)
    if (user && !onboardingData.firstName) {
      const firstName = user.firstName || ''
      const lastName = user.lastName || ''
      if (firstName || lastName) {
        console.log('📝 ONBOARDING: Pre-filling user data from Clerk (first time, no draft):', { firstName, lastName })
        setOnboardingData(prev => ({
          ...prev,
          firstName: firstName,
          lastName: lastName,
        }))
      }
    }
  }, [user, hasAutoRestored, invitationChecked])

  const loadPreservedOnboardingData = async (resumeId: string, sessionToken: string) => {
    // Don't auto-restore if we've already done it once
    if (hasAutoRestored) {
      console.log('⏭️ ONBOARDING: Skipping auto-restore from resume, already done once')
      setIsCheckingStatus(false)
      return
    }

    try {
      console.log('🔄 ONBOARDING: Loading preserved data for:', { resumeId, sessionToken })

      const response = await fetch(`/api/onboarding/resume?id=${resumeId}&token=${sessionToken}`)

      if (response.ok) {
        const { onboardingData, selectedPlan } = await response.json()

        console.log('✅ ONBOARDING: Retrieved preserved data:', { onboardingData, selectedPlan })

        // Parse onboarding data if it's a string (from database JSON storage)
        const parsedData = typeof onboardingData === 'string'
          ? JSON.parse(onboardingData)
          : onboardingData

        console.log('📋 ONBOARDING: Parsed onboarding data:', parsedData)

        // Restore onboarding state with all preserved data
        setOnboardingData({
          role: parsedData.role || null,
          firstName: parsedData.firstName || '',
          lastName: parsedData.lastName || '',
          location: parsedData.location || '',
          selectedPackage: selectedPlan,
          experience: parsedData.experience || '',
          skills: parsedData.skills || [],
          companyName: parsedData.companyName || '',
          companySize: parsedData.companySize || '',
          professionalSummary: parsedData.professionalSummary || ''
        })

        // Determine target step based on user role
        const targetStep = parsedData.role === 'employer'
          ? getEmployerTargetStep({
            role: parsedData.role,
            firstName: parsedData.firstName,
            lastName: parsedData.lastName,
            location: parsedData.location,
            companyName: parsedData.companyName,
          })
          : getSeekerTargetStep({
            role: parsedData.role,
            firstName: parsedData.firstName,
            lastName: parsedData.lastName,
            selectedPlan: selectedPlan,
            location: parsedData.location,
            professionalSummary: parsedData.professionalSummary,
          })

        setCurrentStep(targetStep)

        // Mark that we've done the auto-restore, so we don't do it again
        setHasAutoRestored(true)

        console.log('✅ ONBOARDING: Data restored from cancelled checkout, step:', currentStep)
        setIsCheckingStatus(false)
      } else {
        console.error('❌ ONBOARDING: Failed to load preserved data:', response.status)
        setIsCheckingStatus(false)
      }
    } catch (error) {
      console.error('❌ ONBOARDING: Error loading preserved data:', error)
      setIsCheckingStatus(false)
    }
  }

  const handleNext = async () => {
    try {
      setIsNavigating(true)

      // Debug: Log current step and data before proceeding
      console.log('🔍 ONBOARDING: Moving from step', currentStep, 'to', currentStep + 1)
      console.log('🔍 ONBOARDING: Current data:', onboardingData)

      // Auto-save before moving to next step
      await saveDraftPendingSignup(true)

      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1)
      }
    } finally {
      setIsNavigating(false)
    }
  }

  const handlePrevious = () => {
    // If user has an invitation with seeker/employer role, prevent going back to step 0
    if (userInvitation && (userInvitation.role === 'seeker' || userInvitation.role === 'employer')) {
      if (currentStep > 1) {
        setCurrentStep(currentStep - 1)
      }
    } else {
      if (currentStep > 0) {
        setCurrentStep(currentStep - 1)
      }
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      // Service-only flow: User came via service SKU, skip payment and go to services
      if (isServiceOnlyFlow) {
        await handleServiceOnlyOnboarding()
      } else if (onboardingData.role === 'seeker' && onboardingData.selectedPackage) {
        // For seekers with selected package, redirect to external checkout
        await handleSeekerCheckoutFlow()
      } else {
        // Original flow for employers or seekers without packages
        await handleStandardOnboarding()
      }
    } catch (error) {
      console.error('Error completing onboarding:', error)
      alert('There was an error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle service-only onboarding flow (user came via service SKU link)
  // Creates user profile without subscription and redirects to services page
  const handleServiceOnlyOnboarding = async () => {
    console.log('📦 ONBOARDING: Service-only flow - completing onboarding without subscription')

    // Check email verification first
    const isEmailVerified = user?.primaryEmailAddress?.verification?.status === 'verified'
    if (!isEmailVerified) {
      console.log('⚠️ ONBOARDING: Email not verified, saving draft and showing verification modal')
      await saveDraftPendingSignup(true)
      setShowEmailVerificationModal(true)
      return
    }

    // Complete onboarding with isServiceOnly flag
    const response = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'seeker',
        firstName: onboardingData.firstName,
        lastName: onboardingData.lastName,
        location: onboardingData.location,
        experience: onboardingData.experience,
        skills: onboardingData.skills,
        professionalSummary: onboardingData.professionalSummary,
        isServiceOnly: true, // Flag for service-only users (no subscription)
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to save onboarding data')
    }

    const result = await response.json()
    console.log('✅ ONBOARDING: Service-only onboarding completed:', result)

    // Mark user invitation as accepted if it exists
    if (userInvitation) {
      try {
        await fetch('/api/user/invitation/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invitationId: userInvitation.id })
        })
      } catch (error) {
        console.error('Error marking user invitation as accepted:', error)
      }
    }

    // Save to localStorage as backup
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboardingCompleted', 'true')
      localStorage.setItem('userRole', 'seeker')
    }

    // Clear marketing preselect cookie
    if (marketingPreselect) {
      clearMarketingPreselect()
    }

    // Store service redirect info and redirect to services page
    if (postOnboardingServiceSku) {
      console.log('📦 ONBOARDING: Storing service SKU for redirect:', postOnboardingServiceSku)
      localStorage.setItem('hmm_post_onboarding_service', postOnboardingServiceSku)
    }

    // Redirect to services page with the pre-selected service
    const serviceRedirectUrl = postOnboardingServiceId
      ? `/seeker/services?service=${postOnboardingServiceId}&autoOpen=true`
      : '/seeker/services'

    console.log('📦 ONBOARDING: Redirecting to services page:', serviceRedirectUrl)
    router.push(serviceRedirectUrl)
  }

  const handleSeekerCheckoutFlow = async () => {
    // Debug: Log the current onboarding data
    console.log('🔍 ONBOARDING: Current onboarding data before checkout:', onboardingData)
    console.log('🔍 ONBOARDING: User email:', user?.primaryEmailAddress?.emailAddress)
    console.log('🔍 ONBOARDING: User email verified:', user?.primaryEmailAddress?.verification?.status)

    // Check email verification first, before creating pending signup
    const isEmailVerified = user?.primaryEmailAddress?.verification?.status === 'verified'
    if (!isEmailVerified) {
      console.log('⚠️ ONBOARDING: Email not verified, saving draft and showing verification modal')
      console.log('📧 ONBOARDING: Verification modal will show for email:', user?.primaryEmailAddress?.emailAddress)

      // Save draft pending signup to preserve data
      await saveDraftPendingSignup(true)

      setShowEmailVerificationModal(true)
      return
    }

    // 1. Ensure pending signup exists (create or update existing one)
    const pendingSignupResponse = await fetch('/api/onboarding/pending-signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        onboardingData,
        selectedPackage: onboardingData.selectedPackage
      })
    })

    if (!pendingSignupResponse.ok) {
      const errorData = await pendingSignupResponse.json()
      console.error('❌ ONBOARDING: Pending signup error:', errorData)
      throw new Error(errorData.details || 'Failed to create pending signup')
    }

    const { pendingSignup } = await pendingSignupResponse.json()
    console.log('✅ ONBOARDING: Pending signup ready:', pendingSignup.id)

    // Mark user invitation as accepted if it exists
    if (userInvitation) {
      try {
        await fetch('/api/user/invitation/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            invitationId: userInvitation.id
          })
        })
      } catch (error) {
        console.error('Error marking user invitation as accepted:', error)
      }
    }

    // 2. Use the seeker subscription checkout API (which will use the existing pending signup)
    const checkoutResponse = await fetch('/api/seeker/subscription/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        selectedPackage: onboardingData.selectedPackage,
        upgradeType: 'new'
      })
    })

    if (!checkoutResponse.ok) {
      const errorData = await checkoutResponse.json()
      console.error('❌ ONBOARDING: Checkout error:', errorData)
      throw new Error(errorData.error || 'Failed to create checkout session')
    }

    const { checkoutUrl, paymentMethod } = await checkoutResponse.json()

    console.log('✅ ONBOARDING: Checkout session created:', {
      checkoutUrl,
      paymentMethod,
      selectedPackage: onboardingData.selectedPackage
    })

    // Clear marketing preselect cookie before redirecting to checkout
    // (seeker has proceeded with their selected plan)
    if (marketingPreselect) {
      clearMarketingPreselect()
    }

    // Store post-onboarding service redirect if applicable (for service SKU flows)
    // This will be checked on the dashboard after payment completes
    // Using localStorage instead of sessionStorage because PayPal redirects externally
    // and sessionStorage doesn't persist across external redirects
    // Store the SKU (not planId) for consistent mapping on services page
    if (postOnboardingServiceSku) {
      console.log('📦 ONBOARDING: Storing post-payment service SKU in localStorage:', postOnboardingServiceSku)
      localStorage.setItem('hmm_post_onboarding_service', postOnboardingServiceSku)
    }

    // 3. Redirect to checkout (internal or external based on feature flag)
    window.location.href = checkoutUrl
  }

  const handleStandardOnboarding = async () => {
    // Check email verification first for all users (employers and seekers without packages)
    const isEmailVerified = user?.primaryEmailAddress?.verification?.status === 'verified'
    if (!isEmailVerified) {
      console.log('⚠️ ONBOARDING: Email not verified, saving draft and showing verification modal')
      console.log('📧 ONBOARDING: Verification modal will show for email:', user?.primaryEmailAddress?.emailAddress)

      // Save draft pending signup to preserve data (similar to seeker flow)
      await saveDraftPendingSignup(true)

      setShowEmailVerificationModal(true)
      return
    }

    // Save onboarding data to database
    const response = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: onboardingData.role,
        firstName: onboardingData.firstName,
        lastName: onboardingData.lastName,
        location: onboardingData.location,
        experience: onboardingData.experience,
        skills: onboardingData.skills,
        companyName: onboardingData.companyName,
        companySize: onboardingData.companySize,
        professionalSummary: onboardingData.professionalSummary,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to save onboarding data')
    }

    const result = await response.json()
    console.log('Onboarding data saved successfully:', result)

    // Mark user invitation as accepted if it exists
    if (userInvitation) {
      try {
        await fetch('/api/user/invitation/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            invitationId: userInvitation.id
          })
        })
      } catch (error) {
        console.error('Error marking user invitation as accepted:', error)
      }
    }

    // Also save to localStorage as backup
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboardingCompleted', 'true')
      localStorage.setItem('userRole', onboardingData.role || '')
      localStorage.setItem('onboardingData', JSON.stringify(onboardingData))
    }

    // For employers with marketing preselection, redirect to billing with pre-selected package
    if (onboardingData.role === 'employer' && marketingPreselect) {
      console.log('📦 ONBOARDING: Employer with marketing preselection, redirecting to billing')
      clearMarketingPreselect()
      router.push(`/employer/billing?plan=${marketingPreselect.planId}&autoOpen=true`)
      return
    }

    // Redirect to appropriate dashboard
    const dashboardPath = getDashboardPath(onboardingData.role || 'seeker')
    router.push(dashboardPath)
  }

  const handleSaveAndContinueLater = async () => {
    try {
      setIsLoading(true)

      // Check email verification first
      const isEmailVerified = user?.primaryEmailAddress?.verification?.status === 'verified'
      if (!isEmailVerified) {
        console.log('⚠️ ONBOARDING: Email not verified, showing verification modal')
        setShowEmailVerificationModal(true)
        return
      }

      // Save complete onboarding profile without payment
      console.log('💾 ONBOARDING: Saving profile and continuing later...')

      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: onboardingData.role,
          firstName: onboardingData.firstName,
          lastName: onboardingData.lastName,
          location: onboardingData.location,
          experience: onboardingData.experience,
          skills: onboardingData.skills,
          companyName: onboardingData.companyName,
          companySize: onboardingData.companySize,
          professionalSummary: onboardingData.professionalSummary,
          selectedPackage: onboardingData.selectedPackage || null
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save profile')
      }

      const result = await response.json()
      console.log('✅ ONBOARDING: Profile saved successfully:', result)

      // Mark user invitation as accepted if it exists
      if (userInvitation) {
        try {
          await fetch('/api/user/invitation/accept', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              invitationId: userInvitation.id
            })
          })
        } catch (error) {
          console.error('Error marking user invitation as accepted:', error)
        }
      }

      // Save to localStorage as backup
      if (typeof window !== 'undefined') {
        localStorage.setItem('onboardingCompleted', 'true')
        localStorage.setItem('userRole', onboardingData.role || '')
        localStorage.setItem('onboardingData', JSON.stringify(onboardingData))
      }

      // Redirect to seeker dashboard
      console.log('🔄 ONBOARDING: Redirecting to seeker dashboard')
      router.push('/seeker/dashboard')
    } catch (error) {
      console.error('❌ ONBOARDING: Error saving profile:', error)
      alert('There was an error saving your profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const saveDraftPendingSignup = useCallback(async (force = false) => {
    try {
      // Only save if we have meaningful data and user is authenticated
      if (!user || (!onboardingData.role && !onboardingData.firstName && !onboardingData.lastName)) {
        return
      }

      // Avoid too frequent saves (unless forced)
      if (!force && lastAutoSave && Date.now() - lastAutoSave.getTime() < 5000) {
        return
      }

      console.log('💾 ONBOARDING: Auto-saving draft pending signup to preserve data')

      const response = await fetch('/api/onboarding/pending-signup/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          onboardingData,
          selectedPackage: onboardingData.selectedPackage || 'none' // Provide default for employers
        })
      })

      if (response.ok) {
        setLastAutoSave(new Date())
        console.log('✅ ONBOARDING: Draft pending signup auto-saved successfully')
      } else {
        console.error('❌ ONBOARDING: Failed to auto-save draft pending signup')
      }
    } catch (error) {
      console.error('❌ ONBOARDING: Error auto-saving draft pending signup:', error)
    }
  }, [user, onboardingData, lastAutoSave])

  // Auto-save effect - saves data when onboardingData changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveDraftPendingSignup()
    }, 2000) // Debounce auto-save by 2 seconds

    return () => clearTimeout(timeoutId)
  }, [onboardingData, saveDraftPendingSignup])

  const updateData = (updates: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...updates }))
  }

  const handleResendVerification = async () => {
    if (!user || !user.primaryEmailAddress) {
      console.log('❌ RESEND: No user or email address found')
      return
    }

    console.log('🔄 RESEND: Attempting to resend verification email to:', user.primaryEmailAddress.emailAddress)
    setIsResending(true)
    setResendSuccess(false)

    try {
      // Clerk method to resend verification email
      await user.primaryEmailAddress.prepareVerification({ strategy: 'email_code' })

      // Log success
      console.log('✅ RESEND: Verification email sent successfully to:', user.primaryEmailAddress.emailAddress)
      setResendSuccess(true)

      // Show success message for 5 seconds
      setTimeout(() => {
        console.log('⏱️ RESEND: Hiding success message')
        setResendSuccess(false)
      }, 5000)
    } catch (error: unknown) {
      console.error('❌ RESEND: Error resending verification email:', error)
      alert('Failed to resend verification email. Please try again.')
    } finally {
      console.log('🏁 RESEND: Finished resend attempt')
      setIsResending(false)
    }
  }

  const renderStepContent = () => {
    const stepId = getCurrentStepId(currentStep)

    switch (stepId) {
      case 'role':
        return (
          <RoleStep
            selectedRole={onboardingData.role}
            onRoleSelect={(role) => updateData({ role })}
          />
        )

      case 'profile':
        return (
          <BasicInfoStep
            firstName={onboardingData.firstName}
            lastName={onboardingData.lastName}
            location={onboardingData.location}
            onUpdate={updateData}
          />
        )

      case 'package':
        // For seekers: show package selection
        // For employers: this step doesn't exist in their flow
        if (onboardingData.role === 'seeker') {
          return (
            <PackageCompanyStep
              role={onboardingData.role}
              selectedPackage={onboardingData.selectedPackage}
              onPackageSelect={(packageId) => updateData({ selectedPackage: packageId })}
              companyName={onboardingData.companyName}
              companySize={onboardingData.companySize}
              onCompanyUpdate={updateData}
              pendingServiceId={postOnboardingServiceId}
            />
          )
        }
        return null

      case 'details':
        // For employers: show company details
        // For seekers: show additional details (experience & skills)
        if (onboardingData.role === 'employer') {
          return (
            <PackageCompanyStep
              role={onboardingData.role}
              selectedPackage={onboardingData.selectedPackage}
              onPackageSelect={(packageId) => updateData({ selectedPackage: packageId })}
              companyName={onboardingData.companyName}
              companySize={onboardingData.companySize}
              onCompanyUpdate={updateData}
            />
          )
        }

        return (
          <AdditionalDetailsStep
            role={onboardingData.role}
            experience={onboardingData.experience}
            skills={onboardingData.skills}
            onUpdate={updateData}
          />
        )

      case 'goals':
        return (
          <GoalsStep
            role={onboardingData.role}
            professionalSummary={onboardingData.professionalSummary || ''}
            onUpdate={(professionalSummary) => updateData({ professionalSummary })}
          />
        )

      case 'complete':
        return (
          <CompleteStep
            role={onboardingData.role!}
            firstName={onboardingData.firstName}
            isLoading={isLoading}
            onComplete={handleComplete}
            onSaveAndContinueLater={
              onboardingData.role === 'seeker' && onboardingData.selectedPackage
                ? () => handleSaveAndContinueLater()
                : undefined
            }
            selectedPackage={onboardingData.selectedPackage}
            isServiceOnly={isServiceOnlyFlow}
            serviceId={postOnboardingServiceId}
          />
        )

      default:
        return null
    }
  }

  const canProceed = () => {
    // Get current step ID - uses flow-aware step array
    const stepId = getCurrentStepId(currentStep)

    // Use role-specific validation function
    const result = onboardingData.role === 'employer'
      ? canEmployerProceed(stepId, onboardingData)
      : canSeekerProceed(stepId, onboardingData)

    console.log('🔍 ONBOARDING: canProceed check:', {
      currentStep,
      stepId,
      result,
      role: onboardingData.role,
      firstName: onboardingData.firstName,
      lastName: onboardingData.lastName,
      location: onboardingData.location,
      selectedPackage: onboardingData.selectedPackage,
      companyName: onboardingData.companyName,
      professionalSummaryLength: onboardingData.professionalSummary?.length || 0
    })

    return result
  }

  if (!user || isCheckingStatus || !invitationChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
        {isCheckingStatus && (
          <p className="ml-3 text-gray-600">Checking your account status...</p>
        )}
      </div>
    )
  }

  return (
    <div className="onboarding-page min-h-screen bg-gray-50 pt-4">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex-1"></div>
              <Image
                src="/hmm_logo.png"
                alt="Hire My Mom Logo"
                width={200}
                height={0}
                style={{ height: 'auto' }}
                className="max-h-24"
              />
              <div className="flex-1 flex justify-end">
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
            <p className="text-gray-600">Let's get you set up in just a few steps</p>
          </div>

          {/* Progress Steps */}
          <div className="mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-center overflow-x-auto">
                <div className="flex items-center">
                  {STEPS.map((step, index) => {
                    const Icon = step.icon
                    const isActive = index === currentStep
                    const isCompleted = index < currentStep

                    if (index === 0 && (userInvitation?.role === 'seeker' || userInvitation?.role === 'employer')) return;

                    return (
                      <div key={step.id} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${isActive
                            ? 'border-brand-teal bg-brand-teal text-white shadow-md'
                            : isCompleted
                              ? 'border-brand-coral bg-brand-coral text-white'
                              : 'border-gray-300 bg-white text-gray-400'
                            }`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <p className={`text-xs font-medium mt-2 text-center max-w-[100px] ${isActive ? 'text-brand-teal' : isCompleted ? 'text-brand-coral' : 'text-gray-500'
                            }`}>
                            {step.title}
                          </p>
                        </div>
                        {index < STEPS.length - 1 && (
                          <div className={`w-16 h-0.5 mx-4 rounded-full transition-all ${isCompleted ? 'bg-brand-coral' : 'bg-gray-200'
                            }`} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <Card className="min-h-[500px] shadow-sm border border-gray-200 bg-white">
            <CardContent className="p-8">
              {renderStepContent()}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            {/* Show Previous button except on first step */}
            {/* For users with seeker/employer invitations, don't show Previous button when on step 1 */}
            {currentStep > 0 && !(userInvitation && (userInvitation.role === 'seeker' || userInvitation.role === 'employer') && currentStep === 1) && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isLoading || isNavigating}
                className="border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}

            {/* Show spacer if on first step to keep Next button aligned right */}
            {(currentStep === 0 || (userInvitation?.role === 'seeker' || userInvitation?.role === 'employer')) && <div></div>}

            {/* Only show Next button if not on final step */}
            {currentStep < STEPS.length - 1 && (
              <Button
                onClick={() => {
                  console.log('🔍 ONBOARDING: Next button clicked, canProceed:', canProceed())
                  console.log('🔍 ONBOARDING: Current step:', currentStep)
                  console.log('🔍 ONBOARDING: Current data:', onboardingData)
                  handleNext()
                }}
                disabled={!canProceed() || isLoading || isNavigating}
                className="bg-brand-teal hover:bg-brand-teal/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isNavigating ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Email Verification Modal */}
      <Dialog open={showEmailVerificationModal} onOpenChange={setShowEmailVerificationModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-amber-100 rounded-full">
              <Mail className="w-6 h-6 text-amber-600" />
            </div>
            <DialogTitle className="text-center text-xl font-semibold text-gray-900">
              Email Verification Required
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600 mt-2">
              Please verify your email address before completing your onboarding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>We sent a verification email to:</strong>
              </p>
              <p className="text-sm font-medium text-gray-900 bg-white px-3 py-2 rounded border">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p>Please check your inbox and click the verification link to continue.</p>
              <p className="text-xs text-gray-500">
                Don't see the email? Check your spam folder or contact support.
              </p>
            </div>

            {resendSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700 font-medium">
                  ✅ Verification email sent successfully!
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleResendVerification}
                disabled={isResending}
                variant="outline"
                className="w-full border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2 text-gray-700" />
                    <span className="text-gray-700">Sending...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 text-gray-700" />
                    <span className="text-gray-700">Resend Verification Email</span>
                  </>
                )}
              </Button>

              <Button
                onClick={() => window.location.reload()}
                variant="ghost"
                className="w-full text-gray-600 hover:text-gray-900"
              >
                Refresh Page
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}