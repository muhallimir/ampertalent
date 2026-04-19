'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { CompanyLogo } from '@/components/common/CompanyLogo'
import { ApplicationForm } from '@/components/seeker/ApplicationForm'
import { ShareJobButton } from '@/components/jobs/ShareJobButton'
import { getCategoryLabel } from '@/lib/job-constants'
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer'
import {
  MapPin,
  DollarSign,
  Clock,
  Building,
  Calendar,
  ArrowLeft,
  ExternalLink,
  Send,
  Bookmark,
  Globe,
  Target,
  Heart
} from 'lucide-react'

const getStatusTextColor = (status: string) => {
  switch (status) {
    case 'rejected': return 'text-red-600'
    default: return 'text-green-700'
  }
}

const formatStatusDisplay = (status: string): string => {
  switch (status) {
    case 'rejected': return 'Not Selected'
    case 'pending': return 'Pending'
    default: return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

interface Job {
  id: string
  title: string
  category: string
  type: string
  payRangeMin: number | null
  payRangeMax: number | null
  payRangeText: string | null
  salaryType: string | null
  description: string
  requirements: string | null
  skillsRequired: string[]
  benefits: string | null
  experienceLevel: string | null
  isFlexibleHours: boolean
  hoursPerWeek: number | null
  locationText: string | null
  applicationDeadline: string | null
  createdAt: string
  expiresAt: string | null
  isFilled?: boolean
  filledAt?: string | null
  isArchived?: boolean
  archivedAt?: string | null
  isExpired?: boolean
  isUnavailable?: boolean
  isCompanyPrivate?: boolean
  employer: {
    companyName: string
    companyLogoUrl: string | null
    companyWebsite: string | null
    companyDescription: string | null
    missionStatement: string | null
    coreValues: string | null
    employerId?: string
  }
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [applicationStatus, setApplicationStatus] = useState<{
    hasApplied: boolean
    application: any
  } | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [savingJob, setSavingJob] = useState(false)
  const [invitationMessage, setInvitationMessage] = useState<{
    message: string
    companyName: string
    invitedAt: string
  } | null>(null)

  useEffect(() => {
    const fetchJob = async () => {
      try {
        // Fetch job details with all additional data in a single request
        const response = await fetch(`/api/jobs/${params.id}?include=application-status,saved-status,notifications`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Job not found')
          } else {
            setError('Failed to load job details')
          }
          return
        }
        const jobData = await response.json()
        setJob(jobData)

        // Set additional data from the combined response
        if (jobData.applicationStatus) {
          setApplicationStatus(jobData.applicationStatus)
        }

        if (jobData.isSaved !== undefined) {
          setIsSaved(jobData.isSaved)
        }

        if (jobData.invitationMessage) {
          setInvitationMessage(jobData.invitationMessage)
        }
      } catch (err) {
        setError('Failed to load job details')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchJob()
    }
  }, [params.id])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just posted'
    if (diffInHours < 24) return `${diffInHours}h ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`

    return date.toLocaleDateString()
  }

  const formatPayRange = (job: Job) => {
    const salaryTypeText = job.salaryType ? `/${job.salaryType.toLowerCase()}` : ''

    if (job.payRangeText) return job.payRangeText
    if (job.payRangeMin && job.payRangeMax) {
      return `$${job.payRangeMin.toLocaleString()} - $${job.payRangeMax.toLocaleString()}${salaryTypeText}`
    }
    if (job.payRangeMin) return `From $${job.payRangeMin.toLocaleString()}${salaryTypeText}`
    if (job.payRangeMax) return `Up to $${job.payRangeMax.toLocaleString()}${salaryTypeText}`
    return 'Competitive'
  }

  const handleApplicationSuccess = (applicationId: string) => {
    setShowApplicationForm(false)
    setApplicationStatus({
      hasApplied: true,
      application: {
        id: applicationId,
        status: 'pending',
        appliedAt: new Date().toISOString()
      }
    })
  }

  const handleSaveJob = async () => {
    if (!job || savingJob) return

    try {
      setSavingJob(true)

      if (isSaved) {
        // Unsave the job
        const response = await fetch(`/api/seeker/saved-jobs?jobId=${job.id}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          setIsSaved(false)
        } else {
          console.error('Failed to unsave job')
        }
      } else {
        // Save the job
        const response = await fetch('/api/seeker/saved-jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ jobId: job.id })
        })

        if (response.ok) {
          setIsSaved(true)
        } else {
          console.error('Failed to save job')
        }
      }
    } catch (error) {
      console.error('Error saving/unsaving job:', error)
    } finally {
      setSavingJob(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {error || 'Job not found'}
            </h2>
            <p className="text-gray-600 mb-6">
              {`The job you're looking for doesn't exist or has been removed.`}
            </p>
            <Button onClick={() => router.push('/seeker/jobs')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Jobs
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/seeker/jobs')}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Jobs
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 overflow-hidden">
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {/* Company Logo */}
                  <CompanyLogo
                    companyLogoUrl={job.employer.companyLogoUrl}
                    companyName={job.employer.companyName}
                    size="lg"
                  />

                  <div className="flex-1">
                    <CardTitle
                      className="text-2xl font-bold text-gray-900 mb-2"
                      dangerouslySetInnerHTML={{ __html: job.title }}
                    />
                    <div className="flex items-center text-gray-600 mb-4">
                      <Building className="w-4 h-4 mr-2" />
                      <span className="font-medium">{job.employer.companyName}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Job Meta Info */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                {job.locationText && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {job.locationText}
                  </div>
                )}
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  {formatPayRange(job)}
                </div>
                {job.hoursPerWeek && (
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {job.hoursPerWeek} hours/week
                  </div>
                )}
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Posted {formatDate(job.createdAt)}
                </div>
              </div>

              {/* Job Type and Category Badges */}
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="secondary">{getCategoryLabel(job.category)}</Badge>
                <Badge variant="outline">
                  {job.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
                {job.isFlexibleHours && (
                  <Badge variant="outline">Flexible Hours</Badge>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {/* Job Description */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Job Description</h3>
                <MarkdownRenderer
                  content={job.description}
                  className="prose prose-sm max-w-none text-gray-700 break-all overflow-hidden"
                />
              </div>

              {/* Qualifications */}
              {job.requirements && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">Qualifications</h3>
                  <MarkdownRenderer
                    content={job.requirements}
                    className="prose prose-sm max-w-none text-gray-700 break-all overflow-hidden"
                  />
                </div>
              )}

              {/* Required Skills */}
              {(job.skillsRequired || []).length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {(job.skillsRequired || []).map((skill, index) => (
                      <Badge key={index} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Benefits & Perks */}
              {job.benefits && job.benefits.trim() !== '' && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">Benefits & Perks</h3>
                  <MarkdownRenderer
                    content={job.benefits}
                    className="prose prose-sm max-w-none text-gray-700 break-all overflow-hidden"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* About Company Section */}
          {(job.employer.companyDescription || job.employer.companyWebsite) && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>About {job.employer.companyName}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {job.employer.companyDescription && (
                    <div>
                      <MarkdownRenderer
                        content={job.employer.companyDescription}
                        className="prose prose-sm max-w-none text-gray-700"
                      />
                    </div>
                  )}

                  {job.employer.companyWebsite && (
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900">Company Website:</span>
                        <a
                          href={job.employer.companyWebsite.startsWith('http')
                            ? job.employer.companyWebsite
                            : `https://${job.employer.companyWebsite}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                        >
                          <span>{job.employer.companyWebsite}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}

                  {job.employer.missionStatement && (
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-start space-x-2 mb-2">
                        <Target className="h-4 w-4 text-gray-500 mt-0.5" />
                        <h4 className="text-sm font-semibold text-gray-900">Mission Statement</h4>
                      </div>
                      <MarkdownRenderer
                        content={job.employer.missionStatement}
                        className="prose prose-sm max-w-none ml-6 text-gray-700"
                      />
                    </div>
                  )}

                  {job.employer.coreValues && (
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-start space-x-2 mb-2">
                        <Heart className="h-4 w-4 text-gray-500 mt-0.5" />
                        <h4 className="text-sm font-semibold text-gray-900">Core Values</h4>
                      </div>
                      <MarkdownRenderer
                        content={job.employer.coreValues}
                        className="prose prose-sm max-w-none ml-6 text-gray-700"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Job Invitation Message */}
          {invitationMessage && (
            <Card className="mb-6 border-purple-200 bg-purple-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-purple-800 flex items-center">
                  <Send className="w-5 h-5 mr-2" />
                  {`You're Invited!`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-purple-700">
                    <strong>{invitationMessage.companyName}</strong> personally invited you to apply for this position.
                  </p>
                  {invitationMessage.message && (
                    <div className="bg-white p-3 rounded-md border border-purple-200">
                      <p className="text-sm text-gray-700 italic">
                        {`"${invitationMessage.message}"`}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-purple-600">
                    Invited {new Date(invitationMessage.invitedAt).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="sticky top-8">
            <CardHeader>
              <CardTitle>Apply for this Job</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {job.isArchived ? (
                <div className="text-center p-4 bg-gray-50 border border-gray-300 rounded-lg">
                  <div className="text-gray-600 font-medium mb-2">
                    📁 Job Archived
                  </div>
                  <div className="text-sm text-gray-700">
                    This job has been archived by the employer and is no longer accepting applications.
                  </div>
                  {job.archivedAt && (
                    <div className="text-xs text-gray-600 mt-1">
                      Archived on {new Date(job.archivedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ) : job.isFilled ? (
                <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-red-600 font-medium mb-2">
                    🚫 Position Filled
                  </div>
                  <div className="text-sm text-red-700">
                    This position has been filled and is no longer accepting applications.
                  </div>
                  {job.filledAt && (
                    <div className="text-xs text-red-600 mt-1">
                      Filled on {new Date(job.filledAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ) : applicationStatus?.hasApplied ? (
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-green-600 font-medium mb-2">
                    ✓ Application Submitted
                  </div>
                  <div className="text-sm text-green-700">
                    Status: <span className={getStatusTextColor(applicationStatus.application?.status || 'pending')}>{formatStatusDisplay(applicationStatus.application?.status || 'pending')}</span>
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    Applied on {new Date(applicationStatus.application?.appliedAt).toLocaleDateString()}
                  </div>
                </div>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => setShowApplicationForm(true)}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Apply Now
                </Button>
              )}

              {/* Only show Save Job button for non-archived jobs */}
              {!job.isArchived && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSaveJob}
                  disabled={savingJob}
                >
                  <Bookmark className={`w-4 h-4 mr-2 ${isSaved ? 'fill-current' : ''}`} />
                  {savingJob ? 'Saving...' : isSaved ? 'Saved' : 'Save Job'}
                </Button>
              )}

              {/* Only show Share Job button for non-archived jobs */}
              {!job.isArchived && (
                <ShareJobButton
                  jobId={job.id}
                  jobTitle={job.title}
                  variant="outline"
                  size="default"
                  showText={true}
                />
              )}

              <Separator />

              {/* Job Summary */}
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-900">Job Type:</span>
                  <span className="ml-2 text-gray-600">
                    {job.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>

                <div>
                  <span className="font-medium text-gray-900">Category:</span>
                  <span className="ml-2 text-gray-600">{getCategoryLabel(job.category)}</span>
                </div>

                {job.experienceLevel && (
                  <div>
                    <span className="font-medium text-gray-900">Experience Level:</span>
                    <span className="ml-2 text-gray-600">
                      {job.experienceLevel.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                )}

                {job.hoursPerWeek && (
                  <div>
                    <span className="font-medium text-gray-900">Hours/Week:</span>
                    <span className="ml-2 text-gray-600">{job.hoursPerWeek}</span>
                  </div>
                )}

                {job.applicationDeadline && (
                  <div>
                    <span className="font-medium text-gray-900">Application Deadline:</span>
                    <span className="ml-2 text-gray-600">
                      {new Date(job.applicationDeadline).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {job.expiresAt && (
                  <div>
                    <span className="font-medium text-gray-900">Expires:</span>
                    <span className="ml-2 text-gray-600">
                      {new Date(job.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Application Form Modal */}
      {showApplicationForm && job && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <ApplicationForm
              jobId={job.id}
              jobTitle={job.title}
              companyName={job.employer.companyName}
              onSuccess={handleApplicationSuccess}
              onCancel={() => setShowApplicationForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}