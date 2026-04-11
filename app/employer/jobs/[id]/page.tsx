'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getImpersonationSession } from '@/lib/admin-impersonation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { CompanyLogo } from '@/components/common/CompanyLogo'
import { getCategoryLabel, getJobTypeLabel } from '@/lib/job-constants'
import {
  ArrowLeft,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  Users,
  Eye,
  Edit,
  Briefcase,
  GraduationCap,
  Building,
  Mail,
  ExternalLink,
  Image,
  MessageCircle,
  User,
  CheckCircle,
  AlertCircle,
  Clock3,
  Pause,
  AlertTriangle
} from 'lucide-react'

interface JobDetail {
  id: string
  title: string
  description: string
  requirements?: string
  category: string
  payRangeMin: number
  payRangeMax: number
  payRangeText?: string
  salaryType?: string
  type: string
  experienceLevel?: string
  applicationDeadline?: string
  skillsRequired: string[]
  benefits?: string
  isFlexibleHours: boolean
  hoursPerWeek?: number
  remoteSchedule?: string
  locationText?: string
  status: string
  viewsCount: number
  createdAt: string
  updatedAt: string
  expiresAt?: string
  approvedAt?: string
  applicationsCount: number
  isEmailBlast?: boolean
  emailBlastInfo?: {
    isEmailBlast: boolean
    status: string
    requestedAt?: string
    completedAt?: string
    expiresAt?: string
    packageType: string
    hasContent?: boolean
    content?: string
    logoUrl?: string
    customLink?: string
    useJobLink?: boolean
  }
  conciergeRequested?: boolean
  conciergeStatus?: string
  chatEnabled?: boolean
  chatEnabledAt?: string
  conciergeInfo?: {
    isConciergeRequested: boolean
    status: string
    assignedAdminId?: string
    requestedAt: string
    updatedAt: string
    discoveryCallNotes?: string
    optimizedJobDescription?: string
    shortlistedCandidates?: any
    chatEnabled: boolean
  }
  employer: {
    companyName: string
    companyWebsite?: string
    companyLogoUrl?: string
    companyDescription?: string
  }
  // Pause fields
  isPaused?: boolean
  pausedAt?: string
  pausedBy?: string
  pausedDaysRemaining?: number
}

