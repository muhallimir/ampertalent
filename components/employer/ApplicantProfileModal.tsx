'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ApplicantProfilePicture } from '@/components/common/ApplicantProfilePicture'
import { InterviewPipeline } from '@/components/employer/InterviewPipeline'
import { getWithImpersonation } from '@/lib/api-client'
import {
  MapPin,
  Calendar,
  Mail,
  Phone,
  ExternalLink,
  Eye,
  User,
  Briefcase,
  FileText,
  Star,
  Check,
  MessageSquare
} from 'lucide-react'

interface ApplicantProfile {
  id: string
  name: string
  email: string | null
  phone?: string
  location: string
  profilePictureUrl?: string
  headline?: string
  aboutMe?: string
  skills: string[]
  portfolioUrls: string[]
  availability: string
  resumeUrl: string
  coverLetter?: string
  experience: string
  expectedSalary?: number
  membershipPlan: string
  appliedAt: string
  applicationStatus: string
  allowDirectMessages: boolean
}

interface InterviewData {
  id: string
  jobTitle: string
  companyName: string
  candidateName: string
  candidateEmail: string
  currentStage?: string
  formattedCurrentStage?: string
  interviewScheduledAt?: string
  interviewCompletedAt?: string
  interviewerNotes?: string
  nextActionRequired?: string
  nextActionDeadline?: string
}

interface ApplicantProfileModalProps {
  isOpen: boolean
  onClose: () => void
  applicationId: string
  applicantName: string
}

