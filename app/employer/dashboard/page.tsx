'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ApplicantProfilePicture } from '@/components/common/ApplicantProfilePicture'
import { ExclusivePlanModal } from '@/components/employer/ExclusivePlanModal'
import { getImpersonationSession } from '@/lib/admin-impersonation'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import Image from 'next/image'
import {
  Briefcase,
  FileText,
  Building2,
  TrendingUp,
  Users,
  Plus,
  Clock,
  User,
  UserCheck,
  RefreshCw,
  AlertCircle,
  Mail
} from 'lucide-react'

interface DashboardStats {
  activeJobs: number
  totalApplications: number
  jobCredits: number
  profileCompletion: number
  pendingJobs?: {
    total: number
    pending_vetting: number
    reviewing: number
    pending_payment: number
  }
  recentActivity: Array<{
    id: string
    type: string
    title: string
    description: string
    timestamp: string
    jobId: string
    jobTitle: string
    applicationId?: string | null
    applicantId?: string | null
    applicantName?: string | null
    applicantProfilePictureUrl?: string | null
  }>
  recentJobs: Array<{
    id: string
    title: string
    status: string
    applicationsCount: number
    createdAt: string
    isArchived?: boolean
    archivedAt?: string | null
  }>
}

export default function EmployerDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { profile: userProfile, isLoading: profileLoading } = useUserProfile()
  const { toast } = useToast()
  const isGettingStarted = stats && (stats.profileCompletion !== 100 || stats.activeJobs < 1)

  useEffect(() => {
    loadDashboardStats()

    // Set up automatic refresh every 30 seconds to keep data current
    const refreshInterval = setInterval(() => {
      console.log('🔄 FRONTEND: Auto-refreshing dashboard stats')
      loadDashboardStats(true)
    }, 30000)

    // Listen for focus events to refresh when user returns to tab
    const handleFocus = () => {
      console.log('👁️ FRONTEND: Tab focused, refreshing dashboard stats')
      loadDashboardStats(true)
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(refreshInterval)
      window.removeEventListener('focus', handleFocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadDashboardStats = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      const requestTime = new Date().toISOString()
      console.log('🔄 FRONTEND: Loading dashboard stats', {
        timestamp: requestTime,
        isRefresh,
        currentStats: stats ? 'exists' : 'null'
      })

      // Check for impersonation context only on client side
      const headers: HeadersInit = {
        // Add cache-busting headers to prevent browser caching
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }

      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          console.log('🎭 FRONTEND: Adding impersonation headers to dashboard stats request', {
            impersonatedUserId: impersonationSession.impersonatedUser.id,
            adminId: impersonationSession.adminId
          })
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }

      // Add timestamp to URL to prevent caching
      const url = `/api/employer/dashboard/stats?t=${Date.now()}`
      const response = await fetch(url, {
        headers,
        cache: 'no-store' // Prevent fetch API caching
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ FRONTEND: Dashboard stats loaded successfully', {
          timestamp: new Date().toISOString(),
          activeJobs: data.activeJobs,
          totalApplications: data.totalApplications,
          recentActivityCount: data.recentActivity?.length || 0,
          recentJobsCount: data.recentJobs?.length || 0
        })
        setStats(data)
        if (isRefresh) {
          toast({
            title: 'Dashboard updated',
            description: 'Latest stats pulled successfully.',
            duration: 2500
          })
        }
      } else {
        console.error('Failed to load dashboard stats', response.status, response.statusText)
        if (isRefresh) {
          toast({
            title: 'Refresh failed',
            description: 'Could not update dashboard. Please try again.',
            variant: 'destructive'
          })
        }
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
      if (isRefresh) {
        toast({
          title: 'Refresh failed',
          description: 'Could not update dashboard. Please try again.',
          variant: 'destructive'
        })
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // useEffect(() => {
  //   loadDashboardStats()

  //   // Only refresh when user returns to tab after being away (more reasonable approach)
  //   const handleFocus = () => {
  //     // Only refresh if user has been away for more than 5 minutes
  //     const lastLoadTime = localStorage.getItem('dashboardLastLoad')
  //     const now = Date.now()
  //     if (!lastLoadTime || now - parseInt(lastLoadTime) > 300000) { // 5 minutes
  //       console.log('👁️ FRONTEND: Tab focused after being away, refreshing dashboard stats')
  //       loadDashboardStats(true)
  //       localStorage.setItem('dashboardLastLoad', now.toString())
  //     }
  //   }

  //   window.addEventListener('focus', handleFocus)
  //   localStorage.setItem('dashboardLastLoad', Date.now().toString())

  //   return () => {
  //     window.removeEventListener('focus', handleFocus)
  //   }
  // }, [loadDashboardStats])

  if (isLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Exclusive Plan Modal - Shows for invited employers on first load */}
      <ExclusivePlanModal />

      {/* Header */}
      <div className="flex justify-between items-start bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center space-x-4">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            {userProfile?.presignedProfilePictureUrl ? (
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-brand-teal">
                <Image
                  src={userProfile.presignedProfilePictureUrl}
                  alt={userProfile.name || 'Profile'}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 bg-brand-teal-light rounded-full flex items-center justify-center border-2 border-brand-teal">
                <User className="h-8 w-8 text-brand-teal" />
              </div>
            )}
          </div>

          {/* Welcome Message */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome Back{userProfile?.name ? `, ${userProfile.name}` : ''}!
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your job postings and find the perfect remote talent.
            </p>
            {userProfile?.email && (
              <p className="text-sm text-gray-500 mt-1">
                {userProfile.email}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => loadDashboardStats(true)}
            disabled={isLoading || isRefreshing}
            className="border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button asChild className="bg-brand-coral hover:bg-brand-coral/90">
            <Link href="/employer/jobs/new">
              <Plus className="h-4 w-4 mr-2" />
              Post New Job
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Link href="/employer/jobs">
          <Card className="shadow-sm hover:shadow-md transition-shadow border border-gray-100 cursor-pointer hover:border-brand-teal h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Active Jobs</CardTitle>
              <div className="p-2 bg-brand-teal-light/50 rounded-lg">
                <Briefcase className="h-4 w-4 text-brand-teal" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats?.activeJobs || 0}</div>
              <p className="text-xs text-gray-500">
                Currently posted jobs
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/employer/jobs?pendingJobs=true">
          <Card className={`shadow-sm hover:shadow-md transition-shadow border cursor-pointer h-full ${(stats?.pendingJobs?.total || 0) > 0 ? 'border-orange-200 hover:border-orange-400' : 'border-gray-100 hover:border-gray-300'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Pending Jobs</CardTitle>
              <div className={`p-2 rounded-lg ${(stats?.pendingJobs?.total || 0) > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                <AlertCircle className={`h-4 w-4 ${(stats?.pendingJobs?.total || 0) > 0 ? 'text-orange-600' : 'text-gray-600'}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats?.pendingJobs?.total || 0}</div>
              <div className="space-y-1 mt-2 text-xs text-gray-500">
                {stats?.pendingJobs && (
                  <>
                    {stats.pendingJobs.pending_payment > 0 && <p>Pending payment: {stats.pendingJobs.pending_payment}</p>}
                    {stats.pendingJobs.pending_vetting > 0 && <p>Pending review: {stats.pendingJobs.pending_vetting}</p>}
                  </>
                )}
                {(!stats?.pendingJobs?.total || stats.pendingJobs.total === 0) && <p>No pending jobs</p>}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/employer/applications">
          <Card className="shadow-sm hover:shadow-md transition-shadow border border-gray-100 cursor-pointer hover:border-brand-coral h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Applications</CardTitle>
              <div className="p-2 bg-brand-coral-light/50 rounded-lg">
                <FileText className="h-4 w-4 text-brand-coral" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats?.totalApplications || 0}</div>
              <p className="text-xs text-gray-500">
                Total applications received
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* <Card className="shadow-sm hover:shadow-md transition-shadow border border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Job Credits</CardTitle>
            <div className="p-2 bg-brand-teal-light/50 rounded-lg">
              <CreditCard className="h-4 w-4 text-brand-teal" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.jobCredits || 0}</div>
            <p className="text-xs text-gray-500">
              Remaining job postings
            </p>
          </CardContent>
        </Card> */}

        <Link href="/employer/company-profile">
          <Card className="shadow-sm hover:shadow-md transition-shadow border border-gray-100 cursor-pointer hover:border-brand-coral h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Profile</CardTitle>
              <div className="p-2 bg-brand-coral-light/50 rounded-lg">
                <Building2 className="h-4 w-4 text-brand-coral" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats?.profileCompletion || 0}%</div>
              <p className="text-xs text-gray-500">
                Company profile completion
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/employer/billing?tab=packages&section=concierge">
          <Card className="shadow-sm hover:shadow-md transition-shadow border border-gray-100 cursor-pointer hover:border-brand-teal h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Concierge</CardTitle>
              <div className="p-2 bg-brand-teal-light/50 rounded-lg">
                <UserCheck className="h-4 w-4 text-brand-teal" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">Available</div>
              <p className="text-xs text-gray-500">
                Premium screening service
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isGettingStarted && (
          <Card className="shadow-sm border border-gray-100">
            <CardHeader className="bg-gradient-to-r from-brand-teal to-brand-teal-light text-white rounded-t-lg">
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Get Started</span>
              </CardTitle>
              <CardDescription className="text-white/90">
                Complete these steps to start hiring top remote talent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-4">
                {(stats?.profileCompletion || 0) < 100 && (
                  <div className="flex items-center justify-between p-5 border border-gray-200 rounded-lg hover:border-brand-teal hover:shadow-sm transition-all bg-gray-50/50">
                    <div>
                      <p className="font-semibold text-gray-900">Complete company profile</p>
                      <p className="text-sm text-gray-600 mt-1">Add your company details and logo</p>
                    </div>
                    <Button asChild size="sm" className="bg-brand-coral hover:bg-brand-coral/90 text-white shadow-sm">
                      <Link href="/employer/profile">Complete</Link>
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between p-5 border border-gray-200 rounded-lg hover:border-brand-teal hover:shadow-sm transition-all bg-gray-50/50">
                  <div>
                    <p className="font-semibold text-gray-900">{(stats?.activeJobs || 0) > 0 ? 'Post another job' : 'Post your first job'}</p>
                    <p className="text-sm text-gray-600 mt-1">Create a job listing to attract candidates</p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="border-brand-coral text-brand-coral hover:bg-brand-coral hover:text-white shadow-sm">
                    <Link href="/employer/jobs/new">Post Job</Link>
                  </Button>
                </div>

                <div className="flex items-center justify-between p-5 border border-gray-200 rounded-lg hover:border-brand-teal hover:shadow-sm transition-all bg-gray-50/50">
                  <div>
                    <p className="font-semibold text-gray-900">Concierge Hiring Services</p>
                    <p className="text-sm text-gray-600 mt-1">We handle the heavy lifting; you handle the interviews</p>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="border-brand-coral text-brand-coral hover:bg-brand-coral hover:text-white shadow-sm"
                  >
                    <Link href="/employer/billing?tab=packages&section=concierge&highlight=concierge_level_1">Let's Get Hiring</Link>
                  </Button>
                </div>

                <div className="flex items-center justify-between p-5 border border-gray-200 rounded-lg hover:border-brand-teal hover:shadow-sm transition-all bg-gray-50/50">
                  <div className="max-w-xl pr-4">
                    <p className="font-semibold text-gray-900">Get Your Job Seen Fast - Straight to Their Inbox.</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Send a Solo Email Blast to our database of job seekers and put your job front and center.
                    </p>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="border-brand-coral text-brand-coral hover:bg-brand-coral hover:text-white shadow-sm"
                  >
                    <Link href="/employer/billing?tab=packages&highlight=email_blast">Promote My Job</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>)}

        <Card className={`shadow-sm border border-gray-100 ${!isGettingStarted ? 'lg:col-span-2' : ''}`}>
          <CardHeader className="bg-gradient-to-r from-brand-coral to-brand-coral-light text-white rounded-t-lg">
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription className="text-white/90">
              Your latest hiring activities
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    {/* Profile Picture or Icon */}
                    {activity.type === 'email_blast' ? (
                      <div className="p-2 rounded-full bg-orange-100 text-orange-600">
                        <Mail className="h-5 w-5" />
                      </div>
                    ) : (
                      <ApplicantProfilePicture
                        applicantId={activity.applicantId ?? ''}
                        applicantName={activity.applicantName ?? ''}
                        profilePictureUrl={activity.applicantProfilePictureUrl ?? null}
                        size="md"
                      />
                    )}

                    {/* Activity Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* View Button */}
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={
                          activity.type === 'email_blast'
                            ? `/employer/jobs/${activity.jobId}`
                            : `/employer/applications?applicationId=${activity.applicationId}`
                        }
                      >
                        {activity.type === 'email_blast' ? 'View Job' : 'View'}
                      </Link>
                    </Button>
                  </div>
                ))}
                <div className="pt-2 border-t">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/employer/applications">View All Activity</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="w-20 h-20 bg-brand-coral-light rounded-full flex items-center justify-center mx-auto mb-6">
                  <Clock className="h-10 w-10 text-brand-coral" />
                </div>
                <p className="font-semibold text-gray-700 text-lg mb-2">No recent activity</p>
                <p className="text-sm text-gray-500 mb-6">Start by posting your first job</p>
                <Button asChild className="bg-brand-teal hover:bg-brand-teal/90 text-white shadow-sm">
                  <Link href="/employer/jobs/new">Post Job</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Job Management */}
      <Card className="shadow-sm border border-gray-100">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="text-gray-900">Your Job Postings</CardTitle>
          <CardDescription>
            Manage your job listings including active, draft, and archived jobs
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {stats?.recentJobs && stats.recentJobs.length > 0 ? (
            <div className="space-y-4">
              {stats.recentJobs.map((job) => (
                <div key={job.id} className={`p-4 border rounded-lg hover:shadow-sm transition-all ${job.status === 'rejected' ? 'border-red-200 bg-red-50/30' : job.status === 'pending_payment' ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200 hover:border-brand-teal'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{job.title}</h4>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${job.isArchived ? 'bg-gray-100 text-gray-800' :
                          job.status === 'approved' ? 'bg-green-100 text-green-800' :
                            job.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                              job.status === 'expired' ? 'bg-red-100 text-red-800' :
                                job.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  job.status === 'pending_vetting' ? 'bg-yellow-100 text-yellow-800' :
                                    job.status === 'pending_payment' ? 'bg-orange-100 text-orange-800' :
                                      'bg-gray-100 text-gray-800'
                          }`}>
                          {job.isArchived ? 'Archived' :
                            job.status === 'pending_vetting' ? 'Pending Review' :
                              job.status === 'pending_payment' ? 'Pending Payment' :
                                job.status === 'approved' ? 'Active' :
                                  job.status ? job.status.charAt(0).toUpperCase() + job.status.slice(1) : 'Unknown'}
                        </span>
                        <span>{job.applicationsCount} applications</span>
                        <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                      </div>
                      {job.status === 'rejected' && (job as any).rejectionReason && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-sm text-red-800">
                            <strong>Feedback:</strong> {(job as any).rejectionReason}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {job.status === 'pending_payment' ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            // Extract the actual pending job ID (remove 'pending_' prefix if present)
                            const pendingJobId = job.id.startsWith("pending_")
                              ? job.id.replace("pending_", "")
                              : job.id;
                            router.push(
                              `/employer/jobs/new?pendingJobId=${pendingJobId}&step=2`
                            );
                          }}
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          Complete Payment
                        </Button>
                      ) : (
                        <>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/employer/jobs/${job.id}/applications`}>
                              <Users className="h-4 w-4 mr-1" />
                              Applications
                            </Link>
                          </Button>
                          {job.status === 'rejected' ? (
                            <Button asChild variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-50">
                              <Link href={`/employer/jobs/${job.id}/edit`}>
                                Edit & Resubmit
                              </Link>
                            </Button>
                          ) : (
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/employer/jobs/${job.id}/edit`}>
                                Edit
                              </Link>
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t flex justify-between items-center">
                <Button asChild variant="outline">
                  <Link href="/employer/jobs?defaultTab=all">View All Jobs</Link>
                </Button>
                <Button asChild className="bg-brand-coral hover:bg-brand-coral/90 text-white shadow-sm">
                  <Link href="/employer/jobs/new">Post New Job</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="w-20 h-20 bg-brand-teal-light rounded-full flex items-center justify-center mx-auto mb-6">
                <Briefcase className="h-10 w-10 text-brand-teal" />
              </div>
              <p className="font-semibold text-gray-700 text-lg mb-2">No job postings yet</p>
              <p className="text-sm text-gray-500 mb-6">Create your first job posting to start receiving applications</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button asChild className="bg-brand-coral hover:bg-brand-coral/90 text-white shadow-sm">
                  <Link href="/employer/jobs/new">Post Your First Job</Link>
                </Button>
                <Button asChild variant="outline" className="border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white shadow-sm">
                  <Link href="/employer/billing">Buy Job Credits</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Concierge Service */}
      <Card className="shadow-sm border border-gray-100">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center space-x-2 text-gray-900">
            <Users className="h-5 w-5 text-brand-teal" />
            <span>Concierge Service</span>
          </CardTitle>
          <CardDescription>
            Let our team pre-screen candidates for you
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border border-brand-teal/30 rounded-lg bg-gradient-to-r from-brand-teal-light/50 to-white shadow-sm">
            <div className="mb-4 sm:mb-0">
              <p className="font-semibold text-gray-900 text-lg mb-2">Premium Candidate Screening</p>
              <p className="text-sm text-gray-600 max-w-md">
                Our experts will review applications and provide you with the top 3-5 candidates
              </p>
            </div>
            <Button asChild variant="outline" className="border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white shadow-sm flex-shrink-0">
              <Link href="/concierge">Learn More</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
