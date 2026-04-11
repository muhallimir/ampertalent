'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ApplicantProfileModal } from '@/components/employer/ApplicantProfileModal'
import { ApplicantProfilePicture } from '@/components/common/ApplicantProfilePicture'
import { QuickStageDropdown } from '@/components/employer/QuickStageDropdown'
import { useToast } from '@/components/ui/toast'
import { getWithImpersonation, putWithImpersonation, postWithImpersonation } from '@/lib/api-client'
import {
  ArrowLeft,
  Search,
  Filter,
  Users,
  Download,
  MapPin,
  Calendar,
  Mail,
  Eye,
  Clock,
  Check,
  X,
  Edit,
  CheckSquare,
  Square,
  UserCheck,
  UserX,
  MessageSquare,
  Plus,
  MessageCircle
} from 'lucide-react'

interface JobPosting {
  id: string
  title: string
  location: string
  applicationsCount: number
  status: string
  createdAt?: string
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
}

interface Application {
  id: string
  applicantId: string
  applicantName: string
  applicantEmail: string | null
  applicantPhone?: string
  applicantLocation: string
  profilePictureUrl?: string
  resumeUrl: string
  coverLetter?: string
  appliedAt: string
  status: 'pending' | 'reviewed' | 'interview' | 'rejected' | 'hired'
  interviewStage?: string
  interviewScheduledAt?: string | null
  interviewCompletedAt?: string | null
  interviewerNotes?: string | null
  nextActionRequired?: string | null
  nextActionDeadline?: string | null
  experience: string
  skills: string[]
  expectedSalary?: number
  availability: string
  rating?: number
  allowDirectMessages?: boolean
}

