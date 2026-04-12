'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useImpersonation } from '@/hooks/useImpersonation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import { getCategoryLabel } from '@/lib/job-constants'
import {
  Mail,
  CheckCircle,
  XCircle,
  Calendar,
  Building,
  DollarSign,
  Filter,
  Search,
  Play,
  AlertTriangle,
  Shield,
  Square,
  CheckSquare,
  Download,
  Copy,
  ExternalLink
} from 'lucide-react'
import { CompanyLogo } from '@/components/common/CompanyLogo'

interface EmailBlastRequest {
  id: string
  jobId: string
  employerId: string
  packageId: string
  status: 'not_started' | 'pending' | 'completed'
  adminNotes: string | null
  requestedAt: string
  startedAt: string | null
  completedAt: string | null
  emailSentAt: string | null
  expiresAt: string
  logoUrl: string | null
  content: string | null
  customLink: string | null
  useJobLink: boolean
  job: {
    id: string
    title: string
    category: string
    payRangeText: string | null
    locationText: string | null
    createdAt: string
    expiresAt: string | null
    isCompanyPrivate: boolean
  }
  employer: {
    companyName: string
    companyLogoUrl: string | null
    user: {
      name: string
      email: string
      profilePictureUrl: string | null
    }
  }
  package: {
    packageType: string
  }
}

// Helper function to truncate email addresses
const truncateEmail = (email: string, maxLength: number = 25) => {
  if (email.length <= maxLength) {
    return email;
  }

  const [localPart, domain] = email.split('@');

  // If domain is too long, truncate it
  if (domain.length > maxLength / 2) {
    const truncatedDomain = domain.slice(0, Math.floor(maxLength / 2) - 3) + '...';
    return `${localPart}@${truncatedDomain}`;
  }

  // If local part is too long, truncate it
  const availableLength = maxLength - domain.length - 1; // -1 for @ symbol
  if (localPart.length > availableLength) {
    const truncatedLocal = localPart.slice(0, availableLength - 3) + '...';
    return `${truncatedLocal}@${domain}`;
  }

  return email;
};

