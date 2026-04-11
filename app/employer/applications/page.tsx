'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ClientOnly } from '@/components/common/ClientOnly'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { EmployerChatButton } from '@/components/employer/EmployerChatButton'
import { useToast } from '@/components/ui/toast'
import { getWithImpersonation, postWithImpersonation, putWithImpersonation } from '@/lib/api-client'
import {
  Search,
  Filter,
  Users,
  Download,
  Briefcase,
  Eye,
  MapPin,
  Calendar,
  Mail,
  Clock,
  Check,
  X,
  FileText,
  CheckSquare,
  Square,
  UserCheck,
  UserX,
  MessageSquare
} from 'lucide-react'

interface JobPosting {
  id: string
  title: string
  location: string
  applicationsCount: number
  status: string
}

interface Application {
  id: string
  jobId: string
  jobTitle: string
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
  experience: string
  skills: string[]
  expectedSalary?: number
  availability: string
  rating?: number
  allowDirectMessages?: boolean
}

export default function AllApplicationsPage() {
  const { addToast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightedAppId = searchParams.get('applicationId')
  const highlightRowRef = useRef<HTMLTableRowElement | null>(null)

  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [jobFilter, setJobFilter] = useState('all')

  // Bulk selection state
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false)
  const [bulkRejectMessage, setBulkRejectMessage] = useState(
    "Thank you for your interest in this position. After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs. We appreciate the time you took to apply and wish you the best in your job search."
  )
  const [profileModal, setProfileModal] = useState<{
    isOpen: boolean
    applicationId: string
    applicantName: string
  }>({
    isOpen: false,
    applicationId: '',
    applicantName: ''
  })
  const [coverLetterModal, setCoverLetterModal] = useState<{
    isOpen: boolean
    coverLetter: string
    applicantName: string
  }>({
    isOpen: false,
    coverLetter: '',
    applicantName: ''
  })
  const [viewingResumeId, setViewingResumeId] = useState<string | null>(null)

  useEffect(() => {
    loadApplications()
  }, [])

  // Scroll to and highlight the target application row once data is loaded
  useEffect(() => {
    if (!highlightedAppId || isLoading) return
    if (highlightRowRef.current) {
      highlightRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedAppId, isLoading])

  const loadApplications = async () => {
    try {
      console.log('Loading all applications for employer')

      const response = await getWithImpersonation('/api/employer/applications')
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs || [])
        setApplications(data.applications || [])
      } else {
        console.error('Failed to load applications')
        setJobs([])
        setApplications([])
      }
    } catch (error) {
      console.error('Error loading applications:', error)
      setJobs([])
      setApplications([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (applicationId: string, newStatus: string, interviewStage?: string) => {
    try {
      console.log(`Changing application ${applicationId} status to ${newStatus}${interviewStage ? ` with interview stage ${interviewStage}` : ''}`)

      // Find the current application to check if this is a reconsideration
      const currentApplication = applications.find(app => app.id === applicationId)
      const isReconsideration = currentApplication?.status === 'rejected' && newStatus === 'reviewed'

      const requestBody: any = { status: newStatus, isReconsideration }
      if (interviewStage) {
        requestBody.interviewStage = interviewStage
      }

      // If this is a reconsideration, also reset the interview stage
      if (isReconsideration) {
        requestBody.interviewStage = 'initial_screening'
        console.log(`Reconsidering application ${applicationId} - resetting to initial_screening stage`)
      }

      // If changing to reviewed and no interview stage is provided, set it to initial_screening
      if (newStatus === 'reviewed' && !interviewStage && !isReconsideration) {
        requestBody.interviewStage = 'initial_screening'
        console.log(`Setting initial interview stage to initial_screening for application ${applicationId}`)
      }

      // If declining (rejecting), set interview stage to offer_rejected
      if (newStatus === 'rejected') {
        requestBody.interviewStage = 'offer_rejected'
        console.log(`Setting interview stage to offer_rejected for declined application ${applicationId}`)
      }

      const response = await putWithImpersonation(`/api/employer/applications/${applicationId}/status`, requestBody)

      if (response.ok) {
        const data = await response.json()
        setApplications(prev => prev.map(app =>
          app.id === applicationId ? {
            ...app,
            status: newStatus as Application['status'],
            interviewStage: data.application.interviewStage
          } : app
        ))

        // Show success toast with appropriate message based on status
        const statusMessages = {
          'pending': 'Application moved to pending',
          'reviewed': isReconsideration ? 'Application reconsidered and moved back to initial screening! 🔄' : 'Application marked as reviewed and screening started',
          'interview': 'Interview scheduled and candidate moved to technical interview stage! 🎉',
          'rejected': 'Application declined',
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
    }
  }

  const handleViewProfile = (applicationId: string) => {
    const application = applications.find(app => app.id === applicationId)
    if (application) {
      setProfileModal({
        isOpen: true,
        applicationId,
        applicantName: application.applicantName
      })
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

  const handleCloseProfileModal = () => {
    setProfileModal({
      isOpen: false,
      applicationId: '',
      applicantName: ''
    })
  }

  const handleChatWithApplicant = (applicationId: string) => {
    const application = applications.find(app => app.id === applicationId)
    if (application) {
      // Navigate to messages page with pre-selected recipient and job context
      const searchParams = new URLSearchParams({
        compose: 'true',
        recipientId: application.applicantId,
        recipientName: application.applicantName,
        jobId: application.jobId,
        jobTitle: application.jobTitle
      })
      router.push(`/employer/messages?${searchParams.toString()}`)
    }
  }

  const handleViewCoverLetter = (application: Application) => {
    setCoverLetterModal({
      isOpen: true,
      coverLetter: application.coverLetter || '',
      applicantName: application.applicantName
    })
  }

  const handleCloseCoverLetterModal = () => {
    setCoverLetterModal({
      isOpen: false,
      coverLetter: '',
      applicantName: ''
    })
  }

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedApplications.size === filteredApplications.length) {
      setSelectedApplications(new Set())
      setShowBulkActions(false)
    } else {
      setSelectedApplications(new Set(filteredApplications.map(app => app.id)))
      setShowBulkActions(true)
    }
  }

  const handleSelectApplication = (applicationId: string) => {
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
          title: "Applications Declined",
          description: `Successfully declined ${selectedApplications.size} application${selectedApplications.size !== 1 ? 's' : ''}`,
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
      console.error('Error bulk declining applications:', error)
      addToast({
        title: "Error",
        description: "Error declining applications. Please try again.",
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
          selectedApplications.has(app.id) ? { ...app, status: 'interview' as Application['status'] } : app
        ))
        setSelectedApplications(new Set())
        setShowBulkActions(false)
        addToast({
          title: "Moved to Interview",
          description: `Successfully moved ${selectedApplications.size} application${selectedApplications.size !== 1 ? 's' : ''} to interview stage! 🎉`,
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

  const handleExportApplications = () => {
    try {
      const headers = [
        'Applicant Name',
        'Email',
        'Job Title',
        'Status',
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
          `"${app.jobTitle}"`,
          app.status,
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
      link.setAttribute('download', `applications_export_${new Date().toISOString().split('T')[0]}.csv`)
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

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.applicantEmail && app.applicantEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      app.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter
    const matchesJob = jobFilter === 'all' || app.jobId === jobFilter
    return matchesSearch && matchesStatus && matchesJob
  })

  const applicationStats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    reviewed: applications.filter(a => a.status === 'reviewed').length,
    interview: applications.filter(a => a.status === 'interview').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    hired: applications.filter(a => a.status === 'hired').length,
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <ClientOnly fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">All Applications</h1>
            <p className="text-gray-600">
              Manage applications across all your job postings
            </p>
          </div>
        </div>

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
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col md:flex-row gap-4 flex-1">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by name, email, job title, or skills..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-10 pl-10 pr-4"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={jobFilter} onValueChange={setJobFilter}>
                    <SelectTrigger className="w-[200px]">
                      <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                      <SelectValue placeholder="All Jobs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Jobs</SelectItem>
                      {jobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <Filter className="h-4 w-4 mr-2 text-gray-400" />
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
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="outline" className="h-10" onClick={handleExportApplications}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions Bar */}
        {showBulkActions && (
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
                    disabled={bulkActionLoading}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Move to Interview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkRejectModal(true)}
                    disabled={bulkActionLoading}
                    className="text-red-600 border-red-300 hover:bg-red-50"
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
                  {searchTerm || statusFilter !== 'all' || jobFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'No applications have been submitted yet'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-scroll scrollbar-visible">
                <table className="min-w-[1400px] w-full">
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
                        Job Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applied Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Interview Stage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredApplications.map((application) => (
                      <tr
                        key={application.id}
                        ref={application.id === highlightedAppId ? highlightRowRef : null}
                        className={`hover:bg-gray-50 transition-colors ${selectedApplications.has(application.id) ? 'bg-blue-50' : ''
                          } ${application.id === highlightedAppId
                            ? 'ring-2 ring-inset ring-brand-coral bg-orange-50'
                            : ''
                          }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectApplication(application.id)}
                            className="p-1 h-6 w-6"
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
                          <div className="text-sm font-medium text-gray-900">
                            {application.jobTitle}
                          </div>
                          <div className="text-sm text-gray-500">
                            {application.experience}
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
                            disabled={application.status === 'pending' || application.status === 'rejected'}
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

                            {application.coverLetter && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewCoverLetter(application)}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                Cover Letter
                              </Button>
                            )}

                            <EmployerChatButton
                              applicationId={application.id}
                              jobId={application.jobId}
                              seekerId={application.applicantId}
                              size="sm"
                              variant="outline"
                              showUnreadBadge={true}
                              disabled={application.allowDirectMessages === false}
                            />

                            {/* Status Action Buttons */}
                            {application.status === 'pending' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStatusChange(application.id, 'reviewed')}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  Review
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStatusChange(application.id, 'rejected')}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Decline
                                </Button>
                              </>
                            )}

                            {application.status === 'reviewed' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStatusChange(application.id, 'interview')}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Interview
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStatusChange(application.id, 'rejected')}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Decline
                                </Button>
                              </>
                            )}

                            {application.status === 'interview' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(application.id, 'hired')}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Hire
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStatusChange(application.id, 'rejected')}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Decline
                                </Button>
                              </>
                            )}

                            {(application.status === 'rejected' || application.status === 'hired') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(application.id, 'reviewed')}
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                Reconsider
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
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

        {/* Cover Letter Modal */}
        {coverLetterModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Cover Letter - {coverLetterModal.applicantName}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseCoverLetterModal}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {coverLetterModal.coverLetter ? (
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {coverLetterModal.coverLetter}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No cover letter provided</p>
                )}
              </div>
              <div className="p-6 border-t bg-gray-50">
                <Button onClick={handleCloseCoverLetterModal} className="w-full">
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Decline Modal */}
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
                    You are about to decline {selectedApplications.size} application{selectedApplications.size !== 1 ? 's' : ''}.
                    You can customize the declination message that will be sent to the applicants.
                  </p>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Declination Message
                  </label>
                  <textarea
                    value={bulkRejectMessage}
                    onChange={(e) => setBulkRejectMessage(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter your declination message..."
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
                        This action cannot be undone. All selected applicants will receive the declination message
                        and their application status will be changed to &quot;Declined&quot;.
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
      </div>
    </ClientOnly>
  )
}