export default function JobApplicationsPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string
  const { addToast } = useToast()

  const [job, setJob] = useState<JobPosting | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [skeletonRowCount, setSkeletonRowCount] = useState(5)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [stageFilter, setStageFilter] = useState<string>('all')

  // Bulk selection state
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null)
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false)
  const [bulkRejectMessage, setBulkRejectMessage] = useState(
    "Thank you for your interest in this position. After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs. We appreciate the time you took to apply and wish you the best in your job search."
  )

  // Hire confirmation modal state
  const [showHireConfirmModal, setShowHireConfirmModal] = useState(false)
  const [pendingHireApplicationId, setPendingHireApplicationId] = useState<string | null>(null)
  const [pendingHireApplicantName, setPendingHireApplicantName] = useState<string>('')
  const [viewingResumeId, setViewingResumeId] = useState<string | null>(null)

  const [profileModal, setProfileModal] = useState<{
    isOpen: boolean
    applicationId: string
    applicantName: string
  }>({
    isOpen: false,
    applicationId: '',
    applicantName: ''
  })

  const loadJobAndApplications = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true)
    }
    try {
      console.log('Loading job and applications for job:', jobId)

      const response = await getWithImpersonation(`/api/employer/jobs/${jobId}/applications`)
      if (response.ok) {
        const data = await response.json()
        setJob(data.job)
        setApplications(data.applications || [])
      } else {
        console.error('Failed to load job and applications')
        setJob(null)
        setApplications([])
      }
    } catch (error) {
      console.error('Error loading job and applications:', error)
      setJob(null)
      setApplications([])
    } finally {
      if (isRefresh) {
        setIsRefreshing(false)
      } else {
        setIsLoading(false)
      }
    }
  }, [jobId])

  useEffect(() => {
    loadJobAndApplications()
  }, [loadJobAndApplications])

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    // Prevent multiple clicks on the same application
    if (updatingApplicationId === applicationId) return

    // If trying to hire someone, show confirmation modal first
    if (newStatus === 'hired') {
      const application = applications.find(app => app.id === applicationId)
      if (application) {
        setPendingHireApplicationId(applicationId)
        setPendingHireApplicantName(application.applicantName)
        setShowHireConfirmModal(true)
        return
      }
    }

    setUpdatingApplicationId(applicationId)

    try {
      console.log(`Changing application ${applicationId} status to ${newStatus}`)

      // Find the current application to check if this is a reconsideration
      const currentApplication = applications.find(app => app.id === applicationId)
      const isReconsideration = currentApplication?.status === 'rejected' && newStatus === 'reviewed'

      // Prepare the request payload
      const requestPayload: any = { status: newStatus, isReconsideration }

      // If this is a reconsideration, also reset the interview stage
      if (isReconsideration) {
        requestPayload.interviewStage = 'initial_screening'
        console.log(`Reconsidering application ${applicationId} - resetting to initial_screening stage`)
      }

      // If this is changing to reviewed and no interview stage is set, set it to initial_screening
      if (newStatus === 'reviewed' && !currentApplication?.interviewStage) {
        requestPayload.interviewStage = 'initial_screening'
        console.log(`Setting initial interview stage to initial_screening for application ${applicationId}`)
      }

      // If this is a rejection, set the interview stage to offer_rejected
      if (newStatus === 'rejected') {
        requestPayload.interviewStage = 'offer_rejected'
        console.log(`Rejecting application ${applicationId} - setting to offer_rejected stage`)
      }

      const response = await putWithImpersonation(`/api/employer/applications/${applicationId}/status`, requestPayload)

      if (response.ok) {
        // Update local state
        setApplications(prev => prev.map(app =>
          app.id === applicationId ? {
            ...app,
            status: newStatus as Application['status'],
            ...(isReconsideration && { interviewStage: 'initial_screening' }),
            ...(newStatus === 'reviewed' && !app.interviewStage && { interviewStage: 'initial_screening' }),
            ...(newStatus === 'rejected' && { interviewStage: 'offer_rejected' })
          } : app
        ))

        // Show success toast with appropriate message based on status
        const statusMessages = {
          'pending': 'Application moved to pending',
          'reviewed': isReconsideration ? 'Application reconsidered and moved back to initial screening! 🔄' : 'Application marked as reviewed',
          'interview': 'Candidate moved to interview stage! 🎉',
          'rejected': 'Application rejected',
          'hired': 'Congratulations! Candidate hired successfully! 🎉'
        }

        addToast({
          title: "Status Updated",
          description: statusMessages[newStatus as keyof typeof statusMessages] || `Application status updated to ${newStatus}`,
          variant: "default",
          duration: 4000
        })
      } else {
        const error = await response.json()
        addToast({
          title: "Error",
          description: `Error updating application status: ${error.error}`,
          variant: "destructive",
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error updating application status:', error)
      addToast({
        title: "Error",
        description: "Error updating application status. Please try again.",
        variant: "destructive",
        duration: 5000
      })
    } finally {
      setUpdatingApplicationId(null)
    }
  }

  const handleConfirmHire = async () => {
    if (!pendingHireApplicationId) return

    try {
      console.log(`Confirming hire for application ${pendingHireApplicationId}`)

      const response = await putWithImpersonation(`/api/employer/applications/${pendingHireApplicationId}/status`, {
        status: 'hired'
      })

      if (response.ok) {
        setApplications(prev => prev.map(app =>
          app.id === pendingHireApplicationId ? { ...app, status: 'hired' as Application['status'] } : app
        ))

        addToast({
          title: "Candidate Hired!",
          description: `Congratulations! ${pendingHireApplicantName} has been hired successfully! 🎉`,
          variant: "default",
          duration: 4000
        })
      } else {
        const error = await response.json()
        addToast({
          title: "Error",
          description: `Error hiring candidate: ${error.error}`,
          variant: "destructive",
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error hiring candidate:', error)
      addToast({
        title: "Error",
        description: "Error hiring candidate. Please try again.",
        variant: "destructive",
        duration: 5000
      })
    } finally {
      setShowHireConfirmModal(false)
      setPendingHireApplicationId(null)
      setPendingHireApplicantName('')
    }
  }

  // Bulk selection handlers
  const handleSelectAll = () => {
    // When job is filled, only allow selection of hired applicants
    // Also exclude already rejected applications
    const selectableApplications = filteredApplications.filter(app => {
      if (isJobFilled && app.status !== 'hired') return false
      if (app.status === 'rejected') return false
      return true
    })

    if (selectedApplications.size === selectableApplications.length) {
      setSelectedApplications(new Set())
      setShowBulkActions(false)
    } else {
      setSelectedApplications(new Set(selectableApplications.map(app => app.id)))
      setShowBulkActions(true)
    }
  }

  const handleSelectApplication = (applicationId: string) => {
    const application = applications.find(app => app.id === applicationId)

    // When job is filled, only allow selection of hired applicants
    if (isJobFilled && application?.status !== 'hired') {
      return
    }

    // Prevent selecting already rejected applications
    if (application?.status === 'rejected') {
      return
    }

    const newSelected = new Set(selectedApplications)
    if (newSelected.has(applicationId)) {
      newSelected.delete(applicationId)
    } else {
      newSelected.add(applicationId)
    }
    setSelectedApplications(newSelected)
    setShowBulkActions(newSelected.size > 0)
  }

  const handleBulkReject = async () => {
    setBulkActionLoading(true)
    try {
      const response = await postWithImpersonation('/api/employer/applications/bulk-reject', {
        applicationIds: Array.from(selectedApplications),
        message: bulkRejectMessage
      })

      if (response.ok) {
        // Update local state
        setApplications(prev => prev.map(app =>
          selectedApplications.has(app.id) ? { ...app, status: 'rejected' as Application['status'] } : app
        ))
        setSelectedApplications(new Set())
        setShowBulkActions(false)
        setShowBulkRejectModal(false)
        addToast({
          title: "Applications Rejected",
          description: `Successfully rejected ${selectedApplications.size} application${selectedApplications.size !== 1 ? 's' : ''}`,
          variant: "default",
          duration: 4000
        })
      } else {
        const error = await response.json()
        addToast({
          title: "Error",
          description: `Error: ${error.error}`,
          variant: "destructive",
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error bulk rejecting applications:', error)
      addToast({
        title: "Error",
        description: "Error rejecting applications. Please try again.",
        variant: "destructive",
        duration: 5000
      })
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleBulkInterview = async () => {
    setBulkActionLoading(true)
    try {
      const response = await postWithImpersonation('/api/employer/applications/bulk-interview', {
        applicationIds: Array.from(selectedApplications)
      })

      if (response.ok) {
        // Update local state
        setApplications(prev => prev.map(app =>
          selectedApplications.has(app.id) ? {
            ...app,
            status: 'interview' as Application['status'],
            interviewStage: 'technical_interview'
          } : app
        ))
        setSelectedApplications(new Set())
        setShowBulkActions(false)
        addToast({
          title: "Moved to Interview",
          description: `Successfully moved ${selectedApplications.size} application${selectedApplications.size !== 1 ? 's' : ''} to Technical Interview stage! 🎉`,
          variant: "default",
          duration: 4000
        })
      } else {
        const error = await response.json()
        addToast({
          title: "Error",
          description: error.error || `Error: ${error.message}`,
          variant: "destructive",
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error bulk interviewing applications:', error)
      addToast({
        title: "Error",
        description: "Error moving applications to interview. Please try again.",
        variant: "destructive",
        duration: 5000
      })
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleViewProfile = (applicationId: string) => {
    const application = applications.find(app => app.id === applicationId)
    if (application) {
      // Store the current number of visible applications for skeleton loading
      setSkeletonRowCount(filteredApplications.length)
      setProfileModal({
        isOpen: true,
        applicationId,
        applicantName: application.applicantName
      })
    }
  }

  const handleCloseProfileModal = () => {
    setProfileModal({
      isOpen: false,
      applicationId: '',
      applicantName: ''
    })
    // Refresh data when modal closes in case changes were made
    loadJobAndApplications(true)
  }

  const handleChatWithApplicant = (applicationId: string) => {
    const application = applications.find(app => app.id === applicationId)
    if (application && job) {
      // Navigate to messages page with pre-selected recipient and job context
      const searchParams = new URLSearchParams({
        compose: 'true',
        recipientId: application.applicantId,
        recipientName: application.applicantName,
        jobId: job.id,
        jobTitle: job.title
      })
      router.push(`/employer/messages?${searchParams.toString()}`)
    }
  }

  const handleResumeView = async (applicationId: string) => {
    try {
      setViewingResumeId(applicationId)
      const response = await getWithImpersonation(`/api/employer/applications/${applicationId}/resume`)
      if (response.ok) {
        const data = await response.json()
        window.open(data.downloadUrl, '_blank')
      } else {
        const error = await response.json()
        console.error('Error viewing resume:', error.error)
        addToast({
          title: "View Failed",
          description: "Unable to view resume. Please try again.",
          variant: "destructive",
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error viewing resume:', error)
      addToast({
        title: "View Failed",
        description: "Unable to view resume. Please try again.",
        variant: "destructive",
        duration: 5000
      })
    } finally {
      setViewingResumeId(null)
    }
  }

  const handleExportApplications = () => {
    try {
      const headers = [
        'Applicant Name',
        'Email',
        'Status',
        'Interview Stage',
        'Applied Date',
        'Professional Headline',
        'Skills',
        'Availability',
        'Resume Available'
      ]

      const csvContent = [
        headers.join(','),
        ...filteredApplications.map(app => [
          `"${app.applicantName}"`,
          `"${app.applicantEmail || 'Hidden until interview'}"`,
          app.status,
          `"${formatStageName(app.interviewStage || '')}"`,
          new Date(app.appliedAt).toLocaleDateString(),
          `"${app.experience}"`,
          `"${app.skills.join('; ')}"`,
          `"${app.availability}"`,
          app.resumeUrl ? 'Yes' : 'No'
        ].join(','))
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `job_applications_export_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      addToast({
        title: "Export Successful",
        description: `Exported ${filteredApplications.length} applications to CSV`,
        variant: "default",
        duration: 3000
      })
    } catch (error) {
      console.error('Error exporting applications:', error)
      addToast({
        title: "Export Failed",
        description: "Failed to export applications. Please try again.",
        variant: "destructive",
        duration: 5000
      })
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatStageName = (stage: string) => {
    if (!stage) return 'Not Started'
    const stageMap: Record<string, string> = {
      'initial_screening': 'Initial Screening',
      'technical_interview': 'Technical Interview',
      'behavioral_interview': 'Behavioral Interview',
      'final_interview': 'Final Interview',
      'offer_extended': 'Offer Extended',
      'offer_accepted': 'Offer Accepted',
      'offer_rejected': 'Offer Declined'
    }
    return stageMap[stage] || stage
  }


  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.applicantEmail && app.applicantEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      app.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter
    const matchesStage = stageFilter === 'all' || app.interviewStage === stageFilter
    return matchesSearch && matchesStatus && matchesStage
  })

  const applicationStats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    reviewed: applications.filter(a => a.status === 'reviewed').length,
    interview: applications.filter(a => a.status === 'interview').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    hired: applications.filter(a => a.status === 'hired').length,
  }

  // Check if job is filled (has hired applicants)
  const isJobFilled = applicationStats.hired > 0
  const hiredApplicants = applications.filter(a => a.status === 'hired')

  // Check if job is within 60 days (for reconsider functionality)
  const isWithin60Days = job?.createdAt ?
    (new Date().getTime() - new Date(job.createdAt).getTime()) <= (60 * 24 * 60 * 60 * 1000) : false

  // Check if selected applications are eligible for bulk interview
  const selectedForBulkInterview = Array.from(selectedApplications).every(appId => {
    const app = applications.find(a => a.id === appId)
    return app && (app.status === 'pending' || app.status === 'reviewed')
  })

  // Check if selected applications are eligible for bulk reject (not already rejected)
  const selectedForBulkReject = Array.from(selectedApplications).every(appId => {
    const app = applications.find(a => a.id === appId)
    return app && app.status !== 'rejected'
  })

  const ineligibleForInterviewCount = Array.from(selectedApplications).filter(appId => {
    const app = applications.find(a => a.id === appId)
    return !app || (app.status !== 'pending' && app.status !== 'reviewed')
  }).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h1>
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
        <div className="flex items-center justify-between mb-4">
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
            onClick={() => router.push(`/employer/jobs/${jobId}/edit`)}
            disabled={isJobFilled}
            className={isJobFilled ? 'opacity-50 cursor-not-allowed' : ''}
            title={isJobFilled ? 'Cannot edit filled positions. Create a new job post instead.' : 'Edit this job post'}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Post
          </Button>

          {job.conciergeRequested && job.chatEnabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/employer/concierge/${jobId}`)}
              className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Concierge Chat
            </Button>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Applications</h1>
          <p className="text-gray-600">
            Manage applications for <span className="font-semibold">{job.title}</span> • {job.location}
          </p>
        </div>
      </div>

      {/* Concierge Service Banner */}
      {job.conciergeRequested && (
        <div className="mb-6 p-4 bg-brand-teal/10 border border-brand-teal/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <MessageCircle className="h-5 w-5 text-brand-teal" />
                <div className="text-brand-teal font-semibold">
                  Concierge Service Active
                </div>
                <div className="px-2 py-1 bg-brand-teal/20 text-brand-teal text-xs rounded-full">
                  {job.conciergeStatus === 'completed' ? 'Service Completed' :
                    job.conciergeStatus === 'pending' ? 'Service Requested' :
                      job.conciergeStatus === 'discovery_call' ? 'Discovery Call' :
                        job.conciergeStatus === 'job_optimization' ? 'Optimizing Job' :
                          job.conciergeStatus === 'candidate_screening' ? 'Screening Candidates' :
                            job.conciergeStatus === 'interviews' ? 'Interview Coordination' :
                              'In Progress'}
                </div>
              </div>
              <div className="text-sm text-brand-teal/80">
                Your dedicated hiring specialists are working on this position.
                {job.conciergeInfo?.requestedAt && ` Service started ${new Date(job.conciergeInfo.requestedAt).toLocaleDateString()}.`}
              </div>
            </div>
            {job.chatEnabled && (
              <div className="ml-4">
                <Button
                  onClick={() => router.push(`/employer/concierge/${jobId}`)}
                  className="bg-gradient-to-br from-brand-teal to-brand-teal-light hover:from-brand-teal/90 hover:to-brand-teal-light/90 text-white"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat with Team
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Position Filled Banner */}
      {isJobFilled && (
        <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-green-600 font-semibold text-lg mb-2">
                🎉 Congratulations! Position Filled
              </div>
              <div className="text-sm text-green-700 mb-3">
                This position has been successfully filled by {hiredApplicants.length === 1 ? hiredApplicants[0].applicantName : `${hiredApplicants.length} candidates`}.
                {hiredApplicants.length === 1 && (
                  <span className="block mt-1">
                    Other applicants are now hidden to maintain hiring process integrity.
                  </span>
                )}
              </div>
              <div className="text-sm text-green-600 font-medium">
                Need to hire more people for similar roles?
              </div>
            </div>
            <div className="ml-6">
              <Button
                onClick={() => router.push('/employer/jobs/new')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Post New Job
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{applicationStats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{applicationStats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{applicationStats.reviewed}</div>
            <div className="text-sm text-gray-600">Reviewed</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{applicationStats.interview}</div>
            <div className="text-sm text-gray-600">Interview</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{applicationStats.rejected}</div>
            <div className="text-sm text-gray-600">Declined</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{applicationStats.hired}</div>
            <div className="text-sm text-gray-600">Hired</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name, email, or skills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="rejected">Declined</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                    <SelectValue placeholder="All Stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="initial_screening">Initial Screening</SelectItem>
                    <SelectItem value="technical_interview">Technical Interview</SelectItem>
                    <SelectItem value="behavioral_interview">Behavioral Interview</SelectItem>
                    <SelectItem value="final_interview">Final Interview</SelectItem>
                    <SelectItem value="offer_extended">Offer Extended</SelectItem>
                    <SelectItem value="offer_accepted">Offer Accepted</SelectItem>
                    <SelectItem value="offer_rejected">Offer Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleExportApplications}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {showBulkActions && !isJobFilled && (
        <Card className="mb-4 border-brand-teal bg-brand-teal/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-brand-teal">
                  {selectedApplications.size} application{selectedApplications.size !== 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedApplications(new Set())
                    setShowBulkActions(false)
                  }}
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkInterview}
                  disabled={bulkActionLoading || !selectedForBulkInterview}
                  className={`text-green-600 border-green-300 hover:bg-green-50 ${!selectedForBulkInterview ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  title={!selectedForBulkInterview ?
                    `Bulk interview only available for applications with "pending" or "reviewed" status. ${ineligibleForInterviewCount} selected application${ineligibleForInterviewCount !== 1 ? 's are' : ' is'} not eligible.` :
                    'Move selected applications to Technical Interview stage'
                  }
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Move to Interview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkRejectModal(true)}
                  disabled={bulkActionLoading || !selectedForBulkReject}
                  className={`text-red-600 border-red-300 hover:bg-red-50 ${!selectedForBulkReject ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={!selectedForBulkReject ?
                    'Bulk decline not available for already declined applications' :
                    'Decline selected applications'
                  }
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Decline Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applications Table */}
      <Card>
        <CardContent className="p-0">
          {filteredApplications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No applications found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No applications have been submitted for this job yet'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAll}
                        className="p-1 h-6 w-6"
                      >
                        {selectedApplications.size === filteredApplications.length && filteredApplications.length > 0 ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applicant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Experience
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applied Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isRefreshing ? (
                    // Skeleton loading rows - matches the number of visible applications
                    Array.from({ length: skeletonRowCount }).map((_, index) => (
                      <tr key={`skeleton-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-6 w-6" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Skeleton className="h-10 w-10 rounded-full mr-4" />
                            <div>
                              <Skeleton className="h-4 w-32 mb-1" />
                              <Skeleton className="h-3 w-40 mb-1" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-4 w-20 mb-1" />
                          <Skeleton className="h-3 w-28" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-8 w-16" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    filteredApplications.map((application) => {
                      const isHired = application.status === 'hired'
                      const isRejected = application.status === 'rejected'
                      const shouldBlur = isJobFilled && !isHired
                      const shouldDisableCheckbox = shouldBlur || isRejected

                      return (
                        <tr key={application.id} className={`hover:bg-gray-50 ${selectedApplications.has(application.id) ? 'bg-blue-50' : ''} ${shouldBlur ? 'opacity-40 blur-sm pointer-events-none' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSelectApplication(application.id)}
                              className={`p-1 h-6 w-6 ${shouldDisableCheckbox ? 'pointer-events-none opacity-30' : ''}`}
                              disabled={shouldDisableCheckbox}
                            >
                              {selectedApplications.has(application.id) ? (
                                <CheckSquare className="h-4 w-4 text-brand-teal" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </Button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <ApplicantProfilePicture
                                applicantId={application.applicantId}
                                applicantName={application.applicantName}
                                profilePictureUrl={application.profilePictureUrl || null}
                                size="md"
                              />
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {application.applicantName}
                                </div>
                                {application.applicantEmail && (
                                  <div className="text-sm text-gray-500 flex items-center">
                                    <Mail className="h-3 w-3 mr-1" />
                                    {application.applicantEmail}
                                  </div>
                                )}
                                {!application.applicantEmail && (
                                  <div
                                    className="text-sm text-gray-400 flex items-center cursor-help"
                                    title="Move this candidate to 'Interview' status to see their contact details"
                                  >
                                    <Mail className="h-3 w-3 mr-1" />
                                    Email available after interview
                                  </div>
                                )}
                                <div className="text-sm text-gray-500 flex items-center">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {application.applicantLocation}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {application.experience}
                            </div>
                            <div className="text-sm text-gray-500">
                              {application.skills.slice(0, 3).join(', ')}
                              {application.skills.length > 3 && ` +${application.skills.length - 3} more`}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(application.appliedAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getStatusColor(application.status)}>
                              {formatStatusDisplay(application.status)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <QuickStageDropdown
                              applicationId={application.id}
                              currentStage={application.interviewStage}
                              formattedCurrentStage={application.interviewStage ? formatStageName(application.interviewStage) : undefined}
                              onStageUpdate={(applicationId, newStage) => {
                                // Update the local state
                                setApplications(prev =>
                                  prev.map(app =>
                                    app.id === applicationId
                                      ? { ...app, interviewStage: newStage }
                                      : app
                                  )
                                )
                              }}
                              disabled={shouldBlur || isRejected || application.status === 'pending'}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewProfile(application.id)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Manage Application
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResumeView(application.id)}
                                disabled={viewingResumeId === application.id}
                              >
                                {viewingResumeId === application.id ? (
                                  <LoadingSpinner size="sm" className="mr-1" />
                                ) : (
                                  <Eye className="h-3 w-3 mr-1" />
                                )}
                                Resume
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleChatWithApplicant(application.id)}
                                disabled={application.allowDirectMessages === false}
                                title={application.allowDirectMessages === false ? 'This applicant has turned off direct messages' : undefined}
                                className="text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                {application.allowDirectMessages === false ? 'Chat Off' : 'Chat'}
                              </Button>
                              {application.status !== 'rejected' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStatusChange(application.id, 'rejected')}
                                  disabled={updatingApplicationId === application.id}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  {updatingApplicationId === application.id ? (
                                    <LoadingSpinner size="sm" className="h-3 w-3 mr-1" />
                                  ) : (
                                    <X className="h-3 w-3 mr-1" />
                                  )}
                                  {updatingApplicationId === application.id ? 'Declining...' : 'Decline'}
                                </Button>
                              )}
                              {/* Status Action Buttons - REMOVED: All status changes now go through modal workflow */}
                              {/* Applications page buttons bypassed interview pipeline integration */}
                              {/* Status changes must be made through ApplicantProfileModal to ensure proper interview stage tracking */}

                              {(application.status === 'rejected' || (application.status === 'hired' && isWithin60Days)) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStatusChange(application.id, 'reviewed')}
                                  disabled={updatingApplicationId === application.id}
                                  title={application.status === 'hired' && !isWithin60Days ? 'Reconsider option only available within 60 days of job posting' : 'Move back to reviewed status'}
                                >
                                  {updatingApplicationId === application.id ? (
                                    <LoadingSpinner size="sm" className="h-3 w-3 mr-1" />
                                  ) : (
                                    <Clock className="h-3 w-3 mr-1" />
                                  )}
                                  {updatingApplicationId === application.id ? 'Updating...' : 'Reconsider'}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination would go here */}
      {filteredApplications.length > 0 && (
        <div className="mt-8 flex justify-center">
          <p className="text-sm text-gray-600">
            Showing {filteredApplications.length} of {applications.length} applications
          </p>
        </div>
      )}

      {/* Applicant Profile Modal */}
      <ApplicantProfileModal
        isOpen={profileModal.isOpen}
        onClose={handleCloseProfileModal}
        applicationId={profileModal.applicationId}
        applicantName={profileModal.applicantName}
      />

      {/* Bulk Reject Modal */}
      {showBulkRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center">
                  <UserX className="h-5 w-5 mr-2 text-red-600" />
                  Decline {selectedApplications.size} Application{selectedApplications.size !== 1 ? 's' : ''}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBulkRejectModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">
                  You are about to reject {selectedApplications.size} application{selectedApplications.size !== 1 ? 's' : ''}.
                  You can customize the rejection message that will be sent to the applicants.
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Message
                </label>
                <textarea
                  value={bulkRejectMessage}
                  onChange={(e) => setBulkRejectMessage(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter your rejection message..."
                />
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <MessageSquare className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-red-800">Important</h4>
                    <p className="text-sm text-red-700 mt-1">
                      This action cannot be undone. All selected applicants will receive the rejection message
                      and their application status will be changed to &quot;Rejected&quot;.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowBulkRejectModal(false)}
                disabled={bulkActionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkReject}
                disabled={bulkActionLoading || !bulkRejectMessage.trim()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {bulkActionLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Declining...
                  </>
                ) : (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Decline {selectedApplications.size} Application{selectedApplications.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hire Confirmation Modal */}
      {showHireConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center">
                  <Check className="h-5 w-5 mr-2 text-green-600" />
                  Hire {pendingHireApplicantName}?
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowHireConfirmModal(false)
                    setPendingHireApplicationId(null)
                    setPendingHireApplicantName('')
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  You are about to hire <strong>{pendingHireApplicantName}</strong> for this position.
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <MessageSquare className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-amber-800">Important Notice</h4>
                      <div className="text-sm text-amber-700 mt-1">
                        <p className="mb-2">When you hire this candidate:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>This job post will be marked as &quot;filled&quot; and removed from job seeker searches</li>
                          <li>All other applicants will be blurred out to discourage selecting additional candidates</li>
                          <li>To hire more people for similar roles, you&apos;ll need to create a new job post</li>
                          <li>This action helps maintain the integrity of the hiring process</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-green-800">What happens next?</h4>
                      <p className="text-sm text-green-700 mt-1">
                        The candidate will be notified of their successful hire, and you can proceed with onboarding.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowHireConfirmModal(false)
                  setPendingHireApplicationId(null)
                  setPendingHireApplicantName('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmHire}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="h-4 w-4 mr-2" />
                Yes, Hire {pendingHireApplicantName}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
