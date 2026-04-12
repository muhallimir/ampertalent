'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { CompanyLogo } from '@/components/common/CompanyLogo'
import { getImpersonationSession } from '@/lib/admin-impersonation'
import { useUserProfile } from '@/hooks/useUserProfile'
import { NotificationPanel } from '@/components/seeker/NotificationPanel'
import Link from 'next/link'
import Image from 'next/image'
import {
  Briefcase,
  FileText,
  User,
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Bookmark,
  Bell,
  Upload,
  Eye,
  ExternalLink,
  MessageCircle,
} from 'lucide-react'
import { ChatButton } from '@/components/seeker/ChatButton'
import { JobSearchItem } from '@/lib/search'

// Transform function to convert dashboard job format to JobSearchItem
const transformJobToSearchItem = (job: any): JobSearchItem & { companyLogoUrl?: string; employerId?: string; isFilled?: boolean; applicationStatus?: any } => ({
  id: job.id,
  title: job.title,
  company: job.companyName,
  category: job.category,
  type: job.type,
  payRange: job.payRangeMin && job.payRangeMax ? {
    min: job.payRangeMin,
    max: job.payRangeMax,
    text: job.payRangeText || `$${job.payRangeMin}-${job.payRangeMax}/hr`
  } : undefined,
  location: job.locationText || 'Remote',
  description: job.description,
  skills: Array.isArray(job.skillsRequired) ? job.skillsRequired : [],
  postedDate: job.createdAt,
  expiresAt: job.expiresAt,
  applicationCount: 0, // Not available in dashboard format
  isRemote: true, // Assume remote for now
  isFlexible: job.isFlexibleHours || false,
  isFeatured: false, // Not available in dashboard format
  relevanceScore: 1.0, // Default relevance score
  // Add company logo information
  companyLogoUrl: job.companyLogoUrl,
  employerId: job.employerId,
  // Add filled status and application status
  isFilled: job.isFilled || false,
  applicationStatus: job.applicationStatus
})

interface DashboardStats {
  applications: {
    total: number
    pending: number
    reviewed: number
    interview: number
    hired: number
    rejected: number
    followUpNeeded: number
  }
  jobs: {
    active: number
    recommended: number
    saved: number
  }
  profile: {
    completionPercentage: number
    isComplete: boolean
    missingFields?: string[]
    suggestions?: string[]
  }
  resume: {
    hasResume: boolean
    uploadDate: string | null
    lastUpdated: string | null
  }
  membership: {
    status: string
    plan: string
    expiresAt: string | null
    isOnTrial: boolean
    trialEndsAt: string | null
    daysUntilExpiry: number | null
  }
  recentActivities: Array<{
    id: string
    type: string
    title: string
    description: string
    createdAt: string
    status: string
    jobId?: string
    companyName?: string
    companyLogoUrl?: string
    isArchived?: boolean
    archivedAt?: string | null
  }>
  recommendedJobs: Array<{
    id: string
    title: string
    companyName: string
    companyLogoUrl?: string
    description: string
    category: string
    type: 'full-time' | 'part-time' | 'project'
    payRangeMin?: number
    payRangeMax?: number
    payRangeText?: string
    skillsRequired: string[]
    isFlexibleHours: boolean
    hoursPerWeek?: number
    remoteSchedule?: string
    locationText?: string
    createdAt: string
    expiresAt: string
  }>
  savedJobs?: Array<{
    id: string
  }>
}

