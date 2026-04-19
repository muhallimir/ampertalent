'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AdvancedJobSearch from '@/components/seeker/AdvancedJobSearch'
import { JobSearchItem } from '@/lib/search'
import { JobCard } from '@/components/seeker/JobCard'
import { FeaturedJobCard } from '@/components/seeker/FeaturedJobCard'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { getImpersonationSession } from '@/lib/admin-impersonation'
import { useSavedJobs } from '@/components/providers/SavedJobsProvider'
import {
  Briefcase,
  CheckCircle,
  Clock,
  Eye,
  Calendar,
  TrendingUp,
  Star,
} from 'lucide-react'

interface ApplicationStatus {
  jobId: string
  jobTitle: string
  companyName: string
  status: 'pending' | 'reviewed' | 'interview' | 'rejected' | 'hired'
  appliedAt: string
  job?: JobSearchItem & { isArchived?: boolean; archivedAt?: string | null }
}

interface FeaturedJob {
  id: string
  title: string
  company: string
  companyLogo?: string
  companyWebsite?: string
  location: string
  type: string
  experienceLevel?: string
  salaryMin?: number
  salaryMax?: number
  salaryText?: string
  salaryType?: string
  description: string
  skills: string[]
  benefits?: string
  requirements?: string
  applicationCount: number
  viewsCount: number
  createdAt: string
  expiresAt?: string
  category: string
  isFeatured: boolean
  isEmailBlast: boolean
  featuredType: 'featured' | 'email_blast' | null
  emailBlastExpiresAt?: string
}

