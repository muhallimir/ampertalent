'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import {
  Briefcase,
  Building2,
  Calendar,
  Mail,
  MapPin,
  DollarSign,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  UserCheck,
  Search,
  Filter,
  ArrowLeft,
  Users,
  User,
  Shield,
  Pause,
  Play,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { UserProfilePicture } from '@/components/common/UserProfilePicture'
import { CompanyLogo } from '@/components/common/CompanyLogo'
import { getJobTypeLabel } from '@/lib/job-constants'

interface Job {
  id: string
  title: string
  employerId: string
  payRangeMin: number | null
  payRangeMax: number | null
  payRangeText: string | null
  type: string
  description: string
  skillsRequired: string[]
  locationText: string | null
  status: string
  jobStatus: string // New calculated job status
  isFilled: boolean // New filled flag
  isExpired: boolean // New expired flag
  isCompanyPrivate: boolean
  isPaused: boolean
  pausedAt: string | null
  pausedBy: string | null
  pausedDaysRemaining: number | null
  resumedAt: string | null
  createdAt: string
  updatedAt: string
  expiresAt: string | null
  approvedAt: string | null
  viewsCount: number
  legacyId: string | null
  employer: {
    userId: string
    companyName: string
    companyWebsite: string | null
    companyLogoUrl: string | null
    isVetted: boolean
    user: {
      name: string
      email: string
      profilePictureUrl: string | null
    }
  }
  _count: {
    applications: number
  }
  applications?: Array<{
    id: string
    status: string
    appliedAt: string
    seeker: {
      user: {
        name: string
        email: string
        profilePictureUrl: string | null
      }
    }
  }>
}

function JobCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-30" />
              </div>
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <div className="flex-shrink-0 ml-4">
            <div className="flex items-center space-x-4">
              <div className="text-center space-y-1">
                <Skeleton className="h-6 w-8 mx-auto" />
                <Skeleton className="h-3 w-10" />
              </div>
              <div className="text-center space-y-1">
                <Skeleton className="h-6 w-8 mx-auto" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="text-center space-y-1">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function JobListSkeletons() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  )
}