export default function SeekerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set())
  const { profile: userProfile, isLoading: profileLoading } = useUserProfile()

  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)

    // Check for Stripe payment success (from checkout redirect)
    const checkoutSuccess = searchParams.get('checkout')
    const sessionId = searchParams.get('sessionId')
    const paymentStatus = searchParams.get('payment_status')
    const transactionId = searchParams.get('transaction_id')

    if (checkoutSuccess === 'success' || paymentStatus === 'success') {
      console.log('💳 DASHBOARD: Payment success detected', {
        checkoutSuccess,
        sessionId,
        paymentStatus,
        transactionId
      })

      // Process the successful payment
      const processPaymentSuccess = async () => {
        try {
          // Call API to process the payment and create subscription
          const response = await fetch('/api/seeker/subscription/process-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sessionId: sessionId || transactionId,
              paymentMethod: sessionId ? 'stripe' : 'paypal',
              paymentStatus
            })
          })

          if (!response.ok) {
            const error = await response.json()
            console.error('❌ DASHBOARD: Payment processing failed:', error)
            // Don't block dashboard load on error - user can retry
            return
          }

          const result = await response.json()
          console.log('✅ DASHBOARD: Payment processed successfully:', result)
          
          // Clean up URL params after successful processing
          // This prevents the payment from being processed again if user refreshes
          window.history.replaceState({}, document.title, '/seeker/dashboard')
        } catch (error) {
          console.error('❌ DASHBOARD: Error processing payment:', error)
        }
      }

      processPaymentSuccess()
    }

    // Check for post-onboarding service redirect (from service SKU flow)
    // This happens when user signed up with a premium service SKU
    // Using localStorage because PayPal redirects externally and sessionStorage doesn't persist
    // The value stored is the SKU (e.g., '2228720'), which the services page maps to service ID
    const postOnboardingServiceSku = localStorage.getItem('hmm_post_onboarding_service')

    // Redirect if localStorage has pending service SKU
    // No longer require welcome=true since it can be lost during redirects
    // The services page will clean up localStorage when modal is closed
    if (postOnboardingServiceSku) {
      console.log('📦 DASHBOARD: Post-onboarding service redirect detected, SKU:', postOnboardingServiceSku)
      // DON'T clear localStorage here - let the services page handle cleanup when modal closes
      // This ensures the user can still be redirected if they navigate away and come back
      router.push(`/seeker/services?service=${postOnboardingServiceSku}&autoOpen=true`)
      return
    }

    // Handle auto-signin from external checkout
    const autoSigninUserId = searchParams.get('auto_signin')
    const welcome = searchParams.get('welcome')

    if (autoSigninUserId && welcome === 'true') {
      console.log('🎉 Welcome new user from external checkout:', autoSigninUserId)
      // Show welcome message or trigger welcome flow
      // The user should already be signed in via Clerk
    }

    loadDashboardStats()
    // loadSavedJobs() - REMOVED: saved jobs are already included in dashboard/stats response
  }, [searchParams, router])

  // Load saved jobs from stats data (no separate API call needed)
  useEffect(() => {
    if (stats?.savedJobs) {
      const savedJobIds = new Set<string>(stats.savedJobs.map((job: any) => job.id))
      setSavedJobs(savedJobIds)
    }
  }, [stats?.savedJobs])

  // const handleSaveJob = async (jobId: string) => {
  //   try {
  //     const isSaved = savedJobs.has(jobId)

  //     if (isSaved) {
  //       // Unsave the job
  //       const response = await fetch(`/api/seeker/saved-jobs?jobId=${jobId}`, {
  //         method: 'DELETE'
  //       })

  //       if (response.ok) {
  //         setSavedJobs(prev => {
  //           const newSet = new Set(prev)
  //           newSet.delete(jobId)
  //           return newSet
  //         })
  //       }
  //     } else {
  //       // Save the job
  //       const response = await fetch('/api/seeker/saved-jobs', {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json'
  //         },
  //         body: JSON.stringify({ jobId })
  //       })

  //       if (response.ok) {
  //         setSavedJobs(prev => new Set([...prev, jobId]))
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Error saving/unsaving job:', error)
  //   }
  // }

  const loadDashboardStats = async () => {
    try {
      console.log('Loading seeker dashboard stats...')

      // Check for impersonation context only on client side
      const headers: HeadersInit = {}

      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          console.log('🎭 FRONTEND: Adding impersonation headers to seeker dashboard stats request', {
            impersonatedUserId: impersonationSession.impersonatedUser.id,
            adminId: impersonationSession.adminId
          })
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }

      // Use the API endpoint to fetch all dashboard data in one request
      const response = await fetch('/api/seeker/dashboard/stats?include=saved-jobs,applications,profile,membership', { headers })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load dashboard data')
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
      setError('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600'
      case 'reviewed': return 'text-blue-600'
      case 'interview': return 'text-purple-600'
      case 'hired': return 'text-green-600'
      case 'rejected': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'hired': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  // Prevent hydration mismatch by not rendering dynamic content until mounted
  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back!</h1>
          <p className="text-gray-600 mt-2">
            Here&apos;s what&apos;s happening with your job search journey.
          </p>
        </div>

        {/* Loading skeleton */}
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (isLoading || profileLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back!</h1>
          <p className="text-gray-600 mt-2">
            Here&apos;s what&apos;s happening with your job search journey.
          </p>
        </div>

        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Dashboard</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadDashboardStats}>Try Again</Button>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Data Available</h1>
          <Button onClick={loadDashboardStats}>Reload</Button>
        </div>
      </div>
    )
  }
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center space-x-4">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            {userProfile?.presignedProfilePictureUrl ? (
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-brand-coral">
                <Image
                  src={userProfile.presignedProfilePictureUrl}
                  alt={userProfile.name || 'Profile'}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 bg-brand-coral-light rounded-full flex items-center justify-center border-2 border-brand-coral">
                <User className="h-8 w-8 text-brand-coral" />
              </div>
            )}
          </div>

          {/* Welcome Message */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome Back{userProfile?.name ? `, ${userProfile.name}` : ''}!
            </h1>
            <p className="text-gray-600 mt-2">
              Here&apos;s what&apos;s happening with your job search journey.
            </p>
            {userProfile?.email && (
              <p className="text-sm text-gray-500 mt-1">
                {userProfile.email}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Notification Panel */}
      <NotificationPanel />

      {/* Enhanced Quick Stats
       * Grid layout dynamically adjusts based on number of visible cards:
       * - With NEXT_PUBLIC_SHOW_JOB_COUNTS=true: 6 cards, uses xl:grid-cols-6
       * - With NEXT_PUBLIC_SHOW_JOB_COUNTS=false: 5 cards, uses xl:grid-cols-5
       * This ensures cards are evenly distributed regardless of feature flag state
       */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${process.env.NEXT_PUBLIC_SHOW_JOB_COUNTS === 'true'
        ? 'xl:grid-cols-6'
        : 'xl:grid-cols-5'
        }`}>
        {/* Applications Card */}
        <Link href="/seeker/applications" className="block h-full">
          <Card className="h-full flex flex-col border-l-4 border-l-brand-teal shadow-sm hover:shadow-lg transition-all cursor-pointer hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Applications</CardTitle>
              <div className="p-2 bg-brand-teal-light rounded-lg">
                <FileText className="h-4 w-4 text-brand-teal" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div className="text-2xl font-bold text-gray-900">{stats.applications.total}</div>
              <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                <div className="flex flex-col items-center">
                  <span className="text-yellow-600 font-bold text-sm">{stats.applications.pending}</span>
                  <span className="text-gray-600">pending</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-blue-600 font-bold text-sm">{stats.applications.reviewed}</span>
                  <span className="text-gray-600">reviewed</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-green-600 font-bold text-sm">{stats.applications.hired}</span>
                  <span className="text-gray-600">hired</span>
                </div>
              </div>
              {stats.applications.followUpNeeded > 0 && (
                <div className="flex items-center mt-1 text-xs text-orange-600">
                  <Bell className="h-3 w-3 mr-1" />
                  {stats.applications.followUpNeeded} need follow-up
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Available Jobs Card
         * FEATURE FLAG: NEXT_PUBLIC_SHOW_JOB_COUNTS
         * This tile is conditionally rendered based on the feature flag.
         * To re-enable: Set NEXT_PUBLIC_SHOW_JOB_COUNTS="true" in .env
         * Related: Also controls job count display in AdvancedJobSearch.tsx
         */}
        {process.env.NEXT_PUBLIC_SHOW_JOB_COUNTS === 'true' && (
          <Link href="/seeker/jobs" className="block h-full">
            <Card className="h-full flex flex-col border-l-4 border-l-brand-coral shadow-sm hover:shadow-lg transition-all cursor-pointer hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Available Jobs</CardTitle>
                <div className="p-2 bg-brand-coral-light rounded-lg">
                  <Briefcase className="h-4 w-4 text-brand-coral" />
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="text-2xl font-bold text-gray-900">{stats.jobs.active}</div>
                <p className="text-xs text-gray-600 mt-1">
                  Total active job postings
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Saved Jobs Card */}
        <Link href="/seeker/saved-jobs" className="block h-full">
          <Card className="h-full flex flex-col border-l-4 border-l-blue-500 shadow-sm hover:shadow-lg transition-all cursor-pointer hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Saved Jobs</CardTitle>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bookmark className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div className="text-2xl font-bold text-gray-900">{stats.jobs.saved}</div>
              <p className="text-xs text-gray-600 mt-1">
                {`Jobs you've bookmarked`}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Resume Status Card */}
        <Link href="/seeker/profile?tab=resume" className="block h-full">
          <Card className="h-full flex flex-col border-l-4 border-l-purple-500 shadow-sm hover:shadow-lg transition-all cursor-pointer hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Resume Status</CardTitle>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Upload className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div className="text-2xl font-bold text-gray-900">
                {stats.resume.hasResume ? '✓' : '✗'}
              </div>
              <p className="text-xs text-gray-500">
                {stats.resume.hasResume
                  ? `Updated ${stats.resume.lastUpdated || 'recently'}`
                  : 'No resume uploaded'
                }
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Membership Card */}
        <Link href="/seeker/subscription" className="block h-full">
          <Card className="h-full flex flex-col border-l-4 border-l-green-500 shadow-sm hover:shadow-lg transition-all cursor-pointer hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Membership</CardTitle>
              <div className="p-2 bg-green-100 rounded-lg">
                <CreditCard className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div className="text-2xl font-bold text-gray-900">{stats.membership.plan}</div>
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  {stats.membership.status}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Messages Card - Keep ChatButton interactive */}
        <div className="relative h-full">
          <Card className="h-full flex flex-col border-l-4 border-l-indigo-500 shadow-sm hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Messages</CardTitle>
              <ChatButton
                size="sm"
                variant="outline"
                className="text-indigo-600 border-indigo-600 hover:bg-indigo-600 hover:text-white z-10"
                showUnreadBadge={true}
              />
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-gray-900">💬</div>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Connect with employers
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Follow-up Reminders */}
      {stats.applications.followUpNeeded > 0 && (
        <Card className="shadow-sm border border-orange-200 bg-orange-50">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Follow-up Reminders</span>
            </CardTitle>
            <CardDescription className="text-white/90">
              Applications that need your attention
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-orange-800">
                  {stats.applications.followUpNeeded} application{stats.applications.followUpNeeded !== 1 ? 's' : ''} need follow-up
                </p>
                <p className="text-sm text-orange-600 mt-1">
                  {`It's been over a week since you applied. Consider reaching out to show continued interest.`}
                </p>
              </div>
              <Button asChild className="bg-orange-600 hover:bg-orange-700">
                <Link href="/seeker/applications">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Review Applications
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Application Status Breakdown */}
      <Card className="shadow-sm border border-gray-200">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="text-gray-900 flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Application Status Overview</span>
          </CardTitle>
          <CardDescription>
            Track your job application progress at a glance
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {stats.applications.total === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-4">No applications submitted yet</p>
              <Button asChild className="bg-brand-teal hover:bg-brand-teal/90">
                <Link href="/seeker/jobs">Start Applying to Jobs</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-700">{stats.applications.pending}</div>
                <div className="text-sm text-yellow-600 mt-1">Pending</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{stats.applications.reviewed}</div>
                <div className="text-sm text-blue-600 mt-1">Reviewed</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-700">{stats.applications.interview}</div>
                <div className="text-sm text-purple-600 mt-1">Interview</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700">{stats.applications.hired}</div>
                <div className="text-sm text-green-600 mt-1">Hired</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-700">{stats.applications.rejected}</div>
                <div className="text-sm text-red-600 mt-1">Not Selected</div>
              </div>
            </div>
          )}
          <div className="flex justify-center mt-6">
            <Button asChild variant="outline">
              <Link href="/seeker/applications">
                <Eye className="h-4 w-4 mr-2" />
                View All Applications
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Saved Jobs Preview */}
      <Card className="shadow-sm border border-gray-200">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="text-gray-900 flex items-center space-x-2">
            <Bookmark className="h-5 w-5" />
            <span>Saved Jobs</span>
          </CardTitle>
          <CardDescription>
            {`Jobs you've bookmarked for later review`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {stats.jobs.saved === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-brand-teal-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Bookmark className="h-8 w-8 text-brand-teal" />
              </div>
              <p className="text-gray-600 mb-4">No saved jobs yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Save interesting jobs while browsing to review them later
              </p>
              <Button asChild className="bg-brand-teal hover:bg-brand-teal/90">
                <Link href="/seeker/jobs">Browse Jobs</Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {stats.jobs.saved} job{stats.jobs.saved !== 1 ? 's' : ''} saved
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Review your bookmarked opportunities
                </p>
              </div>
              <Button asChild className="bg-brand-teal hover:bg-brand-teal/90">
                <Link href="/seeker/saved-jobs">
                  <Bookmark className="h-4 w-4 mr-2" />
                  View Saved Jobs
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border border-gray-200">
          <CardHeader className="bg-gradient-to-r from-brand-teal to-brand-teal-light text-white rounded-t-lg">
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Get Started</span>
            </CardTitle>
            <CardDescription className="text-white/90">
              Complete these steps to maximize your job search success
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-brand-teal transition-colors">
                <div>
                  <p className="font-medium text-gray-900">Complete your profile</p>
                  <p className="text-sm text-gray-600">Add your skills and experience</p>
                </div>
                <Button asChild size="sm" className="bg-brand-coral hover:bg-brand-coral/90">
                  <Link href="/seeker/profile">Complete</Link>
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-brand-teal transition-colors">
                <div>
                  <p className="font-medium text-gray-900">Upload your resume</p>
                  <p className="text-sm text-gray-600">Make it easy for employers to find you</p>
                </div>
                <Button asChild size="sm" variant="outline" className="border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white">
                  <Link href="/seeker/profile">Upload</Link>
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-brand-teal transition-colors">
                <div>
                  <p className="font-medium text-gray-900">Choose a membership plan</p>
                  <p className="text-sm text-gray-600">Access premium job listings</p>
                </div>
                <Button asChild size="sm" variant="outline" className="border-brand-coral text-brand-coral hover:bg-brand-coral hover:text-white">
                  <Link href="/seeker/subscription">View Plans</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-gray-200">
          <CardHeader className="bg-gradient-to-r from-brand-coral to-brand-coral-light text-white rounded-t-lg">
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription className="text-white/90">
              Your latest job search activities
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {stats.recentActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-gray-400" />
                </div>
                <p className="font-medium text-gray-700">No recent activity</p>
                <p className="text-sm text-gray-500 mb-4">Start by browsing available jobs</p>
                <Button asChild className="bg-brand-teal hover:bg-brand-teal/90">
                  <Link href="/seeker/jobs">Browse Jobs</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0 mt-1">
                      {activity.companyName ? (
                        <CompanyLogo
                          companyLogoUrl={activity.companyLogoUrl}
                          companyName={activity.companyName}
                          size="sm"
                        />
                      ) : (
                        getStatusIcon(activity.status)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        {activity.jobId && (
                          <Link
                            href={`/seeker/jobs/${activity.jobId}`}
                            className="text-xs text-brand-teal hover:text-brand-teal/80 font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Job
                          </Link>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                      {activity.companyName && (
                        <p className="text-xs text-gray-500 mt-1">{activity.companyName}</p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-medium ${getStatusColor(activity.status)}`}>
                            {activity.status ? activity.status.charAt(0).toUpperCase() + activity.status.slice(1) : 'Unknown'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString() : 'Unknown date'}
                          </span>
                        </div>
                        {activity.isArchived && (
                          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-300">
                            📁 Archived
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {stats.recentActivities.length >= 10 && (
                  <div className="text-center pt-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href="/seeker/applications">View All Applications</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Featured Jobs Preview - COMMENTED OUT PER USER REQUEST */}
      {/*
      <Card className="shadow-sm border border-gray-200">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="text-gray-900">Featured Jobs</CardTitle>
          <CardDescription>
            Hand-picked opportunities that match your profile
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {stats.recommendedJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="w-16 h-16 bg-brand-teal-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="h-8 w-8 text-brand-teal" />
              </div>
              <p className="font-medium text-gray-700">No featured jobs available</p>
              <p className="text-sm text-gray-500 mb-4">Complete your profile to see personalized recommendations</p>
              <Button asChild className="bg-brand-teal hover:bg-brand-teal/90">
                <Link href="/seeker/jobs">View All Jobs</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.recommendedJobs.slice(0, 3).map((job) => (
                <JobCard
                  key={job.id}
                  job={transformJobToSearchItem(job)}
                  onSave={handleSaveJob}
                  isSaved={savedJobs.has(job.id)}
                />
              ))}
              {stats.recommendedJobs.length > 3 && (
                <div className="text-center pt-4">
                  <Button asChild className="bg-brand-teal hover:bg-brand-teal/90">
                    <Link href="/seeker/jobs">View All Recommended Jobs</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      */}
    </div>
  )
}