export default function AdminSoloEmailBlastsPage() {
  const { user } = useUser()
  const router = useRouter()
  const { startImpersonation } = useImpersonation()
  const [requests, setRequests] = useState<EmailBlastRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<EmailBlastRequest | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([])
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    expiring: 'all'
  })
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const { addToast } = useToast()

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search)
    }, 300) // 300ms delay

    return () => {
      clearTimeout(timer)
    }
  }, [filters.search])

  useEffect(() => {
    loadRequests()
  }, [debouncedSearch, filters.status, filters.expiring])

  const copyJobPostToClipboard = async (jobId: string, jobTitle: string) => {
    try {
      const jobUrl = `${window.location.origin}/jobs/${jobId}`
      await navigator.clipboard.writeText(jobUrl)
      addToast({
        title: 'Copied!',
        description: `Job post URL for "${jobTitle}" copied to clipboard`,
        variant: 'default'
      })
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      addToast({
        title: 'Error',
        description: 'Failed to copy job post URL',
        variant: 'destructive'
      })
    }
  }

  const downloadLogo = async (logoUrl: string, companyName: string, employerId: string) => {
    try {
      // Use the new download endpoint
      const response = await fetch(`/api/admin/company-logo/${employerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'download',
          logoUrl: logoUrl // Pass the specific logo URL (custom email blast logo or company profile logo)
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Get the blob from the response
      const blob = await response.blob()

      // Get filename from Content-Disposition header or create one
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_logo.png`

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      addToast({
        title: 'Downloaded!',
        description: `Logo for ${companyName} downloaded`,
        variant: 'default'
      })
    } catch (error) {
      console.error('Error downloading logo:', error)
      addToast({
        title: 'Error',
        description: `Failed to download logo: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      })
    }
  }

  const loadRequests = async () => {
    try {
      setIsLoading(true)

      const queryParams = new URLSearchParams()
      if (debouncedSearch) queryParams.append('search', debouncedSearch)
      if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status)
      if (filters.expiring && filters.expiring !== 'all') queryParams.append('expiring', filters.expiring)

      const response = await fetch(`/api/admin/solo-email-blasts?${queryParams}`)

      if (!response.ok) {
        throw new Error('Failed to fetch email blast requests')
      }

      const data = await response.json()
      setRequests(data.requests || [])
    } catch (error) {
      console.error('Error loading email blast requests:', error)
      addToast({
        title: 'Error',
        description: 'Failed to load email blast requests',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestClick = (request: EmailBlastRequest) => {
    setSelectedRequest(request)
    setAdminNotes(request.adminNotes || '')
    setIsDialogOpen(true)
  }

  const handleStatusUpdate = async (requestId: string, newStatus: 'not_started' | 'pending' | 'completed') => {
    try {
      setIsUpdating(true)

      const response = await fetch(`/api/admin/solo-email-blasts/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          adminNotes
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update request status')
      }

      // Refresh the requests list
      loadRequests()

      addToast({
        title: 'Success',
        description: `Request status updated to ${getStatusDisplayText(newStatus)}`,
        variant: 'default'
      })

      setIsDialogOpen(false)
      setSelectedRequest(null)

    } catch (error) {
      console.error('Error updating request status:', error)
      addToast({
        title: 'Error',
        description: 'Failed to update request status',
        variant: 'destructive'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleImpersonateEmployer = async (request: EmailBlastRequest) => {
    if (!user?.id) return

    setIsImpersonating(true)

    try {
      const result = await startImpersonation(user.id, {
        id: request.employerId, // Use the actual employer user ID
        clerkUserId: request.employerId,
        name: request.employer.user.name,
        email: request.employer.user.email,
        role: 'employer' as const,
        companyName: request.employer.companyName,
      })

      if (!result.success) {
        addToast({
          title: 'Error',
          description: result.error || 'Failed to start impersonation',
          variant: 'destructive'
        })
        return
      }

      addToast({
        title: 'Impersonation Started',
        description: `Now viewing as ${request.employer.companyName}`,
        variant: 'default'
      })

      setIsDialogOpen(false)
      setSelectedRequest(null)

      // Navigate to employer dashboard
      router.push('/employer/dashboard')
    } catch (error) {
      console.error('Impersonation error:', error)
      addToast({
        title: 'Error',
        description: 'Failed to start impersonation',
        variant: 'destructive'
      })
    } finally {
      setIsImpersonating(false)
    }
  }

  const handleSelectRequest = (requestId: string, checked: boolean) => {
    if (checked) {
      setSelectedRequestIds(prev => [...prev, requestId])
    } else {
      setSelectedRequestIds(prev => prev.filter(id => id !== requestId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRequestIds(requests.map(r => r.id))
    } else {
      setSelectedRequestIds([])
    }
  }

  const handleBulkStatusUpdate = async (newStatus: 'not_started' | 'pending' | 'completed') => {
    if (selectedRequestIds.length === 0) return

    try {
      setIsBulkUpdating(true)

      const promises = selectedRequestIds.map(requestId =>
        fetch(`/api/admin/solo-email-blasts/${requestId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: newStatus,
            adminNotes: `Bulk updated to ${getStatusDisplayText(newStatus)}`
          })
        })
      )

      const results = await Promise.all(promises)
      const failedCount = results.filter(r => !r.ok).length

      if (failedCount > 0) {
        addToast({
          title: 'Partial Success',
          description: `${selectedRequestIds.length - failedCount} requests updated, ${failedCount} failed`,
          variant: 'destructive'
        })
      } else {
        addToast({
          title: 'Success',
          description: `${selectedRequestIds.length} requests updated to ${getStatusDisplayText(newStatus)}`,
          variant: 'default'
        })
      }

      // Refresh the requests list and clear selection
      loadRequests()
      setSelectedRequestIds([])

    } catch (error) {
      console.error('Error bulk updating requests:', error)
      addToast({
        title: 'Error',
        description: 'Failed to bulk update requests',
        variant: 'destructive'
      })
    } finally {
      setIsBulkUpdating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string, hasContent?: boolean) => {
    // If status is not_started but no content, show as missing content
    if (status === 'not_started' && !hasContent) {
      return 'bg-red-100 text-red-800'
    }

    switch (status) {
      case 'not_started':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string, hasContent?: boolean) => {
    // If status is not_started but no content, show as missing content
    if (status === 'not_started' && !hasContent) {
      return <AlertTriangle className="h-3 w-3 mr-1" />
    }

    switch (status) {
      case 'not_started':
        return <Mail className="h-3 w-3 mr-1" />
      case 'pending':
        return <Play className="h-3 w-3 mr-1" />
      case 'completed':
        return <CheckCircle className="h-3 w-3 mr-1" />
      default:
        return <Mail className="h-3 w-3 mr-1" />
    }
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  const getStatusDisplayText = (status: string, hasContent?: boolean) => {
    // If status is not_started but no content, show as missing content
    if (status === 'not_started' && !hasContent) {
      return 'MISSING CONTENT'
    }

    switch (status) {
      case 'not_started':
        return 'QUEUED'
      case 'pending':
        return 'IN PROGRESS'
      case 'completed':
        return 'SENT'
      default:
        return status.replace('_', ' ').toUpperCase()
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Solo Email Blast Management</h1>
        <p className="text-gray-600">
          Manage solo email blast requests and track their status
        </p>

        {/* Status Guide */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-3">📋 Status Guide for Admins</h3>
          <div className="grid md:grid-cols-4 gap-4 text-sm">
            <div className="bg-white p-3 rounded border">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="font-medium text-red-800">MISSING CONTENT</span>
              </div>
              <p className="text-gray-700 text-xs">
                <strong>Waiting for employer.</strong> Email blast request created but employer hasn't provided content, logo, or link details yet.
                <span className="text-blue-600">Employer needs to complete form.</span>
              </p>
            </div>

            <div className="bg-white p-3 rounded border">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="font-medium text-blue-800">QUEUED</span>
              </div>
              <p className="text-gray-700 text-xs">
                <strong>Ready to process.</strong> Employer has provided all required details (logo, content, link).
                <span className="text-blue-600">Employer can still edit content.</span>
              </p>
            </div>

            <div className="bg-white p-3 rounded border">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span className="font-medium text-yellow-800">IN PROGRESS</span>
              </div>
              <p className="text-gray-700 text-xs">
                <strong>Currently being processed.</strong> Admin has started working on this request.
                <span className="text-red-600">Employer cannot edit content anymore.</span>
              </p>
            </div>

            <div className="bg-white p-3 rounded border">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="font-medium text-green-800">SENT</span>
              </div>
              <p className="text-gray-700 text-xs">
                <strong>Email has been sent.</strong> Email blast completed and delivered to candidate database.
                <span className="text-red-600">Employer cannot edit content anymore.</span>
              </p>
            </div>
          </div>

          <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
            <strong>⚠️ Important:</strong> Once you mark a request as "IN PROGRESS", employers will no longer be able to edit their email blast content, logo, or link.
          </div>
        </div>
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
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value: string) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="not_started">Queued</SelectItem>
                  <SelectItem value="pending">In Progress</SelectItem>
                  <SelectItem value="completed">Sent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="expiring">Status Filter</Label>
              <Select
                value={filters.expiring}
                onValueChange={(value: string) => setFilters(prev => ({ ...prev, expiring: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All requests" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All requests</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({ search: '', status: 'all', expiring: 'all' });
                  setDebouncedSearch('');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedRequestIds.length > 0 && (
        <Card className="mb-4 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="font-medium text-blue-900">
                  {selectedRequestIds.length} request{selectedRequestIds.length !== 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRequestIds([])}
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  onClick={() => handleBulkStatusUpdate('pending')}
                  disabled={isBulkUpdating}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Start Processing
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleBulkStatusUpdate('completed')}
                  disabled={isBulkUpdating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark as Sent
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length > 0 && (
          <div className="flex items-center space-x-2 mb-4 p-3 bg-gray-50 rounded-lg">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleSelectAll(selectedRequestIds.length !== requests.length)
              }}
              className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900"
            >
              {selectedRequestIds.length === requests.length ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              <span>Select All ({requests.length})</span>
            </button>
          </div>
        )}
        {requests.length > 0 ? (
          requests.map((request) => {
            const expired = isExpired(request.expiresAt)

            return (
              <Card
                key={request.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${expired ? 'border-red-200 bg-red-50' : ''
                  } ${selectedRequestIds.includes(request.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                onClick={() => handleRequestClick(request)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0 pt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectRequest(request.id, !selectedRequestIds.includes(request.id))
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {selectedRequestIds.includes(request.id) ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      <div className="flex-shrink-0">
                        <CompanyLogo
                          companyName={request.employer.companyName}
                          companyLogoUrl={request.employer.companyLogoUrl}
                          size="md"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {request.job.title}
                          </h3>
                          <Badge className={getStatusColor(request.status, !!(request.content && request.content.trim()))}>
                            {getStatusIcon(request.status, !!(request.content && request.content.trim()))}
                            {getStatusDisplayText(request.status, !!(request.content && request.content.trim()))}
                          </Badge>
                          {expired && (
                            <Badge className="bg-red-100 text-red-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Expired
                            </Badge>
                          )}
                          {request.job.isCompanyPrivate && (
                            <Badge className="bg-orange-100 text-orange-800">
                              <Shield className="h-3 w-3 mr-1" />
                              Private
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Building className="h-4 w-4" />
                            <span>{request.job.isCompanyPrivate ? 'Private Company' : request.employer.companyName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Requested {formatDate(request.requestedAt)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4" />
                            <span>{request.job.payRangeText || 'Not specified'}</span>
                          </div>
                        </div>
                        {request.job.locationText && (
                          <div className="text-sm text-gray-600 mt-1">
                            📍 {request.job.locationText}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4 text-right">
                      <div className="text-sm text-gray-500 mt-1">
                        Package: {request.package.packageType}
                      </div>
                      {expired && (
                        <div className="text-sm font-medium text-red-600 mt-1">
                          Expired
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No email blast requests found</h3>
              <p className="text-gray-600">
                {Object.values(filters).some(f => f && f !== 'all')
                  ? 'Try adjusting your filters to see more results.'
                  : 'No email blast requests have been submitted yet.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Request Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Solo Email Blast Request Details</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyJobPostToClipboard(selectedRequest?.jobId || '', selectedRequest?.job.title || '')}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Job URL
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/jobs/${selectedRequest?.jobId}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Job
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>
              Manage the email blast request status and notes
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Job Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3">{selectedRequest.job.title}</h4>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div>
                      <span className="font-medium">Company:</span> {selectedRequest.job.isCompanyPrivate ? 'Private Company' : selectedRequest.employer.companyName}
                    </div>
                    <div>
                      <span className="font-medium">Contact:</span> {selectedRequest.employer.user.name}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span>{' '}
                      <span title={selectedRequest.employer.user.email}>
                        {truncateEmail(selectedRequest.employer.user.email, 30)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Category:</span> {getCategoryLabel(selectedRequest.job.category)}
                    </div>
                    <div>
                      <span className="font-medium">Pay Range:</span> {selectedRequest.job.payRangeText || 'Not specified'}
                    </div>
                    <div>
                      <span className="font-medium">Location:</span> {selectedRequest.job.locationText || 'Not specified'}
                    </div>
                  </div>
                </div>

                {/* Email Blast Details */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 text-blue-900">Email Blast Details</h4>
                  {selectedRequest.content ? (
                    <div className="space-y-4">
                      {/* Logo */}
                      <div>
                        <span className="font-medium text-blue-800">Logo:</span>
                        <div className="mt-2">
                          {selectedRequest.employer.companyLogoUrl ? (
                            <div className="flex items-center space-x-3">
                              <CompanyLogo
                                companyName={selectedRequest.employer.companyName}
                                companyLogoUrl={selectedRequest.employer.companyLogoUrl}
                                size="md"
                              />
                              <div className="flex flex-col space-y-1">
                                <span className="text-sm text-blue-700">
                                  {selectedRequest.logoUrl ? 'Custom logo uploaded (using company profile for display)' : 'Using company profile logo'}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadLogo(
                                    selectedRequest.logoUrl || selectedRequest.employer.companyLogoUrl || '',
                                    selectedRequest.employer.companyName,
                                    selectedRequest.employerId
                                  )}
                                  className="w-fit"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-600">No logo provided</span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div>
                        <span className="font-medium text-blue-800">Content:</span>
                        <div className="mt-1 p-3 bg-white rounded border text-sm max-h-32 overflow-y-auto">
                          {selectedRequest.content}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          {selectedRequest.content.trim().split(/\s+/).length} words
                        </div>
                      </div>

                      {/* Link */}
                      <div>
                        <span className="font-medium text-blue-800">Link:</span>
                        <div className="mt-1">
                          {selectedRequest.useJobLink ? (
                            <div className="text-sm text-blue-700">
                              Using HMM job post link: <code className="bg-white px-1 rounded">/jobs/{selectedRequest.jobId}</code>
                            </div>
                          ) : selectedRequest.customLink ? (
                            <div className="text-sm text-blue-700">
                              Custom link: <a href={selectedRequest.customLink} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800">{selectedRequest.customLink}</a>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-600">No link specified</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-yellow-600 font-medium">⚠️ Email content not provided yet</div>
                      <div className="text-sm text-yellow-700 mt-1">
                        Employer needs to complete email blast details before this can be processed
                      </div>
                    </div>
                  )}
                </div>

                {/* Admin Notes */}
                <div>
                  <Label htmlFor="adminNotes">Admin Notes</Label>
                  <Textarea
                    id="adminNotes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this request..."
                    rows={4}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Expiration Warning */}
                {isExpired(selectedRequest.expiresAt) && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 text-red-800">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">This request has expired</span>
                    </div>
                    <p className="text-red-700 text-sm mt-1">
                      Expired on {formatDate(selectedRequest.expiresAt)}
                    </p>
                  </div>
                )}

                {/* Request Status & Actions */}
                <div>
                  <h4 className="font-semibold mb-3">Request Status & Actions</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <span className="font-medium">Current Status:</span>
                        <Badge className={`ml-2 ${getStatusColor(selectedRequest.status, !!(selectedRequest.content && selectedRequest.content.trim()))}`}>
                          {getStatusIcon(selectedRequest.status, !!(selectedRequest.content && selectedRequest.content.trim()))}
                          {getStatusDisplayText(selectedRequest.status, !!(selectedRequest.content && selectedRequest.content.trim()))}
                        </Badge>
                      </div>
                    </div>

                    {/* Status Change Actions - Always Visible */}
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <h5 className="font-medium mb-3 text-blue-900">🔄 Change Status:</h5>

                      {!isExpired(selectedRequest.expiresAt) ? (
                        <div className="space-y-3">
                          {/* Show available actions based on current status */}
                          <div className="flex flex-wrap gap-2">
                            {selectedRequest.status === 'not_started' && (
                              <Button
                                onClick={() => handleStatusUpdate(selectedRequest.id, 'pending')}
                                disabled={isUpdating}
                                className="bg-yellow-600 hover:bg-yellow-700"
                              >
                                <Play className="h-4 w-4 mr-2" />
                                {isUpdating ? 'Updating...' : 'Start Processing'}
                              </Button>
                            )}

                            {selectedRequest.status === 'pending' && (
                              <Button
                                onClick={() => handleStatusUpdate(selectedRequest.id, 'completed')}
                                disabled={isUpdating}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {isUpdating ? 'Updating...' : 'Mark as Sent'}
                              </Button>
                            )}

                            {selectedRequest.status === 'completed' && (
                              <div className="flex items-center text-green-700 font-medium">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Email blast completed and sent
                              </div>
                            )}
                          </div>

                          {/* Status progression guide */}
                          <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                            <strong>Status Flow:</strong> QUEUED → IN PROGRESS → SENT
                          </div>

                          {/* Warning for IN PROGRESS status */}
                          {selectedRequest.status === 'not_started' && (
                            <div className="p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                              <strong>⚠️ Note:</strong> Once you start processing, employers will no longer be able to edit their email blast details.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-red-700 font-medium flex items-center">
                          <XCircle className="h-4 w-4 mr-2" />
                          Request has expired - no status changes allowed
                        </div>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                      <div><strong>Requested:</strong> {formatDate(selectedRequest.requestedAt)}</div>
                      {selectedRequest.startedAt && (
                        <div><strong>Started:</strong> {formatDate(selectedRequest.startedAt)}</div>
                      )}
                      {selectedRequest.completedAt && (
                        <div><strong>Completed:</strong> {formatDate(selectedRequest.completedAt)}</div>
                      )}
                      {selectedRequest.emailSentAt && (
                        <div><strong>Email Sent:</strong> {formatDate(selectedRequest.emailSentAt)}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Other Actions */}
                <div>
                  <h5 className="font-medium mb-3 text-gray-900">Other Actions:</h5>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleImpersonateEmployer(selectedRequest)}
                      disabled={isImpersonating}
                      className="border-purple-200 text-purple-700 hover:bg-purple-50"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      {isImpersonating ? 'Starting...' : 'Impersonate Employer'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}