'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { JobVettingCard } from '@/components/admin/JobVettingCard'
import { useToast } from '@/components/ui/toast'
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle,
  Clock,
} from '@/components/icons'

interface JobVettingData {
  id: string
  title: string
  companyName: string
  companyLogoUrl?: string
  companyWebsite?: string
  location: string
  jobType: string
  experienceLevel: string
  salaryMin: number
  salaryMax: number
  salaryType: string
  description: string
  requirements: string
  benefits?: string
  skills: string[]
  submittedAt: string
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'
  employerEmail: string
  applicationDeadline?: string
  flaggedReasons?: string[]
  adminNotes?: string
  employerId: string
  isCompanyPrivate: boolean
  packageInfo?: {
    packageType: string
    listingsRemaining: number
    expiresAt: string | null
  }
}

export default function AdminJobsPage() {
  const searchParams = useSearchParams()
  const targetJobId = searchParams.get('jobId')
  const [jobs, setJobs] = useState<JobVettingData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { addToast } = useToast()
  const targetJobRef = useRef<HTMLDivElement>(null)
  const hasScrolledToTarget = useRef(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadJobs()
  }, [])

  // Scroll to target job when jobs are loaded and targetJobId is present
  useEffect(() => {
    if (targetJobId && jobs.length > 0 && !hasScrolledToTarget.current) {
      // Small delay to ensure the DOM is updated
      const timer = setTimeout(() => {
        if (targetJobRef.current) {
          targetJobRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
          hasScrolledToTarget.current = true
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [targetJobId, jobs])

  const loadJobs = async () => {
    try {
      console.log('Loading jobs for vetting...')

      // Fetch real jobs data from API
      const response = await fetch('/api/admin/jobs/vetting')

      if (!response.ok) {
        throw new Error('Failed to fetch jobs')
      }

      const text = await response.text()
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        // Session expired, redirect to sign-in
        window.location.href = '/sign-in'
        return
      }
      const data = JSON.parse(text)
      setJobs(data.jobs)
    } catch (error) {
      console.error('Error loading jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadJobs()
    setIsRefreshing(false)
  }

  const handleStatusChange = async (jobId: string, newStatus: string, notes?: string, isManualApproval?: boolean) => {
    try {
      console.log(`Changing job ${jobId} status to ${newStatus}`, { notes, isManualApproval })

      // Update job status via API
      const response = await fetch('/api/admin/jobs/vetting', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          status: newStatus,
          adminNotes: notes,
          isManualApproval
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update job status')
      }

      // Update local state
      setJobs(prev => prev.map(job =>
        job.id === jobId
          ? { ...job, status: newStatus as 'pending' | 'reviewing' | 'approved' | 'rejected', adminNotes: notes || job.adminNotes }
          : job
      ))

      addToast({
        title: "Job Status Updated",
        description: `Job status updated to ${newStatus === 'rejected' ? 'Declined' : newStatus}`,
        variant: "success"
      })
    } catch (error) {
      console.error('Error updating job status:', error)
      addToast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive"
      })
    }
  }

  // Convert jobs data to CSV format
  const convertToCSV = (jobs: JobVettingData[]): string => {
    // Define CSV header
    const headers = [
      'ID',
      'Title',
      'Company Name',
      'Location',
      'Job Type',
      'Experience Level',
      'Salary Min',
      'Salary Max',
      'Salary Type',
      'Status',
      'Submitted At',
      'Employer Email',
      'Application Deadline',
      'Skills',
      'Description',
      'Requirements',
      'Benefits'
    ]

    // Create CSV content
    const csvContent = [
      headers.join(','), // Header row
      ...jobs.map(job => [
        `"${job.id || ''}"`,
        `"${job.title.replace(/"/g, '""') || ''}"`,
        `"${job.companyName.replace(/"/g, '""') || ''}"`,
        `"${job.location.replace(/"/g, '""') || ''}"`,
        `"${job.jobType.replace(/"/g, '""') || ''}"`,
        `"${job.experienceLevel.replace(/"/g, '""') || ''}"`,
        `"${job.salaryMin || ''}"`,
        `"${job.salaryMax || ''}"`,
        `"${job.salaryType.replace(/"/g, '""') || ''}"`,
        `"${job.status || ''}"`,
        `"${job.submittedAt || ''}"`,
        `"${job.employerEmail.replace(/"/g, '""') || ''}"`,
        `"${job.applicationDeadline?.replace(/"/g, '""') || ''}"`,
        `"${job.skills?.join('; ').replace(/"/g, '""') || ''}"`,
        `"${job.description.replace(/"/g, '""') || ''}"`,
        `"${job.requirements.replace(/"/g, '""') || ''}"`,
        `"${(job.benefits || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n')

    return csvContent
  }

  // Download CSV file
  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Handle export button click
  const handleExport = () => {
    try {
      const csvContent = convertToCSV(filteredJobs)
      const filename = `job_vetting_data_${new Date().toISOString().slice(0, 10)}.csv`
      downloadCSV(csvContent, filename)

      addToast({
        title: "Export Successful",
        description: `Exported ${filteredJobs.length} jobs to CSV`,
        variant: "success"
      })
    } catch (error) {
      console.error('Error exporting jobs:', error)
      addToast({
        title: "Export Failed",
        description: "Failed to export jobs to CSV",
        variant: "destructive"
      })
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      setSearchTerm(value)
    }, 300)
  }

  const filteredJobs = useMemo(() => jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter
    return matchesSearch && matchesStatus
  }), [jobs, searchTerm, statusFilter])

  const jobStats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    reviewing: jobs.filter(j => j.status === 'reviewing').length,
    approved: jobs.filter(j => j.status === 'approved').length,
    rejected: jobs.filter(j => j.status === 'rejected').length,
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Company & Job Vetting</h1>
          <p className="text-gray-600">
            Review companies and approve job postings to maintain platform quality. Company vetting is required only once per employer.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{jobStats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{jobStats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{jobStats.reviewing}</div>
            <div className="text-sm text-gray-600">Reviewing</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{jobStats.approved}</div>
            <div className="text-sm text-gray-600">Approved</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{jobStats.rejected}</div>
            <div className="text-sm text-gray-600">Declined</div>
          </CardContent>
        </Card>

      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by job title, company, or location..."
                  onChange={handleSearchChange}
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
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Priority Queue */}
      {jobStats.pending > 0 && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-yellow-800">
              <Clock className="h-5 w-5" />
              <span>Company Vetting Queue</span>
            </CardTitle>
            <CardDescription>
              {jobStats.pending} companies/jobs waiting for initial vetting and review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setStatusFilter('pending')}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Review Pending Companies
              </Button>
              <div className="text-sm text-yellow-700">
                Average review time: 2-4 hours • Company vetting required once per employer
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jobs List */}
      <div className="space-y-6">
        {filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No companies found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'All companies have been vetted'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredJobs.map((job) => (
            <div 
              key={job.id} 
              ref={job.id === targetJobId ? targetJobRef : undefined}
            >
              <JobVettingCard
                job={job}
                onStatusChange={handleStatusChange}
                onFlag={() => Promise.resolve()}
                initialExpanded={job.id === targetJobId}
              />
            </div>
          ))
        )}
      </div>

      {/* Pagination would go here */}
      {filteredJobs.length > 0 && (
        <div className="mt-8 flex justify-center">
          <p className="text-sm text-gray-600">
            Showing {filteredJobs.length} of {jobs.length} companies/jobs
          </p>
        </div>
      )}
    </div>
  )
}