export default function AdminStandardJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const hasLoadedOnce = useRef(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    employerType: 'all'
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showPauseDialog, setShowPauseDialog] = useState(false)
  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const [jobToPause, setJobToPause] = useState<string | null>(null)
  const [jobToResume, setJobToResume] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
    currentPage: 1,
    totalPages: 1
  })
  const { addToast } = useToast()

  useEffect(() => {
    loadJobs(pagination.currentPage)
  }, [filters.search, filters.status, filters.employerType, pagination.currentPage])

  const loadJobs = async (page: number = 1) => {
    try {
      if (hasLoadedOnce.current) {
        setIsSearching(true)
      } else {
        setIsLoading(true)
      }

      const offset = (page - 1) * pagination.limit
      const queryParams = new URLSearchParams()
      queryParams.append('limit', pagination.limit.toString())
      queryParams.append('offset', offset.toString())
      if (filters.search) queryParams.append('search', filters.search)
      if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status)
      if (filters.employerType && filters.employerType !== 'all') queryParams.append('employerType', filters.employerType)
      queryParams.append('packageType', 'standard') // Only show standard jobs

      const response = await fetch(`/api/admin/job-posts?${queryParams}`)

      if (!response.ok) {
        throw new Error('Failed to fetch jobs')
      }

      const data = await response.json()
      setJobs(data.jobs || [])

      // Update pagination data
      const totalCount = data.pagination?.total || 0
      const totalPages = Math.ceil(totalCount / pagination.limit)
      setPagination(prev => ({
        ...prev,
        total: totalCount,
        offset: data.pagination?.offset || 0,
        hasMore: data.pagination?.hasMore || false,
        currentPage: page,
        totalPages: totalPages || 1
      }))
    } catch (error) {
      console.error('Error loading jobs:', error)
      addToast({
        title: 'Error',
        description: 'Failed to load jobs',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
      setIsSearching(false)
      hasLoadedOnce.current = true
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }))
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, currentPage: 1 })) // Reset to first page on filter change
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      handleFilterChange('search', value)
    }, 300)
  }

  const handleJobClick = async (job: Job) => {
    try {
      // Fetch job details with applications
      const response = await fetch(`/api/admin/job-posts/${job.id}/applications`)
      if (response.ok) {
        const jobWithApplications = await response.json()
        setSelectedJob(jobWithApplications)
      } else {
        // Fallback to basic job data if applications fetch fails
        setSelectedJob(job)
      }
    } catch (error) {
      console.error('Error fetching job applications:', error)
      // Fallback to basic job data
      setSelectedJob(job)
    }
    setIsDialogOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatPayRange = (min: number | null, max: number | null, text: string | null) => {
    if (text) return text
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`
    if (min) return `$${min.toLocaleString()}+`
    return 'Not specified'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-amber-100 text-amber-800'
      case 'pending_vetting': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'expired': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'reviewed': return 'bg-blue-100 text-blue-800'
      case 'interview': return 'bg-purple-100 text-purple-800'
      case 'hired': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getJobStatusColor = (jobStatus: string) => {
    switch (jobStatus) {
      case 'Active': return 'bg-green-100 text-green-800'
      case 'Paused': return 'bg-amber-100 text-amber-800'
      case 'Filled': return 'bg-purple-100 text-purple-800'
      case 'Expired': return 'bg-gray-100 text-gray-600'
      case 'Pending': return 'bg-yellow-100 text-yellow-800'
      case 'Rejected': return 'bg-red-100 text-red-800'
      case 'Draft': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handlePauseJobClick = (jobId: string) => {
    setJobToPause(jobId)
    setShowPauseDialog(true)
  }

  const confirmPauseJob = async () => {
    if (!jobToPause) return

    setIsProcessing(true)
    setShowPauseDialog(false)

    try {
      const response = await fetch(`/api/admin/jobs/${jobToPause}/pause`, {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to pause job')
      }

      addToast({
        title: 'Success',
        description: data.message || 'Job paused successfully',
        variant: 'default'
      })

      // Update job in local state instead of reloading entire list
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === jobToPause
            ? {
              ...job,
              isPaused: true,
              status: 'paused' as const,
              pausedAt: data.job.pausedAt,
              pausedDaysRemaining: data.job.pausedDaysRemaining
            }
            : job
        )
      )

      // Update selected job if open
      if (selectedJob?.id === jobToPause) {
        setSelectedJob(prev => prev ? {
          ...prev,
          isPaused: true,
          status: 'paused' as const,
          pausedAt: data.job.pausedAt,
          pausedDaysRemaining: data.job.pausedDaysRemaining
        } : null)
      }

      setIsDialogOpen(false)
    } catch (error) {
      console.error('Error pausing job:', error)
      addToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to pause job',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
      setJobToPause(null)
    }
  }

  const handleResumeJobClick = (jobId: string) => {
    setJobToResume(jobId)
    setShowResumeDialog(true)
  }

  const confirmResumeJob = async () => {
    if (!jobToResume) return

    setIsProcessing(true)
    setShowResumeDialog(false)

    try {
      const response = await fetch(`/api/admin/jobs/${jobToResume}/resume`, {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resume job')
      }

      addToast({
        title: 'Success',
        description: data.message || 'Job resumed successfully',
        variant: 'default'
      })

      // Update job in local state instead of reloading entire list
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === jobToResume
            ? {
              ...job,
              isPaused: false,
              status: 'approved' as const,
              resumedAt: data.job.resumedAt,
              expiresAt: data.job.expiresAt
            }
            : job
        )
      )

      // Update selected job if open
      if (selectedJob?.id === jobToResume) {
        setSelectedJob(prev => prev ? {
          ...prev,
          isPaused: false,
          status: 'approved' as const,
          resumedAt: data.job.resumedAt,
          expiresAt: data.job.expiresAt
        } : null)
      }

      setIsDialogOpen(false)
    } catch (error) {
      console.error('Error resuming job:', error)
      addToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to resume job',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
      setJobToResume(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header with Back Button */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Link href="/admin/job-posts">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to All Jobs
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Standard Job Posts</h1>
        <p className="text-gray-600">
          Manage standard job posts without premium features
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Briefcase className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Standard Jobs</p>
                {isSearching ? <Skeleton className="h-8 w-12 mt-1" /> : (
                  <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                {isSearching ? <Skeleton className="h-8 w-12 mt-1" /> : (
                  <p className="text-2xl font-bold text-gray-900">
                    {jobs.filter(job => job.status === 'approved').length}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                {isSearching ? <Skeleton className="h-8 w-12 mt-1" /> : (
                  <p className="text-2xl font-bold text-gray-900">
                    {jobs.filter(job => job.status === 'pending_vetting').length}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Eye className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                {isSearching ? <Skeleton className="h-8 w-12 mt-1" /> : (
                  <p className="text-2xl font-bold text-gray-900">
                    {jobs.reduce((total, job) => total + job.viewsCount, 0)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Job title or company..."
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="pending_vetting">Pending</SelectItem>
                  <SelectItem value="rejected">Declined</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="employerType">Employer Type</Label>
              <Select
                value={filters.employerType}
                onValueChange={(value) => handleFilterChange('employerType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All employers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employers</SelectItem>
                  <SelectItem value="vetted">Vetted</SelectItem>
                  <SelectItem value="not_vetted">Not vetted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
                  setFilters({ search: '', status: 'all', employerType: 'all' });
                  const searchInput = document.querySelector<HTMLInputElement>('input#search')
                  if (searchInput) searchInput.value = ''
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      {isSearching ? (
        <JobListSkeletons />
      ) : (
        <div className="space-y-4">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <Card
                key={job.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${job.isPaused || job.status === 'paused' ? 'bg-amber-50 border-amber-200' : ''
                  }`}
                onClick={() => handleJobClick(job)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start space-x-4 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <CompanyLogo
                          companyName={job.employer.companyName}
                          companyLogoUrl={job.employer.companyLogoUrl}
                          size="md"
                        />
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-start flex-wrap gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 max-w-md">
                            {job.title}
                          </h3>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status === 'pending_vetting' ? (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </>
                            ) : job.status === 'paused' ? (
                              <>
                                <Pause className="h-3 w-3 mr-1" />
                                Paused
                              </>
                            ) : job.status === 'approved' ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approved
                              </>
                            ) : job.status === 'rejected' ? (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Declined
                              </>
                            ) : (
                              job.status.charAt(0).toUpperCase() + job.status.slice(1)
                            )}
                          </Badge>
                          {(job.isPaused || job.status === 'paused') && job.pausedDaysRemaining && (
                            <Badge className="bg-amber-100 text-amber-800">
                              <Clock className="h-3 w-3 mr-1" />
                              {job.pausedDaysRemaining} {job.pausedDaysRemaining === 1 ? 'day' : 'days'} remaining
                            </Badge>
                          )}
                          {job.employer.isVetted && (
                            <Badge className="bg-purple-100 text-purple-800">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Vetted Employer
                            </Badge>
                          )}
                          {job.isCompanyPrivate && (
                            <Badge className="bg-blue-50 text-blue-600 border-blue-200">
                              <Shield className="h-3 w-3 mr-1" />
                              Private Company
                            </Badge>
                          )}
                          <Badge className="bg-blue-100 text-blue-800">
                            <Briefcase className="h-3 w-3 mr-1" />
                            Standard
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Building2 className="h-4 w-4" />
                            <span>{job.isCompanyPrivate ? 'Private Company' : job.employer.companyName}</span>
                          </div>
                          <div className="flex items-start space-x-1">
                            <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium text-gray-900">{job.employer.user.name}</span>
                              <span className="text-gray-500 truncate">{job.employer.user.email}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4" />
                            <span>{formatPayRange(job.payRangeMin, job.payRangeMax, job.payRangeText)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Posted {formatDate(job.createdAt)}</span>
                          </div>
                        </div>
                        {/* Expiration Date - Hide if paused */}
                        {!job.isPaused && job.expiresAt && (
                          <div className="flex items-center space-x-1 text-sm mt-2">
                            <Clock className="h-4 w-4 text-gray-600" />
                            <span className={new Date(job.expiresAt) < new Date() ? 'text-red-600 font-medium' : 'text-gray-600'}>
                              Expires {formatDate(job.expiresAt)}
                              {new Date(job.expiresAt) < new Date() && ' (Expired)'}
                            </span>
                          </div>
                        )}

                        {job.locationText && (
                          <div className="flex items-center space-x-1 text-sm text-gray-600 mt-1">
                            <MapPin className="h-4 w-4" />
                            <span>{job.locationText}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4 text-right">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-600">{job.viewsCount}</div>
                          <div className="text-xs text-gray-500">Views</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-600">{job._count.applications}</div>
                          <div className="text-xs text-gray-500">Applications</div>
                        </div>
                        <div className="text-center">
                          <Badge className={getJobStatusColor(job.jobStatus)}>
                            {job.jobStatus}
                          </Badge>
                          <div className="text-xs text-gray-500 mt-1">Status</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No standard jobs found</h3>
                <p className="text-gray-600">
                  {Object.values(filters).some(f => f && f !== 'all')
                    ? 'Try adjusting your filters to see more results.'
                    : 'No standard job posts have been created yet.'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <Button
          variant="outline"
          onClick={() => handlePageChange(pagination.currentPage - 1)}
          disabled={pagination.currentPage === 1}
        >
          Previous
        </Button>
        <span className="text-sm text-gray-600">
          Page {pagination.currentPage} of {pagination.totalPages}
        </span>
        <Button
          variant="outline"
          onClick={() => handlePageChange(pagination.currentPage + 1)}
          disabled={pagination.currentPage === pagination.totalPages}
        >
          Next
        </Button>
      </div>

      {/* Job Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Standard Job Post Details</DialogTitle>
            <DialogDescription>
              View detailed information about this standard job post
            </DialogDescription>
          </DialogHeader>

          {selectedJob && (
            <div className="space-y-6">
              {/* Job Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">{selectedJob.title}</h4>
                {process.env.NEXT_PUBLIC_SHOW_LEGACY_WP_LINKS === 'true' && selectedJob.legacyId && (
                  <div className="flex items-center justify-between px-3 py-2 mb-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-amber-700" />
                      <span className="text-sm text-amber-800">
                        Legacy WP Job #{selectedJob.legacyId}
                      </span>
                    </div>
                    <a
                      href={`https://archive.ampertalent.com/wp-admin/post.php?post=${selectedJob.legacyId}&action=edit&classic-editor&classic-editor__forget`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-amber-700 hover:text-amber-900 hover:underline"
                    >
                      View in WP
                    </a>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Company:</span> {selectedJob.isCompanyPrivate ? 'Private Company' : selectedJob.employer.companyName}
                  </div>
                  <div>
                    <span className="font-medium">Contact:</span> {selectedJob.employer.user.email}
                  </div>
                  <div>
                    <span className="font-medium">Pay Range:</span> {formatPayRange(selectedJob.payRangeMin, selectedJob.payRangeMax, selectedJob.payRangeText)}
                  </div>
                  <div>
                    <span className="font-medium">Job Type:</span> {getJobTypeLabel(selectedJob.type)}
                  </div>
                  <div>
                    <span className="font-medium">Location:</span> {selectedJob.locationText || 'Not specified'}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <Badge className={`ml-2 ${getStatusColor(selectedJob.status)}`}>
                      {selectedJob.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Job Status:</span>
                    <Badge className={`ml-2 ${getJobStatusColor(selectedJob.jobStatus)}`}>
                      {selectedJob.jobStatus}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Views:</span> {selectedJob.viewsCount}
                  </div>
                  <div>
                    <span className="font-medium">Applications:</span> {selectedJob._count.applications}
                  </div>
                </div>

                <div className="mt-4">
                  <span className="font-medium">Description:</span>
                  <div
                    className="text-gray-600 mt-1 prose prose-sm max-w-none break-all overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: selectedJob.description }}
                  />
                </div>

                {selectedJob.skillsRequired?.length > 0 && (
                  <div className="mt-4">
                    <span className="font-medium">Skills Required:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedJob.skillsRequired.map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pause/Resume Information */}
                {selectedJob.isPaused && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Pause className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-900">Job Paused</span>
                    </div>
                    <div className="text-sm text-amber-800 space-y-1">
                      {selectedJob.pausedAt && (
                        <div>
                          <span className="font-medium">Paused on:</span> {formatDate(selectedJob.pausedAt)}
                        </div>
                      )}
                      {selectedJob.pausedDaysRemaining && (
                        <div>
                          <span className="font-medium">Days remaining preserved:</span> {selectedJob.pausedDaysRemaining} {selectedJob.pausedDaysRemaining === 1 ? 'day' : 'days'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Applicants Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-4">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold">Applicants ({selectedJob._count.applications})</h4>
                </div>
                {process.env.NEXT_PUBLIC_SHOW_LEGACY_WP_LINKS === 'true' && selectedJob.legacyId && (
                  <div className="flex items-center justify-between px-3 py-2 mb-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-amber-700" />
                      <span className="text-sm text-amber-800">
                        Legacy WP Applications
                      </span>
                    </div>
                    <a
                      href={`https://archive.ampertalent.com/wp-admin/edit.php?s&post_status=all&post_type=job_application&_job_listing=${selectedJob.legacyId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-amber-700 hover:text-amber-900 hover:underline"
                    >
                      View in WP
                    </a>
                  </div>
                )}

                {selectedJob.applications && selectedJob.applications.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selectedJob.applications.map((application) => (
                      <div key={application.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <UserProfilePicture
                            userId={application.seeker.user.email}
                            userName={application.seeker.user.name}
                            profilePictureUrl={application.seeker.user.profilePictureUrl}
                            size="sm"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{application.seeker.user.name}</p>
                            <p className="text-sm text-gray-600">{application.seeker.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={getApplicationStatusColor(application.status)}>
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDate(application.appliedAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="font-medium">No applications yet</p>
                    <p className="text-sm">This job hasn't received any applications.</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                {selectedJob.status === 'approved' && !selectedJob.isPaused && (
                  <Button
                    variant="outline"
                    onClick={() => handlePauseJobClick(selectedJob.id)}
                    disabled={isProcessing}
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    {isProcessing ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause Job
                      </>
                    )}
                  </Button>
                )}

                {selectedJob.isPaused && selectedJob.status === 'paused' && (
                  <Button
                    variant="outline"
                    onClick={() => handleResumeJobClick(selectedJob.id)}
                    disabled={isProcessing}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    {isProcessing ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Resume Job
                      </>
                    )}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isProcessing}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pause Job Confirmation Dialog */}
      <AlertDialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <Pause className="h-5 w-5 text-amber-600" />
              <span>Pause Job?</span>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Are you sure you want to pause this job?</p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-900">
                      <p className="font-medium mb-1">This will:</p>
                      <ul className="list-disc list-inside space-y-1 text-amber-800">
                        <li>Make the job invisible to all job seekers</li>
                        <li>Preserve the remaining valid days</li>
                        <li>Allow you to resume it later</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  The job can be resumed at any time, and the remaining days will be restored.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPauseJob}
              disabled={isProcessing}
              className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-600"
            >
              {isProcessing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Pausing...
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Job
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resume Job Confirmation Dialog */}
      <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <Play className="h-5 w-5 text-green-600" />
              <span>Resume Job?</span>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Are you sure you want to resume this job?</p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-green-900">
                      <p className="font-medium mb-1">This will:</p>
                      <ul className="list-disc list-inside space-y-1 text-green-800">
                        <li>Make the job visible to job seekers again</li>
                        <li>Restore the preserved valid days</li>
                        <li>Update the expiration date accordingly</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Job seekers will be able to see and apply to this position immediately.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmResumeJob}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700 focus:ring-green-600"
            >
              {isProcessing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Resuming...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Resume Job
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}