export default function JobDetailPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const [job, setJob] = useState<JobDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (jobId) {
      loadJobDetail()
    }
  }, [jobId])

  const loadJobDetail = async () => {
    try {
      console.log('Loading job detail for:', jobId)

      // Check for impersonation context only on client side
      const headers: HeadersInit = {}

      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }

      const response = await fetch(`/api/employer/jobs/${jobId}`, { headers })
      if (response.ok) {
        const data = await response.json()
        setJob(data.job)
      } else if (response.status === 404) {
        setError('Job not found')
      } else {
        setError('Failed to load job details')
      }
    } catch (error) {
      console.error('Error loading job detail:', error)
      setError('Failed to load job details')
    } finally {
      setIsLoading(false)
    }
  }

  const formatSalary = (min?: number, max?: number, text?: string) => {
    if (text) return text
    if (!min || !max) return 'Salary not specified'

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    })

    return `${formatter.format(min)} - ${formatter.format(max)}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'pending_vetting': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'expired': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getJobTypeDisplay = (type: string) => {
    switch (type) {
      case 'full_time': return 'Full-time'
      case 'part_time': return 'Part-time'
      case 'project': return 'Project-based'
      default: return type
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Job Not Found'}
          </h1>
          <Button onClick={() => router.push('/employer/jobs')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/employer/jobs')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/employer/jobs/${job.id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Job
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/employer/jobs/${job.id}/applications`)}
          >
            <Users className="h-4 w-4 mr-2" />
            View Applications ({job.applicationsCount})
          </Button>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
              <Badge className={getStatusColor(job.status)}>
                {job.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center space-x-4 text-gray-600">
              <span className="flex items-center">
                <Building className="h-4 w-4 mr-1" />
                {job.employer.companyName}
              </span>
              {job.locationText && (
                <span className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {job.locationText}
                </span>
              )}
              <span className="flex items-center">
                <Eye className="h-4 w-4 mr-1" />
                {job.viewsCount} views
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Job Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Job Type</div>
                  <div className="font-medium">{getJobTypeDisplay(job.type)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Category</div>
                  <div className="font-medium">{getCategoryLabel(job.category)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Salary</div>
                  <div className="font-medium">
                    {formatSalary(job.payRangeMin, job.payRangeMax, job.payRangeText)}
                    {job.salaryType && job.payRangeText !== 'Commission Only' && ` (${job.salaryType})`}
                  </div>
                </div>
                {job.experienceLevel && (
                  <div>
                    <div className="text-sm text-gray-600">Experience Level</div>
                    <div className="font-medium">{job.experienceLevel}</div>
                  </div>
                )}
                {job.hoursPerWeek && (
                  <div>
                    <div className="text-sm text-gray-600">Hours/Week</div>
                    <div className="font-medium">{job.hoursPerWeek} hours</div>
                  </div>
                )}
              </div>

              {job.isFlexibleHours && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Flexible hours available</span>
                </div>
              )}

              {job.remoteSchedule && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Remote Schedule</div>
                  <div className="text-sm">{job.remoteSchedule}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Job Description */}
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: job.description.replace(/\n/g, '<br>') }} />
              </div>
            </CardContent>
          </Card>

          {/* Requirements */}
          {job.requirements && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: job.requirements.replace(/\n/g, '<br>') }} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Required Skills */}
          {job.skillsRequired.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Required Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {job.skillsRequired.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Benefits */}
          {job.benefits && (
            <Card>
              <CardHeader>
                <CardTitle>Benefits & Perks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: job.benefits.replace(/\n/g, '<br>') }} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Email Blast Section */}
          {job.emailBlastInfo?.isEmailBlast && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-5 w-5" />
                    <CardTitle>Email Blast Details</CardTitle>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={
                      job.emailBlastInfo.status === 'completed' ? 'bg-green-100 text-green-800' :
                        job.emailBlastInfo.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                          job.emailBlastInfo.hasContent ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                    }>
                      {job.emailBlastInfo.status === 'completed' ? 'Email Sent' :
                        job.emailBlastInfo.status === 'pending' ? 'In Progress' :
                          job.emailBlastInfo.hasContent ? 'Email Blast Queued' :
                            'Missing Email Content'}
                    </Badge>
                    {(job.emailBlastInfo.status === 'not_started' || !job.emailBlastInfo.hasContent) && (
                      <Button
                        size="sm"
                        onClick={() => router.push(`/employer/jobs/${job.id}/email-blast`)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {job.emailBlastInfo.hasContent ? 'Edit Content' : 'Add Content'}
                      </Button>
                    )}
                  </div>
                </div>
                <CardDescription>
                  This job will be sent as an email blast to our candidate database
                  {job.emailBlastInfo.completedAt && ` (sent on ${new Date(job.emailBlastInfo.completedAt).toLocaleDateString()})`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.emailBlastInfo.hasContent ? (
                  <>
                    {/* Email Content Preview */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Email Content</h4>
                      <div className="bg-gray-50 border rounded-lg p-4">
                        <div className="prose max-w-none text-sm">
                          <div dangerouslySetInnerHTML={{
                            __html: (job.emailBlastInfo.content || '').replace(/\n/g, '<br>')
                          }} />
                        </div>
                      </div>
                    </div>

                    {/* Logo Information */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Company Logo</h4>
                      <div className="flex items-center space-x-3">
                        {job.emailBlastInfo.logoUrl ? (
                          <>
                            <CompanyLogo
                              companyLogoUrl={job.emailBlastInfo.logoUrl}
                              companyName={job.employer.companyName}
                              size="sm"
                            />
                            <span className="text-sm text-gray-600">Custom logo uploaded</span>
                          </>
                        ) : (
                          <>
                            <CompanyLogo
                              companyLogoUrl={job.employer.companyLogoUrl}
                              companyName={job.employer.companyName}
                              size="sm"
                            />
                            <span className="text-sm text-gray-600">Using company profile logo</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Link Information */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Link Destination</h4>
                      <div className="flex items-center space-x-2">
                        {job.emailBlastInfo.useJobLink ? (
                          <>
                            <ExternalLink className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-gray-600">
                              Links to this job posting on AmperTalent
                            </span>
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-4 w-4 text-blue-600" />
                            <a
                              href={job.emailBlastInfo.customLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {job.emailBlastInfo.customLink}
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Email Content Required</h3>
                    <p className="text-gray-600 mb-4">
                      You need to provide email content, logo, and link details before this job can be sent to candidates.
                    </p>
                    <Button
                      onClick={() => router.push(`/employer/jobs/${job.id}/email-blast`)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Add Email Content
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Concierge Section */}
          {job.conciergeRequested && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-5 w-5" />
                    <CardTitle>Concierge Service</CardTitle>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={
                      job.conciergeStatus === 'completed' ? 'bg-green-100 text-green-800' :
                        job.conciergeStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          ['discovery_call', 'job_optimization', 'candidate_screening', 'interviews'].includes(job.conciergeStatus || '') ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                    }>
                      {job.conciergeStatus === 'completed' ? 'Service Completed' :
                        job.conciergeStatus === 'pending' ? 'Service Requested' :
                          job.conciergeStatus === 'discovery_call' ? 'Discovery Call Scheduled' :
                            job.conciergeStatus === 'job_optimization' ? 'Optimizing Job Post' :
                              job.conciergeStatus === 'candidate_screening' ? 'Screening Candidates' :
                                job.conciergeStatus === 'interviews' ? 'Coordinating Interviews' :
                                  'Service Active'}
                    </Badge>
                    {job.chatEnabled && (
                      <Button
                        size="sm"
                        onClick={() => router.push(`/employer/concierge/${job.id}`)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Open Chat
                      </Button>
                    )}
                  </div>
                </div>
                <CardDescription>
                  Professional hiring assistance with dedicated concierge support
                  {job.conciergeInfo?.requestedAt && ` (requested on ${new Date(job.conciergeInfo.requestedAt).toLocaleDateString()})`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.conciergeInfo ? (
                  <>
                    {/* Service Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Service Status
                        </h4>
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center space-x-2 mb-1">
                            {job.conciergeStatus === 'completed' ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <Clock3 className="h-3 w-3 text-blue-600" />
                            )}
                            <span>
                              {job.conciergeStatus === 'completed' ? 'Service completed successfully' :
                                job.conciergeStatus === 'pending' ? 'Service request received - admin will contact you soon' :
                                  job.conciergeStatus === 'discovery_call' ? 'Discovery call in progress' :
                                    job.conciergeStatus === 'job_optimization' ? 'Optimizing your job posting for maximum impact' :
                                      job.conciergeStatus === 'candidate_screening' ? 'Reviewing and screening potential candidates' :
                                        job.conciergeStatus === 'interviews' ? 'Coordinating interviews with top candidates' :
                                          'Service is active'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {job.conciergeInfo.assignedAdminId && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            Assigned Concierge
                          </h4>
                          <div className="text-sm text-gray-600">
                            Your dedicated hiring specialist is assigned and working on your request
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Discovery Call Notes */}
                    {job.conciergeInfo.discoveryCallNotes && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Discovery Call Notes</h4>
                        <div className="bg-gray-50 border rounded-lg p-3">
                          <div className="text-sm text-gray-700">
                            <div dangerouslySetInnerHTML={{
                              __html: job.conciergeInfo.discoveryCallNotes.replace(/\n/g, '<br>')
                            }} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Optimized Job Description */}
                    {job.conciergeInfo.optimizedJobDescription && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Optimized Job Description</h4>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-sm text-gray-700">
                            <div dangerouslySetInnerHTML={{
                              __html: job.conciergeInfo.optimizedJobDescription.replace(/\n/g, '<br>')
                            }} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Shortlisted Candidates */}
                    {job.conciergeInfo.shortlistedCandidates && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Shortlisted Candidates</h4>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-sm text-gray-700">
                            {Array.isArray(job.conciergeInfo.shortlistedCandidates)
                              ? `${job.conciergeInfo.shortlistedCandidates.length} candidate${job.conciergeInfo.shortlistedCandidates.length === 1 ? '' : 's'} shortlisted for your review`
                              : 'Candidate shortlist is being prepared'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Chat Section */}
                    {job.chatEnabled ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-blue-900">Chat with Your Concierge Team</h4>
                            <p className="text-sm text-blue-700 mt-1">
                              Direct communication with your hiring specialists
                              {job.chatEnabledAt && ` (enabled ${new Date(job.chatEnabledAt).toLocaleDateString()})`}
                            </p>
                          </div>
                          <Button
                            onClick={() => router.push(`/employer/concierge/${job.id}`)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Open Chat
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                        <h4 className="font-medium text-gray-900">Chat Activation Pending</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Your concierge chat will be activated once your service begins
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <MessageCircle className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900">Concierge Service Requested</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Your concierge request is being processed. You'll be contacted soon to begin the service.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle>About the Company</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <CompanyLogo
                  companyLogoUrl={job.employer.companyLogoUrl}
                  companyName={job.employer.companyName}
                  size="md"
                />
                <div>
                  <div className="font-medium">{job.employer.companyName}</div>
                  {job.employer.companyWebsite && (
                    <a
                      href={job.employer.companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Visit website
                    </a>
                  )}
                </div>
              </div>

              {job.employer.companyDescription && (
                <div
                  className="text-sm text-gray-600 whitespace-pre-line"
                  dangerouslySetInnerHTML={{
                    __html: job.employer.companyDescription.replace(/\n/g, '<br>'),
                  }}
                />
              )}
            </CardContent>
          </Card>

          {/* Job Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Job Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Applications</span>
                <span className="font-medium">{job.applicationsCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Views</span>
                <span className="font-medium">{job.viewsCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Posted</span>
                <span className="font-medium">{new Date(job.createdAt).toLocaleDateString()}</span>
              </div>
              {job.expiresAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Expires</span>
                  <span className="font-medium">{new Date(job.expiresAt).toLocaleDateString()}</span>
                </div>
              )}
              {job.applicationDeadline && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Application Deadline</span>
                  <span className="font-medium">{new Date(job.applicationDeadline).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Pause Alert */}
          {job.isPaused && (
            <Card className="bg-amber-50 border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center text-amber-900">
                  <Pause className="h-5 w-5 mr-2" />
                  Job Paused by Admin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-900">
                    <p className="font-medium mb-2">This job has been temporarily paused by an administrator.</p>
                    <p className="mb-2">While paused:</p>
                    <ul className="list-disc list-inside space-y-1 text-amber-800 mb-3">
                      <li>The job is not visible to job seekers</li>
                      <li>You cannot edit or manage this job</li>
                      <li>Applications are not being accepted</li>
                    </ul>
                    {job.pausedDaysRemaining && (
                      <p className="mb-2">
                        <strong>Days preserved:</strong> {job.pausedDaysRemaining} {job.pausedDaysRemaining === 1 ? 'day' : 'days'}
                      </p>
                    )}
                    <p className="text-amber-900">
                      For questions or concerns, please contact our support team at{' '}
                      <a
                        href="mailto:contact@hiremymom.com"
                        className="font-medium underline hover:text-amber-700"
                      >
                        contact@hiremymom.com
                      </a>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