export default function JobsPage() {
  const [myApplications, setMyApplications] = useState<ApplicationStatus[]>([])
  const [recentlyFilledJobs, setRecentlyFilledJobs] = useState<JobSearchItem[]>([])
  const [featuredJobs, setFeaturedJobs] = useState<FeaturedJob[]>([])
  const [isLoadingApplications, setIsLoadingApplications] = useState(true)
  const [isLoadingFilledJobs, setIsLoadingFilledJobs] = useState(false)
  const [isLoadingFeaturedJobs, setIsLoadingFeaturedJobs] = useState(true)
  const [showFilledJobs, setShowFilledJobs] = useState(false)
  const [activeTab, setActiveTab] = useState('available')
  const [savingJobIds, setSavingJobIds] = useState<Set<string>>(new Set())

  // Use shared saved jobs context
  const { savedJobs, toggleSaveJob } = useSavedJobs()

  const handleJobSelect = useCallback((job: JobSearchItem) => {
    // Navigate to job details page
    window.open(`/seeker/jobs/${job.id}`, '_blank')
  }, [])

  // Handle saving/unsaving jobs using shared context
  const handleSaveJob = useCallback(async (jobId: string) => {
    if (savingJobIds.has(jobId)) return
    setSavingJobIds((prev) => {
      const next = new Set(prev)
      next.add(jobId)
      return next
    })

    try {
      await toggleSaveJob(jobId)
    } catch (error) {
      console.error('Error saving/unsaving job:', error)
    } finally {
      setSavingJobIds((prev) => {
        const next = new Set(prev)
        next.delete(jobId)
        return next
      })
    }
  }, [savingJobIds, toggleSaveJob])

  // Load user's applications and saved jobs in parallel
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Check for impersonation context only on client side
        const headers: HeadersInit = {}

        if (typeof window !== 'undefined') {
          const impersonationSession = getImpersonationSession()
          if (impersonationSession) {
            console.log('🎭 FRONTEND: Adding impersonation headers to initial data request', {
              impersonatedUserId: impersonationSession.impersonatedUser.id,
              adminId: impersonationSession.adminId
            })
            headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
            headers['x-admin-user-id'] = impersonationSession.adminId
          }
        }

        // Load applications and featured jobs in parallel (saved jobs handled by provider)
        const [applicationsRes, featuredJobsRes] = await Promise.all([
          fetch('/api/seeker/applications', {
            headers,
            next: { revalidate: 60 } // Cache for 60 seconds
          }),
          fetch('/api/jobs/featured?limit=5', {
            next: { revalidate: 300 } // Cache for 5 minutes
          })
        ])

        // Process applications
        if (applicationsRes.ok) {
          const data = await applicationsRes.json()
          const mappedApplications = (data.applications || [])?.map((app: any) => ({
            jobId: app.job.id,
            jobTitle: app.job.title,
            companyName: app.job.company,
            status: app.status,
            appliedAt: app.appliedAt,
            job: app.job
          }))
          setMyApplications(mappedApplications)
        }

        // Process featured jobs
        if (featuredJobsRes.ok) {
          const data = await featuredJobsRes.json()
          setFeaturedJobs(data.jobs || [])
        }
      } catch (error) {
        console.error('Error loading initial data:', error)
      } finally {
        setIsLoadingApplications(false)
        setIsLoadingFeaturedJobs(false)
      }
    }

    loadInitialData()
  }, [])

  // Load recently filled jobs
  const loadRecentlyFilledJobs = useCallback(async () => {
    setIsLoadingFilledJobs(true)
    try {
      // Check for impersonation context only on client side
      const headers: HeadersInit = {}

      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          console.log('🎭 FRONTEND: Adding impersonation headers to recently filled jobs request', {
            impersonatedUserId: impersonationSession.impersonatedUser.id,
            adminId: impersonationSession.adminId
          })
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }

      const response = await fetch('/api/jobs/recently-filled', { headers })
      if (response.ok) {
        const data = await response.json()
        setRecentlyFilledJobs(data.jobs || [])
      }
    } catch (error) {
      console.error('Error loading recently filled jobs:', error)
    } finally {
      setIsLoadingFilledJobs(false)
    }
  }, [])

  const handleShowFilledJobs = useCallback(() => {
    if (!showFilledJobs) {
      loadRecentlyFilledJobs()
      setActiveTab('filled') // Switch to filled jobs tab
    }
    setShowFilledJobs(!showFilledJobs)
  }, [showFilledJobs, loadRecentlyFilledJobs])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'reviewed': return 'bg-blue-100 text-blue-800'
      case 'interview': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'hired': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'reviewed': return <Eye className="h-4 w-4" />
      case 'interview': return <Calendar className="h-4 w-4" />
      case 'rejected': return <Clock className="h-4 w-4" />
      case 'hired': return <CheckCircle className="h-4 w-4" />
      default: return <Briefcase className="h-4 w-4" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'pending'
      case 'reviewed':
        return 'Reviewed'
      case 'interview':
        return 'Interview'
      case 'rejected':
        return 'Not Selected'
      case 'hired':
        return 'Hired'
      default:
        return status
    }
  }

  console.log({ myApplications })

  // Memoize active applications to avoid recalculating on every render
  const activeApplications = useMemo(() =>
    myApplications.filter(app =>
      app.status === 'pending' || app.status === 'reviewed' || app.status === 'interview' || app.status === 'hired'
    ), [myApplications]
  )

  console.log({ activeApplications })

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Perfect Job</h1>
        <p className="text-gray-600">
          Discover remote opportunities that fit your lifestyle and skills
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar - My Applications */}
        <div className="lg:col-span-1">
          <div className="space-y-6 sticky top-8">
            {/* My Active Applications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Briefcase className="h-5 w-5 mr-2" />
                  My Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingApplications ? (
                  <div className="flex justify-center py-4">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : activeApplications.length === 0 ? (
                  <p className="text-gray-500 text-sm">No active applications</p>
                ) : (
                  <div className="space-y-3">
                    {activeApplications?.slice(0, 5)?.map((application) => (
                      <div
                        key={application.jobId}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => window.open(`/seeker/jobs/${application.jobId}`, '_blank')}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm truncate">{application.jobTitle}</h4>
                          <div className="flex flex-col items-end space-y-1">
                            <Badge className={`${getStatusColor(application.status)} text-xs`}>
                              {getStatusIcon(application.status)}
                              <span className="ml-1">{getStatusText(application.status)}</span>
                            </Badge>
                            {application.job?.isArchived && (
                              <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-300">
                                📁 Archived
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{application.companyName}</p>
                        <p className="text-xs text-gray-500">
                          Applied {new Date(application.appliedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                    {activeApplications.length > 5 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open('/seeker/applications', '_blank')}
                      >
                        View All Applications
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recently Filled Jobs Toggle */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Market Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant={showFilledJobs ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                  onClick={handleShowFilledJobs}
                  disabled={isLoadingFilledJobs}
                >
                  {isLoadingFilledJobs ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      {showFilledJobs ? 'Hide' : 'Show'} Recently Filled Jobs
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  See what positions were filled in the last 30 days
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="space-y-8">
            {/* Featured Jobs Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Star className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Featured Jobs</h2>
                    <p className="text-gray-600">High-priority opportunities from top employers actively hiring</p>
                  </div>
                </div>
                {featuredJobs.length > 0 && (
                  <Badge variant="outline" className="text-purple-600 border-purple-200">
                    {featuredJobs.length} Featured
                  </Badge>
                )}
              </div>

              {isLoadingFeaturedJobs ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : featuredJobs.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Star className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No featured jobs available</h3>
                    <p className="text-gray-600 text-center">
                      Check back later for high-priority opportunities from employers actively hiring.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {featuredJobs?.map((job) => {
                    // Check if user has applied to this job and get the status
                    const application = myApplications.find(app => app.jobId === job.id)
                    const hasApplied = !!application
                    const applicationStatus = application?.status

                    return (
                      <FeaturedJobCard
                        key={job.id}
                        job={job}
                        hasApplied={hasApplied}
                        applicationStatus={applicationStatus}
                        onSave={handleSaveJob}
                        isSaved={savedJobs.has(job.id)}
                        isSaving={savingJobIds.has(job.id)}
                        onJobSelect={(job) => {
                          // Convert FeaturedJob to JobSearchItem for compatibility
                          const jobSearchItem: JobSearchItem = {
                            id: job.id,
                            title: job.title,
                            company: job.company,
                            category: job.category,
                            type: job.type as 'full-time' | 'part-time' | 'project',
                            payRange: job.salaryMin && job.salaryMax ? {
                              min: job.salaryMin,
                              max: job.salaryMax,
                              text: job.salaryText || `$${job.salaryMin}-${job.salaryMax}`
                            } : undefined,
                            salaryType: job.salaryType,
                            location: job.location,
                            description: job.description,
                            skills: job.skills,
                            postedDate: job.createdAt,
                            expiresAt: job.expiresAt,
                            applicationCount: job.applicationCount,
                            isRemote: job.location.toLowerCase().includes('remote'),
                            isFlexible: true, // Assume featured jobs are flexible
                            isFeatured: job.isFeatured || job.isEmailBlast
                          }
                          handleJobSelect(jobSearchItem)
                        }}
                      />
                    )
                  })}
                </div>
              )}
            </div>

            {/* Regular Job Search Section */}
            {!showFilledJobs ? (
              /* Show default job search when tabs are hidden */
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Briefcase className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">All Available Jobs</h2>
                    <p className="text-gray-600">Browse and search through all job opportunities</p>
                  </div>
                </div>
                <AdvancedJobSearch onJobSelect={handleJobSelect} />
              </div>
            ) : (
              /* Show tabs when recently filled jobs are loaded */
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="available">Available Jobs</TabsTrigger>
                  <TabsTrigger value="filled">
                    Recently Filled ({recentlyFilledJobs.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="available">
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Briefcase className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">All Available Jobs</h2>
                        <p className="text-gray-600">Browse and search through all job opportunities</p>
                      </div>
                    </div>
                    <AdvancedJobSearch onJobSelect={handleJobSelect} />
                  </div>
                </TabsContent>

                <TabsContent value="filled">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Recently Filled Positions</CardTitle>
                        <p className="text-sm text-gray-600">
                          These positions were filled in the last 30 days. Use this data to understand market trends and salary expectations.
                        </p>
                      </CardHeader>
                    </Card>

                    {isLoadingFilledJobs ? (
                      <div className="flex justify-center py-12">
                        <LoadingSpinner size="lg" />
                      </div>
                    ) : recentlyFilledJobs.length === 0 ? (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <TrendingUp className="h-12 w-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium mb-2">No recently filled jobs</h3>
                          <p className="text-gray-600 text-center">
                            Check back later for market insights on recently filled positions.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {recentlyFilledJobs?.map((job) => (
                          <div key={job.id} className="relative">
                            <JobCard
                              job={job}
                              onJobSelect={handleJobSelect}
                            />
                            <div className="absolute top-4 right-4">
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Recently Filled
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