export function ApplicantProfileModal({
  isOpen,
  onClose,
  applicationId,
  applicantName
}: ApplicantProfileModalProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<ApplicantProfile | null>(null)
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null)
  const [jobData, setJobData] = useState<{ id: string; title: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isViewingResume, setIsViewingResume] = useState(false)
  const pathname = usePathname() || ""
  const isMessageThreadView = pathname.includes('/messages')

  const loadApplicantProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Load both profile and interview data simultaneously
      const [profileResponse, interviewResponse] = await Promise.all([
        getWithImpersonation(`/api/employer/applications/${applicationId}/profile`),
        getWithImpersonation(`/api/employer/applications/${applicationId}/interview`)
      ])

      // Handle profile response
      if (profileResponse.ok) {
        const data = await profileResponse.json()
        // Transform API response to match component interface
        const transformedProfile: ApplicantProfile = {
          id: data.seeker.id,
          name: data.seeker.name,
          email: data.seeker.email || '',
          phone: data.seeker.phone,
          location: '', // Not available in current schema
          profilePictureUrl: data.seeker.profilePictureUrl,
          headline: data.seeker.headline,
          aboutMe: data.seeker.aboutMe,
          skills: data.seeker.skills,
          portfolioUrls: data.seeker.portfolioUrls,
          availability: data.seeker.availability || '',
          resumeUrl: data.application.resumeUrl,
          coverLetter: data.application.coverLetter,
          experience: '', // Not available in current schema
          expectedSalary: undefined, // Not available in current schema
          membershipPlan: data.seeker.membershipPlan,
          appliedAt: data.application.appliedAt,
          applicationStatus: data.application.status === 'reviewed' ? 'reviewing' :
            data.application.status === 'interview' ? 'shortlisted' :
              data.application.status,
          allowDirectMessages: data.seeker.allowDirectMessages ?? true,
        }
        setProfile(transformedProfile)

        // Store job data for chat functionality
        setJobData({
          id: data.job.id,
          title: data.job.title
        })
      } else {
        const errorData = await profileResponse.json()
        setError(errorData.error || 'Failed to load applicant profile')
        return
      }

      // Handle interview response
      if (interviewResponse.ok) {
        const interviewData = await interviewResponse.json()
        const transformedInterviewData: InterviewData = {
          id: interviewData.id,
          jobTitle: interviewData.jobTitle,
          companyName: interviewData.companyName,
          candidateName: interviewData.candidateName,
          candidateEmail: interviewData.candidateEmail,
          currentStage: interviewData.currentStage,
          formattedCurrentStage: interviewData.formattedCurrentStage,
          interviewScheduledAt: interviewData.interviewScheduledAt,
          interviewCompletedAt: interviewData.interviewCompletedAt,
          interviewerNotes: interviewData.interviewerNotes,
          nextActionRequired: interviewData.nextActionRequired,
          nextActionDeadline: interviewData.nextActionDeadline
        }
        setInterviewData(transformedInterviewData)
      } else {
        // Don't fail the whole modal if interview data fails - just log and continue
        console.warn('Failed to load interview data, but profile loaded successfully')
        setInterviewData(null)
      }
    } catch (error) {
      console.error('Error loading applicant data:', error)
      setError('Failed to load applicant profile')
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    if (isOpen && applicationId) {
      loadApplicantProfile()
    }
  }, [isOpen, applicationId, loadApplicantProfile])

  const handleResumeView = async () => {
    try {
      setIsViewingResume(true)
      const response = await getWithImpersonation(`/api/employer/applications/${applicationId}/resume`)
      if (response.ok) {
        const data = await response.json()
        window.open(data.downloadUrl, '_blank')
      } else {
        const error = await response.json()
        console.error('Error viewing resume:', error.error)
      }
    } catch (error) {
      console.error('Error viewing resume:', error)
    } finally {
      setIsViewingResume(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      setLoading(true)

      // Determine appropriate interview stage based on status
      let interviewStage: string | undefined
      if (newStatus === 'reviewed') {
        interviewStage = 'initial_screening'
      }

      const requestBody: any = { status: newStatus }
      if (interviewStage) {
        requestBody.interviewStage = interviewStage
      }

      const response = await fetch(`/api/employer/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        // Refresh the profile data to show updated status
        await loadApplicantProfile()
      } else {
        const error = await response.json()
        setError(`Failed to update status: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating application status:', error)
      setError('Failed to update application status')
    } finally {
      setLoading(false)
    }
  }

  const handleChatWithApplicant = () => {
    if (profile && jobData) {
      const searchParams = new URLSearchParams({
        compose: 'true',
        recipientId: profile.id,
        recipientName: profile.name,
        jobId: jobData.id,
        jobTitle: jobData.title
      })
      router.push(`/employer/messages?${searchParams.toString()}`)
    }
  }

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

  const formatStatusDisplay = (status: string) => {
    switch (status) {
      case 'rejected': return 'Declined'
      default: return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const formatSalary = (salary: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(salary)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Applicant Profile - {applicantName}</span>
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="space-y-6">
            {/* Header Section Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-32" />
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardHeader>
            </Card>

            {/* Contact Information Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-36" />
              </CardContent>
            </Card>

            {/* About Section Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-16" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>

            {/* Skills and Experience Skeleton */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-20" />
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-14" />
                    <Skeleton className="h-6 w-18" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-24" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Interview Pipeline Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadApplicantProfile}>Try Again</Button>
          </div>
        )}

        {profile && !loading && (
          <div className="space-y-6">
            {/* Header Section */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <ApplicantProfilePicture
                      applicantId={profile.id}
                      applicantName={profile.name}
                      profilePictureUrl={profile.profilePictureUrl || null}
                      size="lg"
                    />
                    <div>
                      <h2 className="text-2xl font-bold">{profile.name}</h2>
                      {profile.headline && (
                        <p className="text-lg text-gray-600 mb-2">{profile.headline}</p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {profile.location}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Applied {new Date(profile.appliedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(profile.applicationStatus)}>
                      {formatStatusDisplay(profile.applicationStatus)}
                    </Badge>
                    <Button
                      onClick={handleResumeView}
                      variant="outline"
                      size="sm"
                      disabled={isViewingResume}
                      className="flex items-center gap-2"
                    >
                      {isViewingResume ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      View Resume
                    </Button>
                    {!isMessageThreadView && (
                      <Button
                        onClick={handleChatWithApplicant}
                        variant="outline"
                        size="sm"
                        disabled={!profile.allowDirectMessages}
                        title={!profile.allowDirectMessages ? 'This applicant has turned off direct messages' : undefined}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <MessageSquare className="h-4 w-4" />
                        {profile.allowDirectMessages ? 'Chat' : 'Chat Off'}
                      </Button>)}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Contact Information - Only show if email is available or phone exists */}
            {(profile.email || profile.phone) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Mail className="h-5 w-5 mr-2" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {profile.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>{profile.email}</span>
                    </div>
                  )}
                  {!profile.email && (profile.applicationStatus === 'pending' || profile.applicationStatus === 'reviewed' || profile.applicationStatus === 'rejected') && (
                    <div
                      className="flex items-center space-x-2 cursor-help"
                      title="Move this candidate to 'Interview' status to see their contact details"
                    >
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-400 italic">Email available after interview</span>
                    </div>
                  )}
                  {profile.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* About Section */}
            {profile.aboutMe && (
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{profile.aboutMe}</p>
                </CardContent>
              </Card>
            )}

            {/* Skills and Experience */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="h-5 w-5 mr-2" />
                    Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(profile.skills || []).map((skill, index) => (
                      <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Briefcase className="h-5 w-5 mr-2" />
                    Experience & Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="font-medium text-gray-700">Experience Level: </span>
                    <span className="text-gray-600">{profile.experience}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Availability: </span>
                    <span className="text-gray-600">{profile.availability}</span>
                  </div>
                  {profile.expectedSalary && (
                    <div>
                      <span className="font-medium text-gray-700">Expected Salary: </span>
                      <span className="text-gray-600">{formatSalary(profile.expectedSalary)}/year</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-700">Membership: </span>
                    <Badge variant="outline">{profile.membershipPlan}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Portfolio Links */}
            {profile.portfolioUrls.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ExternalLink className="h-5 w-5 mr-2" />
                    Portfolio & Links
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {profile.portfolioUrls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>{url}</span>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cover Letter */}
            {profile.coverLetter && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Cover Letter
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {profile.coverLetter}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Interview Pipeline - Only show after application is reviewed */}
            {interviewData && profile.applicationStatus !== 'pending' && (
              <InterviewPipeline
                application={interviewData}
                onStageUpdate={async () => {
                  // Refresh the interview data after update
                  await loadApplicantProfile()
                }}
              />
            )}

            {/* Show guidance for pending applications */}
            {profile.applicationStatus === 'pending' && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <div className="text-blue-600 mb-4">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Review Application First</h3>
                    <p className="text-gray-600 mb-4">
                      Please review the candidate&apos;s resume and application. After careful review, click &quot;Mark as Reviewed&quot; below to enable interview stage management.
                    </p>
                    <div className="flex justify-center space-x-3">
                      <Button
                        onClick={handleResumeView}
                        variant="outline"
                        disabled={isViewingResume}
                        className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                      >
                        {isViewingResume ? (
                          <LoadingSpinner size="sm" className="mr-2" />
                        ) : (
                          <Eye className="h-4 w-4 mr-2" />
                        )}
                        View Resume
                      </Button>
                      <Button
                        onClick={() => handleStatusChange('reviewed')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Mark as Reviewed
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}